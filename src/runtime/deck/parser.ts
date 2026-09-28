import type { Deck, Lane, MetaSlide, Slide, ThemeName } from './model.js';
import { MAX_META_SLIDES } from './model.js';

export class DeckParseError extends Error {}

function parseTheme(raw: string | null, context: string): ThemeName | null {
  if (raw === null) return null;
  if (raw === 'light' || raw === 'dark') return raw;
  throw new DeckParseError(`${context}: theme should be "light" or "dark", but it's "${raw}".`);
}

const FLAIR_DEFAULT_DURATION_MS = 500;

function parseFlairDuration(raw: string | null, context: string): number {
  if (raw === null) return FLAIR_DEFAULT_DURATION_MS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new DeckParseError(
      `${context}: flair-duration should be a positive number of milliseconds, but it's "${raw}".`,
    );
  }
  return value;
}

interface SlideContentParsed {
  id: string;
  src: string;
  theme: ThemeName | null;
  flairCharacter: string | null;
  flairDurationMs: number;
  backgroundAnimationCharacter: string | null;
}

function parseSlideContent(
  slideEl: Element,
  defaultId: string,
  missingSrcMessage: string,
  seenSlideIds: Set<string>,
): SlideContentParsed {
  const src = slideEl.getAttribute('src');
  if (!src) {
    throw new DeckParseError(missingSrcMessage);
  }
  const theme = parseTheme(slideEl.getAttribute('theme'), `Slide "${src}"`);
  const id = slideEl.getAttribute('id') ?? defaultId;
  if (seenSlideIds.has(id)) {
    throw new DeckParseError(`There's more than one slide with the id "${id}". Slide ids need to be unique.`);
  }
  seenSlideIds.add(id);

  const flairCharacterRaw = slideEl.getAttribute('flair-character');
  const flairCharacter = flairCharacterRaw ? flairCharacterRaw : null; // "" counts as unset
  const flairDurationMs = parseFlairDuration(slideEl.getAttribute('flair-duration'), `Slide "${src}"`);

  const backgroundAnimationCharacterRaw = slideEl.getAttribute('background-animation-character');
  const backgroundAnimationCharacter = backgroundAnimationCharacterRaw ? backgroundAnimationCharacterRaw : null; // "" counts as unset

  return { id, src, theme, flairCharacter, flairDurationMs, backgroundAnimationCharacter };
}

export function parseDeckDom(doc: Document): Deck {
  const deckEl = doc.querySelector('slidewalk-deck');
  if (!deckEl) {
    throw new DeckParseError("Couldn't find a <slidewalk-deck> element in index.html.");
  }

  const defaultTheme = parseTheme(deckEl.getAttribute('default-theme'), '<slidewalk-deck>') ?? 'light';
  const title = deckEl.getAttribute('title') ?? '';

  const laneEls = Array.from(deckEl.querySelectorAll(':scope > slidewalk-lane'));
  if (laneEls.length === 0) {
    throw new DeckParseError('Your <slidewalk-deck> needs at least one <slidewalk-lane> inside it.');
  }

  const seenLaneIds = new Set<string>();
  const seenSlideIds = new Set<string>();
  const lanes: Lane[] = [];

  for (const laneEl of laneEls) {
    const laneId = laneEl.getAttribute('id');
    if (!laneId) {
      throw new DeckParseError('Every <slidewalk-lane> needs an "id" attribute.');
    }
    if (seenLaneIds.has(laneId)) {
      throw new DeckParseError(`There's more than one lane with the id "${laneId}". Lane ids need to be unique.`);
    }
    seenLaneIds.add(laneId);

    const label = laneEl.getAttribute('label') ?? laneId;

    const slideEls = Array.from(laneEl.querySelectorAll(':scope > slidewalk-slide'));
    if (slideEls.length === 0) {
      throw new DeckParseError(`Lane "${laneId}" needs at least one <slidewalk-slide> inside it.`);
    }

    const slides: Slide[] = slideEls.map((slideEl, index) => {
      const content = parseSlideContent(
        slideEl,
        `${laneId}-${index}`,
        `Slide ${index} in lane "${laneId}" needs a "src" attribute pointing at its markdown file.`,
        seenSlideIds,
      );
      return { ...content, laneId };
    });

    lanes.push({ id: laneId, label, slides });
  }

  const metaEls = Array.from(deckEl.querySelectorAll(':scope > slidewalk-meta'));
  if (metaEls.length > 1) {
    throw new DeckParseError(`A deck can only have one <slidewalk-meta> block, but this one has ${metaEls.length}.`);
  }

  let meta: MetaSlide[] = [];
  if (metaEls.length === 1) {
    const metaSlideEls = Array.from(metaEls[0]!.querySelectorAll(':scope > slidewalk-slide'));
    if (metaSlideEls.length > MAX_META_SLIDES) {
      throw new DeckParseError(
        `<slidewalk-meta> can hold up to ${MAX_META_SLIDES} slides (one per number key), but it has ${metaSlideEls.length}.`,
      );
    }
    meta = metaSlideEls.map((slideEl, index) =>
      parseSlideContent(
        slideEl,
        `meta-${index}`,
        `Meta slide ${index} needs a "src" attribute pointing at its markdown file.`,
        seenSlideIds,
      ),
    );
  }

  return { title, defaultTheme, lanes, meta };
}
