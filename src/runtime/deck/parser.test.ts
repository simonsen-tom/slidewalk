import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { parseDeckDom, DeckParseError } from './parser.js';

function docFrom(html: string): Document {
  return parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`).document as unknown as Document;
}

test('parses a valid deck into the expected model', () => {
  const doc = docFrom(`
    <slidewalk-deck default-theme="light" title="My Deck">
      <slidewalk-lane id="main" label="Main Track">
        <slidewalk-slide src="slides/intro.md"></slidewalk-slide>
        <slidewalk-slide src="slides/details.md" theme="dark"></slidewalk-slide>
      </slidewalk-lane>
      <slidewalk-lane id="deep-dive">
        <slidewalk-slide src="slides/deep-1.md" id="custom-id"></slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>
  `);

  const deck = parseDeckDom(doc);

  assert.equal(deck.title, 'My Deck');
  assert.equal(deck.defaultTheme, 'light');
  assert.equal(deck.lanes.length, 2);

  const [main, deepDive] = deck.lanes;
  assert.equal(main.id, 'main');
  assert.equal(main.label, 'Main Track');
  assert.equal(main.slides.length, 2);
  assert.deepEqual(main.slides[0], {
    id: 'main-0',
    src: 'slides/intro.md',
    theme: null,
    laneId: 'main',
    flairCharacter: null,
    flairDurationMs: 500,
    backgroundAnimationCharacter: null,
  });
  assert.deepEqual(main.slides[1], {
    id: 'main-1',
    src: 'slides/details.md',
    theme: 'dark',
    laneId: 'main',
    flairCharacter: null,
    flairDurationMs: 500,
    backgroundAnimationCharacter: null,
  });

  assert.equal(deepDive.label, 'deep-dive');
  assert.equal(deepDive.slides[0].id, 'custom-id');
});

test('defaults default-theme to light when omitted', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main">
        <slidewalk-slide src="a.md"></slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.equal(parseDeckDom(doc).defaultTheme, 'light');
});

test('throws when no <slidewalk-deck> is present', () => {
  const doc = docFrom(`<p>nothing here</p>`);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws when a deck has zero lanes', () => {
  const doc = docFrom(`<slidewalk-deck></slidewalk-deck>`);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws when a lane has zero slides', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="empty"></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on a lane missing an id', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane>
        <slidewalk-slide src="a.md"></slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on duplicate lane ids', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
      <slidewalk-lane id="main"><slidewalk-slide src="b.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on duplicate slide ids across lanes', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="a"><slidewalk-slide src="a.md" id="dup"></slidewalk-slide></slidewalk-lane>
      <slidewalk-lane id="b"><slidewalk-slide src="b.md" id="dup"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on a slide missing src', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on an invalid theme value', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md" theme="blue"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('parses flair-character and flair-duration when present', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main">
        <slidewalk-slide src="a.md" flair-character="⚡" flair-duration="1200"></slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>
  `);
  const slide = parseDeckDom(doc).lanes[0].slides[0];
  assert.equal(slide.flairCharacter, '⚡');
  assert.equal(slide.flairDurationMs, 1200);
});

test('defaults flairCharacter to null and flairDurationMs to 500 when omitted', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  const slide = parseDeckDom(doc).lanes[0].slides[0];
  assert.equal(slide.flairCharacter, null);
  assert.equal(slide.flairDurationMs, 500);
});

test('treats an empty flair-character attribute as unset', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md" flair-character=""></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.equal(parseDeckDom(doc).lanes[0].slides[0].flairCharacter, null);
});

test('throws on a non-numeric flair-duration', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md" flair-duration="fast"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on a non-positive flair-duration', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md" flair-duration="0"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('parses background-animation-character when present', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main">
        <slidewalk-slide src="a.md" background-animation-character="✦"></slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>
  `);
  const slide = parseDeckDom(doc).lanes[0].slides[0];
  assert.equal(slide.backgroundAnimationCharacter, '✦');
});

test('defaults backgroundAnimationCharacter to null when omitted', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.equal(parseDeckDom(doc).lanes[0].slides[0].backgroundAnimationCharacter, null);
});

test('treats an empty background-animation-character attribute as unset', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md" background-animation-character=""></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.equal(parseDeckDom(doc).lanes[0].slides[0].backgroundAnimationCharacter, null);
});

test('ignores nested lanes/slides that are not direct children (via :scope >)', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="outer">
        <slidewalk-slide src="outer.md">
          <slidewalk-slide src="nested-should-be-ignored.md"></slidewalk-slide>
        </slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>
  `);
  const deck = parseDeckDom(doc);
  assert.equal(deck.lanes[0].slides.length, 1);
  assert.equal(deck.lanes[0].slides[0].src, 'outer.md');
});

test('parses <slidewalk-meta> slides into deck.meta', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-meta>
        <slidewalk-slide src="meta/map.md"></slidewalk-slide>
        <slidewalk-slide src="meta/credits.md" theme="dark"></slidewalk-slide>
      </slidewalk-meta>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  const deck = parseDeckDom(doc);
  assert.equal(deck.meta.length, 2);
  assert.deepEqual(deck.meta[0], {
    id: 'meta-0',
    src: 'meta/map.md',
    theme: null,
    flairCharacter: null,
    flairDurationMs: 500,
    backgroundAnimationCharacter: null,
  });
  assert.deepEqual(deck.meta[1], {
    id: 'meta-1',
    src: 'meta/credits.md',
    theme: 'dark',
    flairCharacter: null,
    flairDurationMs: 500,
    backgroundAnimationCharacter: null,
  });
});

test('defaults deck.meta to an empty array when <slidewalk-meta> is absent', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.deepEqual(parseDeckDom(doc).meta, []);
});

test('throws when a deck has more than one <slidewalk-meta>', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-meta><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-meta>
      <slidewalk-meta><slidewalk-slide src="b.md"></slidewalk-slide></slidewalk-meta>
      <slidewalk-lane id="main"><slidewalk-slide src="c.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('allows exactly 10 meta slides', () => {
  const metaSlides = Array.from(
    { length: 10 },
    (_, i) => `<slidewalk-slide src="meta/${i}.md"></slidewalk-slide>`,
  ).join('');
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-meta>${metaSlides}</slidewalk-meta>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.equal(parseDeckDom(doc).meta.length, 10);
});

test('throws when <slidewalk-meta> has more than 10 slides', () => {
  const metaSlides = Array.from(
    { length: 11 },
    (_, i) => `<slidewalk-slide src="meta/${i}.md"></slidewalk-slide>`,
  ).join('');
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-meta>${metaSlides}</slidewalk-meta>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on a meta slide missing src', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-meta><slidewalk-slide></slidewalk-slide></slidewalk-meta>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('throws on a duplicate id shared between a meta slide and a lane slide', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-meta><slidewalk-slide src="meta/a.md" id="dup"></slidewalk-slide></slidewalk-meta>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md" id="dup"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  assert.throws(() => parseDeckDom(doc), DeckParseError);
});

test('ignores a <slidewalk-meta> nested inside a lane (via :scope >)', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-lane id="main">
        <slidewalk-meta><slidewalk-slide src="nested-should-be-ignored.md"></slidewalk-slide></slidewalk-meta>
        <slidewalk-slide src="a.md"></slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>
  `);
  const deck = parseDeckDom(doc);
  assert.deepEqual(deck.meta, []);
  assert.equal(deck.lanes[0].slides.length, 1);
});

test('parses flair-character/flair-duration/background-animation-character on meta slides', () => {
  const doc = docFrom(`
    <slidewalk-deck>
      <slidewalk-meta>
        <slidewalk-slide src="meta/a.md" flair-character="⚡" flair-duration="1200" background-animation-character="✦"></slidewalk-slide>
      </slidewalk-meta>
      <slidewalk-lane id="main"><slidewalk-slide src="a.md"></slidewalk-slide></slidewalk-lane>
    </slidewalk-deck>
  `);
  const slide = parseDeckDom(doc).meta[0];
  assert.equal(slide.flairCharacter, '⚡');
  assert.equal(slide.flairDurationMs, 1200);
  assert.equal(slide.backgroundAnimationCharacter, '✦');
});
