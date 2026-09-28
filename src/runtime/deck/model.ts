export type ThemeName = 'light' | 'dark';

/** Fields shared by lane slides and meta slides. It's everything SlideRenderer and ThemeController need. */
export interface SlideContent {
  id: string;
  src: string;
  theme: ThemeName | null;
  flairCharacter: string | null;
  flairDurationMs: number;
  backgroundAnimationCharacter: string | null;
}

export interface Slide extends SlideContent {
  laneId: string;
}

/** A slide inside <slidewalk-meta>. It lives outside the lane/slide grid, so it has no laneId. */
export type MetaSlide = SlideContent;

export interface Lane {
  id: string;
  label: string;
  slides: Slide[];
}

/** How many <slidewalk-slide> children a deck's <slidewalk-meta> block can hold (one per number key). */
export const MAX_META_SLIDES = 10;

export interface Deck {
  title: string;
  defaultTheme: ThemeName;
  lanes: Lane[];
  meta: MetaSlide[];
}

export interface Position {
  laneId: string;
  slideIndex: number;
}

/** The direction a slide transition animates in from, derived by comparing two positions. */
export type Direction = 'left' | 'right' | 'up' | 'down';

export function findLane(deck: Deck, laneId: string): Lane | undefined {
  return deck.lanes.find((lane) => lane.id === laneId);
}

export function findSlide(deck: Deck, position: Position): Slide | undefined {
  return findLane(deck, position.laneId)?.slides[position.slideIndex];
}

export function findMetaSlide(deck: Deck, index: number): MetaSlide | undefined {
  return deck.meta[index];
}

export function resolveSlideTheme(deck: Deck, slide: SlideContent): ThemeName {
  return slide.theme ?? deck.defaultTheme;
}
