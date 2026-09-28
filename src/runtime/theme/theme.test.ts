import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck } from '../deck/model.js';
import { ThemeController } from './theme.js';

function makeDeck(defaultTheme: 'light' | 'dark'): Deck {
  return { title: 'Test', defaultTheme, lanes: [], meta: [] };
}

test("starts from the deck's default-theme", () => {
  assert.equal(new ThemeController(makeDeck('light')).currentDefaultTheme, 'light');
  assert.equal(new ThemeController(makeDeck('dark')).currentDefaultTheme, 'dark');
});

test('toggle() flips the default theme and notifies listeners', () => {
  const controller = new ThemeController(makeDeck('light'));
  const seen: string[] = [];
  controller.onChange((theme) => seen.push(theme));

  controller.toggle();
  assert.equal(controller.currentDefaultTheme, 'dark');
  controller.toggle();
  assert.equal(controller.currentDefaultTheme, 'light');

  assert.deepEqual(seen, ['dark', 'light']);
});

test('resolveTheme falls back to the current default for slides without an explicit theme', () => {
  const controller = new ThemeController(makeDeck('light'));
  const slide = {
    id: 's',
    src: 'a.md',
    theme: null,
    laneId: 'main',
    flairCharacter: null,
    flairDurationMs: 500,
    backgroundAnimationCharacter: null,
  } as const;

  assert.equal(controller.resolveTheme(slide), 'light');
  controller.toggle();
  assert.equal(controller.resolveTheme(slide), 'dark');
});

test('resolveTheme never changes for a slide with an explicit theme, even after toggling', () => {
  const controller = new ThemeController(makeDeck('light'));
  const darkSlide = {
    id: 's',
    src: 'a.md',
    theme: 'dark',
    laneId: 'main',
    flairCharacter: null,
    flairDurationMs: 500,
    backgroundAnimationCharacter: null,
  } as const;

  assert.equal(controller.resolveTheme(darkSlide), 'dark');
  controller.toggle();
  assert.equal(controller.resolveTheme(darkSlide), 'dark');
  controller.toggle();
  assert.equal(controller.resolveTheme(darkSlide), 'dark');
});
