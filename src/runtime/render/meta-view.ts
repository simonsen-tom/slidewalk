import type { Deck } from '../deck/model.js';
import { findMetaSlide } from '../deck/model.js';
import type { ThemeController } from '../theme/theme.js';
import { SlideRenderer } from './slide-renderer.js';

/**
 * Renders the meta-slide overlay: a single full-screen slide that pops up
 * and goes away on demand. main.ts drives it with explicit calls, the same
 * "dumb renderer" setup as OverviewView. The actual mounting is handed off
 * to a SlideRenderer pointed at this view's root element, so we get
 * markdown loading, flair reveal, the background tapestry and per-slide
 * themes for free.
 */
export class MetaView {
  private readonly rootEl: HTMLElement;
  private readonly deck: Deck;
  private readonly theme: ThemeController;
  private readonly renderer: SlideRenderer;

  constructor(rootEl: HTMLElement, deck: Deck, theme: ThemeController) {
    this.rootEl = rootEl;
    this.rootEl.id = 'sw-meta';
    this.rootEl.hidden = true;
    this.deck = deck;
    this.theme = theme;
    this.renderer = new SlideRenderer(rootEl);
  }

  async show(index: number): Promise<void> {
    const slide = findMetaSlide(this.deck, index);
    if (!slide) return;
    this.rootEl.hidden = false;
    await this.renderer.renderSlide(slide, this.theme.resolveTheme(slide), null);
  }

  hide(): void {
    this.rootEl.hidden = true;
  }
}
