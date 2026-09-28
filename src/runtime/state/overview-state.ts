import type { Deck, Position } from '../deck/model.js';
import { stepPosition, type NavAction } from './navigation.js';

export interface OverviewSnapshot {
  open: boolean;
  selection: Position;
}

export type OverviewListener = (snapshot: OverviewSnapshot) => void;

/**
 * Local, per-window state for the zoomed-out overview grid. Like
 * PresenterState, it never touches PresenterSync or BroadcastChannel. The
 * selection moves through the grid with the same shared stepPosition as real
 * navigation, so it always stops at the edges the same way.
 */
export class OverviewState {
  private readonly deck: Deck;
  private open = false;
  private selection: Position;
  private readonly listeners = new Set<OverviewListener>();

  constructor(deck: Deck, initialSelection: Position) {
    this.deck = deck;
    this.selection = initialSelection;
  }

  get isOpen(): boolean {
    return this.open;
  }

  get currentSelection(): Position {
    return this.selection;
  }

  /** Opens the grid (starting the selection at currentNavPosition) or closes it. */
  toggle(currentNavPosition: Position): void {
    this.open = !this.open;
    if (this.open) {
      this.selection = currentNavPosition;
    }
    this.emit();
  }

  /** Closes without changing the selection. Does nothing if it's already closed. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.emit();
  }

  select(action: NavAction): void {
    if (!this.open) return;
    this.selection = stepPosition(this.deck, this.selection, action);
    this.emit();
  }

  onChange(listener: OverviewListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot: OverviewSnapshot = { open: this.open, selection: this.selection };
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
