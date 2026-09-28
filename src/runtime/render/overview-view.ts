import type { Deck, Position } from '../deck/model.js';
import { loadSlideContent } from '../deck/markdown.js';
import { scopeSlideStyles } from './scope-slide-styles.js';
import type { ThemeController } from '../theme/theme.js';

function cellSelector(position: Position): string {
  return `.sw-overview-cell[data-lane-id="${CSS.escape(position.laneId)}"][data-slide-index="${position.slideIndex}"]`;
}

/**
 * Renders the zoomed-out overview grid: one horizontal row per lane, and one
 * live-content thumbnail per slide. It's a dumb renderer that main.ts drives
 * with explicit calls, same as SlideRenderer and PresenterView. There are no
 * unit tests for it. It's DOM-rendering glue, so like the other render/*
 * classes we check it by hand.
 */
export class OverviewView {
  private readonly rootEl: HTMLElement;
  private readonly deck: Deck;
  private readonly theme: ThemeController;
  private readonly onCellClick: (position: Position) => void;
  private built = false;

  constructor(rootEl: HTMLElement, deck: Deck, theme: ThemeController, onCellClick: (position: Position) => void) {
    this.rootEl = rootEl;
    this.rootEl.id = 'sw-overview';
    this.rootEl.hidden = true;
    this.deck = deck;
    this.theme = theme;
    this.onCellClick = onCellClick;

    // The overlay isn't a .sw-slide, so it can't pick up per-slide theming.
    // Instead we tag its own root and keep that in sync with the deck's live
    // default theme (see #sw-overview[data-sw-theme] in themes/*.css).
    this.rootEl.dataset.swTheme = theme.currentDefaultTheme;
    theme.onChange((current) => {
      this.rootEl.dataset.swTheme = current;
    });

    this.rootEl.addEventListener('click', (event) => {
      const cell = (event.target as HTMLElement).closest<HTMLElement>('.sw-overview-cell');
      if (!cell) return;
      const laneId = cell.dataset.laneId;
      const slideIndex = Number(cell.dataset.slideIndex);
      if (laneId === undefined || Number.isNaN(slideIndex)) return;
      this.onCellClick({ laneId, slideIndex });
    });
  }

  /** Builds the grid the first time it's called (lazily, so nothing is fetched if the overview never opens). After that it just un-hides it and re-applies the selection highlight. */
  async show(selection: Position): Promise<void> {
    if (!this.built) {
      await this.build();
      this.built = true;
    }
    this.rootEl.hidden = false;
    this.setSelection(selection);
  }

  hide(): void {
    this.rootEl.hidden = true;
  }

  private setSelection(selection: Position): void {
    const previous = this.rootEl.querySelector('.sw-overview-cell[aria-selected="true"]');
    previous?.removeAttribute('aria-selected');
    const next = this.rootEl.querySelector<HTMLElement>(cellSelector(selection));
    next?.setAttribute('aria-selected', 'true');
    next?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  private async build(): Promise<void> {
    const loads: Array<Promise<void>> = [];

    for (const lane of this.deck.lanes) {
      const laneEl = document.createElement('div');
      laneEl.className = 'sw-overview-lane';
      laneEl.dataset.laneId = lane.id;

      const labelEl = document.createElement('div');
      labelEl.className = 'sw-overview-lane-label';
      labelEl.textContent = lane.label;
      laneEl.appendChild(labelEl);

      const rowEl = document.createElement('div');
      rowEl.className = 'sw-overview-row';
      laneEl.appendChild(rowEl);

      lane.slides.forEach((slide, slideIndex) => {
        const cellEl = document.createElement('button');
        cellEl.type = 'button';
        cellEl.className = 'sw-overview-cell';
        cellEl.dataset.laneId = lane.id;
        cellEl.dataset.slideIndex = String(slideIndex);

        const thumbEl = document.createElement('div');
        thumbEl.className = 'sw-overview-thumb';

        const contentEl = document.createElement('div');
        contentEl.className = 'sw-slide';
        contentEl.dataset.swTheme = this.theme.resolveTheme(slide);
        contentEl.dataset.slideId = slide.id;

        thumbEl.appendChild(contentEl);
        cellEl.appendChild(thumbEl);
        rowEl.appendChild(cellEl);

        loads.push(
          loadSlideContent(slide.src)
            .then((content) => {
              contentEl.innerHTML = content.html;
              scopeSlideStyles(contentEl);
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : String(error);
              contentEl.innerHTML = `<div class="sw-error">Couldn't load this slide: ${message}</div>`;
            }),
        );
      });

      this.rootEl.appendChild(laneEl);
    }

    await Promise.all(loads);
  }
}
