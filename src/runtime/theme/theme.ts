import type { Deck, SlideContent, ThemeName } from '../deck/model.js';

export type ThemeListener = (theme: ThemeName) => void;

/**
 * Keeps track of the deck's current default theme (which the `T` key
 * toggles) and works out which theme any given slide should actually use.
 * Slides with their own `theme` attribute always win, so the toggle never
 * touches them.
 */
export class ThemeController {
  private defaultTheme: ThemeName;
  private readonly listeners = new Set<ThemeListener>();

  constructor(deck: Deck) {
    this.defaultTheme = deck.defaultTheme;
  }

  get currentDefaultTheme(): ThemeName {
    return this.defaultTheme;
  }

  toggle(): void {
    this.defaultTheme = this.defaultTheme === 'light' ? 'dark' : 'light';
    for (const listener of this.listeners) {
      listener(this.defaultTheme);
    }
  }

  onChange(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  resolveTheme(slide: SlideContent): ThemeName {
    return slide.theme ?? this.defaultTheme;
  }
}
