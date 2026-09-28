import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck } from '../deck/model.js';
import { OverviewState } from './overview-state.js';

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
    ],
    meta: [],
  };
}

test('starts closed with the given initial selection', () => {
  const overview = new OverviewState(makeDeck(), { laneId: 'main', slideIndex: 1 });
  assert.equal(overview.isOpen, false);
  assert.deepEqual(overview.currentSelection, { laneId: 'main', slideIndex: 1 });
});

test('toggle() opens and captures the passed-in nav position as the selection', () => {
  const overview = new OverviewState(makeDeck(), { laneId: 'main', slideIndex: 0 });
  overview.toggle({ laneId: 'deep-dive', slideIndex: 1 });
  assert.equal(overview.isOpen, true);
  assert.deepEqual(overview.currentSelection, { laneId: 'deep-dive', slideIndex: 1 });
});

test('toggle() again closes without touching the selection', () => {
  const overview = new OverviewState(makeDeck(), { laneId: 'main', slideIndex: 0 });
  overview.toggle({ laneId: 'main', slideIndex: 2 });
  overview.select('next'); // moves selection to a spot the initial nav position never was
  overview.toggle({ laneId: 'main', slideIndex: 0 }); // this call closes it, so its argument should be ignored
  assert.equal(overview.isOpen, false);
  assert.deepEqual(overview.currentSelection, { laneId: 'main', slideIndex: 2 });
});

test("select() moves the selection using stepPosition's clamp semantics", () => {
  const overview = new OverviewState(makeDeck(), { laneId: 'main', slideIndex: 0 });
  overview.toggle({ laneId: 'main', slideIndex: 2 });

  overview.select('laneDown');
  assert.deepEqual(overview.currentSelection, { laneId: 'deep-dive', slideIndex: 0 });

  overview.select('laneDown'); // clamp: no lane below
  assert.deepEqual(overview.currentSelection, { laneId: 'deep-dive', slideIndex: 0 });
});

test('select()/close() are no-ops when not open', () => {
  const overview = new OverviewState(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const seen: unknown[] = [];
  overview.onChange((snapshot) => seen.push(snapshot));

  overview.select('next');
  overview.close();

  assert.deepEqual(seen, []);
  assert.deepEqual(overview.currentSelection, { laneId: 'main', slideIndex: 0 });
});

test('onChange fires on every open/close/select, including a repeated identical selection', () => {
  const overview = new OverviewState(makeDeck(), { laneId: 'main', slideIndex: 2 });
  const opens: boolean[] = [];
  overview.onChange((snapshot) => opens.push(snapshot.open));

  overview.toggle({ laneId: 'main', slideIndex: 2 }); // open
  overview.select('next'); // clamped no-op position-wise, still emits
  overview.select('next'); // clamped no-op again
  overview.close();

  assert.deepEqual(opens, [true, true, true, false]);
});

test('onChange returns an unsubscribe function', () => {
  const overview = new OverviewState(makeDeck(), { laneId: 'main', slideIndex: 0 });
  let calls = 0;
  const unsubscribe = overview.onChange(() => {
    calls += 1;
  });

  overview.toggle({ laneId: 'main', slideIndex: 0 });
  assert.equal(calls, 1);

  unsubscribe();
  overview.select('next');
  assert.equal(calls, 1);
});
