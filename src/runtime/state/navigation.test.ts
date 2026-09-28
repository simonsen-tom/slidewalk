import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck } from '../deck/model.js';
import { NavigationController, computeDirection, stepPosition } from './navigation.js';

function makeDeck(): Deck {
  return {
    title: 'Test Deck',
    defaultTheme: 'light',
    lanes: [
      {
        id: 'main',
        label: 'Main',
        slides: [
          {
            id: 'main-0',
            src: 'a.md',
            theme: null,
            laneId: 'main',
            flairCharacter: null,
            flairDurationMs: 500,
            backgroundAnimationCharacter: null,
          },
          {
            id: 'main-1',
            src: 'b.md',
            theme: null,
            laneId: 'main',
            flairCharacter: null,
            flairDurationMs: 500,
            backgroundAnimationCharacter: null,
          },
          {
            id: 'main-2',
            src: 'c.md',
            theme: null,
            laneId: 'main',
            flairCharacter: null,
            flairDurationMs: 500,
            backgroundAnimationCharacter: null,
          },
        ],
      },
      {
        id: 'deep-dive',
        label: 'Deep Dive',
        slides: [
          {
            id: 'deep-0',
            src: 'd.md',
            theme: null,
            laneId: 'deep-dive',
            flairCharacter: null,
            flairDurationMs: 500,
            backgroundAnimationCharacter: null,
          },
          {
            id: 'deep-1',
            src: 'e.md',
            theme: null,
            laneId: 'deep-dive',
            flairCharacter: null,
            flairDurationMs: 500,
            backgroundAnimationCharacter: null,
          },
        ],
      },
      {
        id: 'short',
        label: 'Short',
        slides: [
          {
            id: 'short-0',
            src: 'f.md',
            theme: null,
            laneId: 'short',
            flairCharacter: null,
            flairDurationMs: 500,
            backgroundAnimationCharacter: null,
          },
        ],
      },
    ],
    meta: [],
  };
}

test('next/prev move within the current lane and clamp at both ends', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  nav.prev();
  assert.deepEqual(nav.state, { laneId: 'main', slideIndex: 0 });

  nav.next();
  nav.next();
  assert.deepEqual(nav.state, { laneId: 'main', slideIndex: 2 });

  nav.next();
  assert.deepEqual(nav.state, { laneId: 'main', slideIndex: 2 });
});

test('laneUp/laneDown clamp at the top and bottom of the deck', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  nav.laneUp();
  assert.equal(nav.state.laneId, 'main');

  nav.laneDown();
  nav.laneDown();
  assert.equal(nav.state.laneId, 'short');

  nav.laneDown();
  assert.equal(nav.state.laneId, 'short');
});

test("switching lanes always lands on the target lane's first slide", () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 2 });
  nav.laneDown();
  assert.deepEqual(nav.state, { laneId: 'deep-dive', slideIndex: 0 });

  nav.laneDown();
  assert.deepEqual(nav.state, { laneId: 'short', slideIndex: 0 });
});

test('switching back to a previous lane also lands on its first slide, not the original index (lanes do not remember where you were)', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 2 });
  nav.laneDown();
  assert.deepEqual(nav.state, { laneId: 'deep-dive', slideIndex: 0 });
  nav.laneUp();
  assert.deepEqual(nav.state, { laneId: 'main', slideIndex: 0 });
});

test('goTo defaults source to "user" and tags explicit sources correctly', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const seen: string[] = [];
  nav.onChange((_pos, event) => seen.push(event.source));

  nav.goTo({ laneId: 'main', slideIndex: 0 });
  nav.goTo({ laneId: 'main', slideIndex: 1 }, 'remote');
  nav.next();

  assert.deepEqual(seen, ['user', 'remote', 'user']);
});

test('computeDirection: right/left within a lane, up/down across lanes, null for no-op or unknown lanes', () => {
  const deck = makeDeck();

  assert.equal(computeDirection(deck, { laneId: 'main', slideIndex: 0 }, { laneId: 'main', slideIndex: 1 }), 'right');
  assert.equal(computeDirection(deck, { laneId: 'main', slideIndex: 1 }, { laneId: 'main', slideIndex: 0 }), 'left');
  assert.equal(computeDirection(deck, { laneId: 'main', slideIndex: 1 }, { laneId: 'main', slideIndex: 1 }), null);

  assert.equal(
    computeDirection(deck, { laneId: 'main', slideIndex: 0 }, { laneId: 'deep-dive', slideIndex: 0 }),
    'down',
  );
  assert.equal(computeDirection(deck, { laneId: 'deep-dive', slideIndex: 0 }, { laneId: 'main', slideIndex: 0 }), 'up');
  assert.equal(computeDirection(deck, { laneId: 'main', slideIndex: 0 }, { laneId: 'short', slideIndex: 0 }), 'down');

  assert.equal(computeDirection(deck, { laneId: 'nope', slideIndex: 0 }, { laneId: 'main', slideIndex: 0 }), null);
});

test('NavigationController reports the correct direction for next/prev/laneUp/laneDown, and null for clamped no-ops', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const seen: Array<ReturnType<typeof String>> = [];
  nav.onChange((_pos, event) => seen.push(String(event.direction)));

  nav.next(); // main:0 -> main:1
  nav.prev(); // main:1 -> main:0
  nav.laneDown(); // main -> deep-dive
  nav.laneUp(); // deep-dive -> main

  assert.deepEqual(seen, ['right', 'left', 'down', 'up']);
});

test('a remote goTo that lands on the same position reports a null direction (no animation)', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 1 });
  let direction: unknown = 'unset';
  nav.onChange((_pos, event) => {
    direction = event.direction;
  });

  nav.goTo({ laneId: 'main', slideIndex: 1 }, 'remote');
  assert.equal(direction, null);
});

test('onChange returns an unsubscribe function', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  let calls = 0;
  const unsubscribe = nav.onChange(() => {
    calls += 1;
  });

  nav.next();
  assert.equal(calls, 1);

  unsubscribe();
  nav.next();
  assert.equal(calls, 1);
});

test('constructor clamps an out-of-range initial position', () => {
  const nav = new NavigationController(makeDeck(), { laneId: 'short', slideIndex: 99 });
  assert.deepEqual(nav.state, { laneId: 'short', slideIndex: 0 });
});

test('stepPosition: next/prev clamp at both ends of a lane', () => {
  const deck = makeDeck();
  assert.deepEqual(stepPosition(deck, { laneId: 'main', slideIndex: 0 }, 'prev'), { laneId: 'main', slideIndex: 0 });
  assert.deepEqual(stepPosition(deck, { laneId: 'main', slideIndex: 0 }, 'next'), { laneId: 'main', slideIndex: 1 });
  assert.deepEqual(stepPosition(deck, { laneId: 'main', slideIndex: 2 }, 'next'), { laneId: 'main', slideIndex: 2 });
});

test('stepPosition: laneUp/laneDown clamp at the top/bottom of the deck and land on the first slide', () => {
  const deck = makeDeck();
  assert.deepEqual(stepPosition(deck, { laneId: 'main', slideIndex: 0 }, 'laneUp'), { laneId: 'main', slideIndex: 0 });
  assert.deepEqual(stepPosition(deck, { laneId: 'main', slideIndex: 2 }, 'laneDown'), {
    laneId: 'deep-dive',
    slideIndex: 0,
  });
  assert.deepEqual(stepPosition(deck, { laneId: 'short', slideIndex: 0 }, 'laneDown'), {
    laneId: 'short',
    slideIndex: 0,
  });
});

test('stepPosition returns the input unchanged for an unknown laneId', () => {
  const deck = makeDeck();
  const position = { laneId: 'nope', slideIndex: 0 };
  assert.deepEqual(stepPosition(deck, position, 'next'), position);
  assert.deepEqual(stepPosition(deck, position, 'laneDown'), position);
});
