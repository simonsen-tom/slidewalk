import type { Deck, Direction, Position } from '../deck/model.js';
import { findLane } from '../deck/model.js';

export type NavSource = 'user' | 'remote' | 'init';

export interface NavChangeEvent {
  source: NavSource;
  /** Which way the transition should animate in from, or null if the position didn't change. */
  direction: Direction | null;
}

/**
 * Works out the transition direction purely from the before and after
 * positions. That keeps it consistent whether the change came from local
 * input, another synced window, or the initial handshake. It also means no
 * direction ever has to travel over BroadcastChannel.
 */
export function computeDirection(deck: Deck, from: Position, to: Position): Direction | null {
  if (from.laneId === to.laneId) {
    if (to.slideIndex > from.slideIndex) return 'right';
    if (to.slideIndex < from.slideIndex) return 'left';
    return null;
  }
  const fromLaneIndex = deck.lanes.findIndex((lane) => lane.id === from.laneId);
  const toLaneIndex = deck.lanes.findIndex((lane) => lane.id === to.laneId);
  if (fromLaneIndex === -1 || toLaneIndex === -1 || fromLaneIndex === toLaneIndex) return null;
  return toLaneIndex > fromLaneIndex ? 'down' : 'up';
}

export type NavListener = (position: Position, event: NavChangeEvent) => void;

export type NavAction = 'next' | 'prev' | 'laneUp' | 'laneDown';

/**
 * Pure "where do we land?" calculation for a single navigation action.
 * NavigationController and the overview grid's selection cursor (see
 * state/overview-state.ts) both use it, so they move through the grid the
 * exact same way. If you're already at that edge, you get `position` back
 * unchanged. Switching lanes
 * (laneUp/laneDown) always lands on the target lane's first slide.
 */
export function stepPosition(deck: Deck, position: Position, action: NavAction): Position {
  const lane = findLane(deck, position.laneId);
  if (!lane) return position;

  if (action === 'next' || action === 'prev') {
    const delta = action === 'next' ? 1 : -1;
    const slideIndex = clamp(position.slideIndex + delta, 0, lane.slides.length - 1);
    return { laneId: lane.id, slideIndex };
  }

  const laneIndex = deck.lanes.findIndex((l) => l.id === lane.id);
  if (laneIndex === -1) return position;
  const delta = action === 'laneDown' ? 1 : -1;
  const targetLane = deck.lanes[laneIndex + delta];
  if (!targetLane) return position;
  return { laneId: targetLane.id, slideIndex: 0 };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export class NavigationController {
  private readonly deck: Deck;
  private position: Position;
  private readonly listeners = new Set<NavListener>();

  constructor(deck: Deck, initial: Position) {
    this.deck = deck;
    this.position = clampPosition(deck, initial);
  }

  get state(): Position {
    return this.position;
  }

  onChange(listener: NavListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  goTo(position: Position, source: NavSource = 'user'): void {
    const from = this.position;
    const clamped = clampPosition(this.deck, position);
    const direction = computeDirection(this.deck, from, clamped);
    this.position = clamped;
    for (const listener of this.listeners) {
      listener(clamped, { source, direction });
    }
  }

  next(): void {
    this.applyStep('next');
  }

  prev(): void {
    this.applyStep('prev');
  }

  laneUp(): void {
    this.applyStep('laneUp');
  }

  laneDown(): void {
    this.applyStep('laneDown');
  }

  private applyStep(action: NavAction): void {
    const target = stepPosition(this.deck, this.position, action);
    if (target.laneId === this.position.laneId && target.slideIndex === this.position.slideIndex) return;
    this.goTo(target);
  }
}

function clampPosition(deck: Deck, position: Position): Position {
  const lane = findLane(deck, position.laneId) ?? deck.lanes[0];
  const slideIndex = Math.min(Math.max(position.slideIndex, 0), lane.slides.length - 1);
  return { laneId: lane.id, slideIndex };
}
