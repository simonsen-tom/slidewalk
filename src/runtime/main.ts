import './elements/slidewalk-deck.js';
import './elements/slidewalk-lane.js';
import './elements/slidewalk-slide.js';
import './elements/slidewalk-meta.js';

import { parseDeckDom, DeckParseError } from './deck/parser.js';
import { findSlide, type Deck, type Direction, type Position } from './deck/model.js';
import { NavigationController } from './state/navigation.js';
import { PresenterState } from './state/presenter-state.js';
import { OverviewState } from './state/overview-state.js';
import { MetaState } from './state/meta-state.js';
import { PresenterSync } from './sync/broadcast.js';
import { connectLiveReload } from './sync/live-reload.js';
import { ThemeController } from './theme/theme.js';
import { SlideRenderer } from './render/slide-renderer.js';
import { PresenterView } from './render/presenter-view.js';
import { OverviewView } from './render/overview-view.js';
import { MetaView } from './render/meta-view.js';
import { installKeyboardHandler } from './input/keyboard.js';

function readPositionFromHash(): Partial<Position> {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const params = new URLSearchParams(raw);
  const laneId = params.get('lane');
  const slideIndexRaw = params.get('slide');
  const slideIndex = slideIndexRaw !== null ? Number(slideIndexRaw) : NaN;
  return {
    ...(laneId ? { laneId } : {}),
    ...(Number.isInteger(slideIndex) ? { slideIndex } : {}),
  };
}

function writePositionToHash(position: Position): void {
  const params = new URLSearchParams({ lane: position.laneId, slide: String(position.slideIndex) });
  history.replaceState(null, '', `#${params.toString()}`);
}

function renderErrorBanner(message: string): void {
  document.body.innerHTML = `<div class="sw-fatal-error"><strong>Slidewalk couldn't load this deck.</strong><p>${message}</p></div>`;
}

async function main(): Promise<void> {
  connectLiveReload();

  let deck: Deck;
  try {
    deck = parseDeckDom(document);
  } catch (error) {
    const message = error instanceof DeckParseError ? error.message : 'Unknown error.';
    renderErrorBanner(message);
    return;
  }

  const firstLane = deck.lanes[0];
  const hashPosition = readPositionFromHash();
  const initialPosition: Position = {
    laneId: hashPosition.laneId ?? firstLane.id,
    slideIndex: hashPosition.slideIndex ?? 0,
  };

  const stageEl = document.createElement('div');
  stageEl.id = 'sw-stage';
  const panelEl = document.createElement('div');
  panelEl.id = 'sw-presenter-panel';
  const overviewEl = document.createElement('div');
  const metaEl = document.createElement('div');
  document.body.append(stageEl, panelEl, overviewEl, metaEl);

  const nav = new NavigationController(deck, initialPosition);
  const theme = new ThemeController(deck);
  const presenter = new PresenterState();
  const overview = new OverviewState(deck, initialPosition);
  const meta = new MetaState(deck.meta.length);
  const slideRenderer = new SlideRenderer(stageEl);
  const presenterView = new PresenterView(panelEl);
  const overviewView = new OverviewView(overviewEl, deck, theme, (position) => {
    nav.goTo(position, 'user');
    overview.close();
  });
  const metaView = new MetaView(metaEl, deck, theme);
  const sync = new PresenterSync(nav, meta);

  async function renderSlide(direction: Direction | null): Promise<void> {
    const slide = findSlide(deck, nav.state);
    if (!slide) return;
    await slideRenderer.renderSlide(slide, theme.resolveTheme(slide), direction);
  }

  async function updatePresenterView(): Promise<void> {
    if (!presenter.isPresenterMode) return;
    await presenterView.update(deck, nav.state, slideRenderer.getCurrentNotesHtml());
  }

  nav.onChange((position, event) => {
    writePositionToHash(position);
    void (async () => {
      await renderSlide(event.direction);
      await updatePresenterView();
    })();
  });

  theme.onChange(() => {
    const slide = findSlide(deck, nav.state);
    if (slide) {
      // Just update the theme attribute. A full re-render would restart any
      // <video>/<iframe> that's playing on the current slide.
      slideRenderer.setTheme(theme.resolveTheme(slide));
    }
  });

  presenter.onChange((on) => {
    document.body.classList.toggle('sw-presenter-mode', on);
    if (on) {
      presenterView.startTimerIfNeeded();
      void updatePresenterView();
    }
  });

  overview.onChange((snapshot) => {
    if (snapshot.open) {
      void overviewView.show(snapshot.selection);
    } else {
      overviewView.hide();
    }
  });

  meta.onChange((snapshot) => {
    if (snapshot.open && snapshot.index !== null) {
      void metaView.show(snapshot.index);
    } else {
      metaView.hide();
    }
  });

  // The meta overlay and the overview never show at the same time (see
  // showMeta/toggleOverview below), so this only ever redirects to one of them.
  function navigate(action: 'next' | 'prev' | 'laneUp' | 'laneDown'): void {
    if (meta.isOpen) return;
    if (overview.isOpen) {
      overview.select(action);
      return;
    }
    nav[action]();
  }

  installKeyboardHandler(window, {
    next: () => navigate('next'),
    prev: () => navigate('prev'),
    laneUp: () => navigate('laneUp'),
    laneDown: () => navigate('laneDown'),
    togglePresenter: () => presenter.toggle(),
    toggleTheme: () => theme.toggle(),
    toggleOverview: () => {
      meta.close();
      overview.toggle(nav.state);
    },
    confirm: () => {
      if (!overview.isOpen) return;
      nav.goTo(overview.currentSelection, 'user');
      overview.close();
    },
    closeOverview: () => {
      if (meta.isOpen) {
        meta.close();
      } else {
        overview.close();
      }
    },
    showMeta: (index) => {
      overview.close();
      meta.show(index);
    },
  });

  const peerState = await sync.requestInitialState();
  if (peerState) {
    nav.goTo(peerState.position, 'remote');
    if (peerState.metaIndex !== null) {
      meta.show(peerState.metaIndex, 'remote');
    }
  } else {
    await renderSlide(null);
  }
}

void main();
