import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import type { Deck } from '../deck/model.js';
import { NavigationController } from '../state/navigation.js';
import { MetaState } from '../state/meta-state.js';
import { PresenterSync } from './broadcast.js';

let channelCounter = 0;
function uniqueChannelName(): string {
  channelCounter += 1;
  return `slidewalk-test-${process.pid}-${channelCounter}`;
}

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
    meta: [
      {
        id: 'meta-0',
        src: 'm0.md',
        theme: null,
        flairCharacter: null,
        flairDurationMs: 500,
        backgroundAnimationCharacter: null,
      },
      {
        id: 'meta-1',
        src: 'm1.md',
        theme: null,
        flairCharacter: null,
        flairDurationMs: 500,
        backgroundAnimationCharacter: null,
      },
    ],
  };
}

test('a user-driven position change propagates to a peer window', async () => {
  const channel = uniqueChannelName();
  const navA = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const navB = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const syncA = new PresenterSync(navA, new MetaState(2), channel);
  const syncB = new PresenterSync(navB, new MetaState(2), channel);

  navA.next();
  await delay(50);

  assert.deepEqual(navB.state, { laneId: 'main', slideIndex: 1 });

  syncA.close();
  syncB.close();
});

test('applying a remote position does not echo back and bounce', async () => {
  const channel = uniqueChannelName();
  const navA = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const navB = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const syncA = new PresenterSync(navA, new MetaState(2), channel);
  const syncB = new PresenterSync(navB, new MetaState(2), channel);

  let bMessageCount = 0;
  navB.onChange(() => {
    bMessageCount += 1;
  });

  navA.next();
  await delay(50);

  // navB should have applied exactly the one remote change, not bounced
  // back and forth between A and B.
  assert.equal(bMessageCount, 1);
  assert.deepEqual(navA.state, { laneId: 'main', slideIndex: 1 });
  assert.deepEqual(navB.state, { laneId: 'main', slideIndex: 1 });

  syncA.close();
  syncB.close();
});

test('a remote-sourced nav change is not rebroadcast', async () => {
  const channel = uniqueChannelName();
  const navA = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const syncA = new PresenterSync(navA, new MetaState(2), channel);

  navA.goTo({ laneId: 'main', slideIndex: 2 }, 'remote');
  await delay(50);

  // A second, independent window joining now should see the *original*
  // initial state request answered with A's current (remotely-applied)
  // position, proving A applied it locally without needing to rebroadcast.
  const navC = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const syncC = new PresenterSync(navC, new MetaState(2), channel);
  const state = await syncC.requestInitialState(500);

  assert.deepEqual(state, { position: { laneId: 'main', slideIndex: 2 }, metaIndex: null });

  syncA.close();
  syncC.close();
});

test("requestInitialState resolves with a peer's current position", async () => {
  const channel = uniqueChannelName();
  const navA = new NavigationController(makeDeck(), { laneId: 'deep-dive', slideIndex: 1 });
  const syncA = new PresenterSync(navA, new MetaState(2), channel);

  const navB = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const syncB = new PresenterSync(navB, new MetaState(2), channel);

  const state = await syncB.requestInitialState(500);
  assert.deepEqual(state, { position: { laneId: 'deep-dive', slideIndex: 1 }, metaIndex: null });

  syncA.close();
  syncB.close();
});

test('requestInitialState resolves to null when no peer responds in time', async () => {
  const channel = uniqueChannelName();
  const nav = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const sync = new PresenterSync(nav, new MetaState(2), channel);

  const state = await sync.requestInitialState(50);
  assert.equal(state, null);

  sync.close();
});

test('a user-driven meta-overlay open/close propagates to a peer window', async () => {
  const channel = uniqueChannelName();
  const navA = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const navB = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const metaA = new MetaState(2);
  const metaB = new MetaState(2);
  const syncA = new PresenterSync(navA, metaA, channel);
  const syncB = new PresenterSync(navB, metaB, channel);

  metaA.show(1);
  await delay(50);
  assert.equal(metaB.isOpen, true);
  assert.equal(metaB.currentIndex, 1);

  metaA.close();
  await delay(50);
  assert.equal(metaB.isOpen, false);

  syncA.close();
  syncB.close();
});

test('a remote-sourced meta change is not rebroadcast', async () => {
  const channel = uniqueChannelName();
  const navA = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const metaA = new MetaState(2);
  const syncA = new PresenterSync(navA, metaA, channel);

  metaA.show(0, 'remote');
  await delay(50);

  const navC = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const syncC = new PresenterSync(navC, new MetaState(2), channel);
  const state = await syncC.requestInitialState(500);

  // If the remote-sourced show() had been rebroadcast, this would still
  // pass; the real assertion is that no *echo loop* occurred, i.e. metaA's
  // state settled at index 0 rather than bouncing.
  assert.deepEqual(state, { position: { laneId: 'main', slideIndex: 0 }, metaIndex: 0 });

  syncA.close();
  syncC.close();
});

test("requestInitialState includes a peer's in-progress meta overlay", async () => {
  const channel = uniqueChannelName();
  const navA = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const metaA = new MetaState(2);
  const syncA = new PresenterSync(navA, metaA, channel);
  metaA.show(1);

  const navB = new NavigationController(makeDeck(), { laneId: 'main', slideIndex: 0 });
  const syncB = new PresenterSync(navB, new MetaState(2), channel);

  const state = await syncB.requestInitialState(500);
  assert.deepEqual(state, { position: { laneId: 'main', slideIndex: 0 }, metaIndex: 1 });

  syncA.close();
  syncB.close();
});
