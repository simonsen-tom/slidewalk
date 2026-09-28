import type { Deck, Position } from '../deck/model.js';
import { findLane } from '../deck/model.js';
import { SlideRenderer } from './slide-renderer.js';

/**
 * Renders the presenter-mode panel: speaker notes, an elapsed timer that
 * starts the first time you open it, a next-slide preview, and a lane/index
 * readout. It's purely local UI and never touches PresenterSync.
 */
export class PresenterView {
  private readonly notesEl: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly readoutEl: HTMLElement;
  private readonly previewStageEl: HTMLElement;
  private readonly previewRenderer: SlideRenderer;

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private startTimeMs: number | null = null;

  constructor(panelEl: HTMLElement) {
    panelEl.innerHTML = `
      <div class="sw-presenter-readout" data-sw-readout></div>
      <div class="sw-presenter-timer" data-sw-timer>00:00</div>
      <div class="sw-presenter-notes" data-sw-notes></div>
      <div class="sw-presenter-preview" data-sw-preview></div>
    `;
    this.readoutEl = panelEl.querySelector<HTMLElement>('[data-sw-readout]')!;
    this.timerEl = panelEl.querySelector<HTMLElement>('[data-sw-timer]')!;
    this.notesEl = panelEl.querySelector<HTMLElement>('[data-sw-notes]')!;
    this.previewStageEl = panelEl.querySelector<HTMLElement>('[data-sw-preview]')!;
    this.previewRenderer = new SlideRenderer(this.previewStageEl);
  }

  startTimerIfNeeded(): void {
    if (this.timerHandle) return;
    this.startTimeMs = Date.now();
    this.tick();
    this.timerHandle = setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    if (this.startTimeMs === null) return;
    const elapsedSec = Math.floor((Date.now() - this.startTimeMs) / 1000);
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const ss = String(elapsedSec % 60).padStart(2, '0');
    this.timerEl.textContent = `${mm}:${ss}`;
  }

  async update(deck: Deck, position: Position, notesHtml: string | null): Promise<void> {
    this.notesEl.innerHTML = notesHtml ?? '<em>No notes for this slide.</em>';

    const lane = findLane(deck, position.laneId);
    if (!lane) return;

    this.readoutEl.textContent = `${lane.label} · ${position.slideIndex + 1} of ${lane.slides.length}`;

    const nextSlide = lane.slides[position.slideIndex + 1];
    if (nextSlide) {
      await this.previewRenderer.renderSlide(nextSlide, nextSlide.theme ?? deck.defaultTheme);
    } else {
      this.previewRenderer.clear();
      this.previewStageEl.innerHTML = '<em>End of lane.</em>';
    }
  }
}
