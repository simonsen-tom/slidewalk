import type { Position } from '../deck/model.js';
import type { NavigationController } from '../state/navigation.js';
import type { MetaState } from '../state/meta-state.js';

export const DEFAULT_CHANNEL_NAME = 'slidewalk';
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 250;

export interface InitialSyncState {
  position: Position;
  metaIndex: number | null;
}

type SyncMessage =
  | { type: 'position'; laneId: string; slideIndex: number; senderId: string; ts: number }
  | { type: 'meta'; index: number | null; senderId: string; ts: number }
  | { type: 'request-state'; senderId: string }
  | { type: 'state'; laneId: string; slideIndex: number; metaIndex: number | null; senderId: string; ts: number };

function randomSenderId(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Keeps the slide position (lane + slide index) and the meta-slide overlay
 * in sync across same-origin browser windows and tabs, via BroadcastChannel.
 * Presenter mode and the overview grid are deliberately left out, which is
 * what keeps them independent in each window. The meta overlay is the one
 * exception. Its whole point is showing the same reference slide (like a
 * map) on every synced window, including the one the audience sees.
 */
export class PresenterSync {
  private readonly channel: BroadcastChannel;
  private readonly senderId = randomSenderId();
  private readonly nav: NavigationController;
  private readonly meta: MetaState;

  constructor(nav: NavigationController, meta: MetaState, channelName: string = DEFAULT_CHANNEL_NAME) {
    this.nav = nav;
    this.meta = meta;
    this.channel = new BroadcastChannel(channelName);
    this.channel.addEventListener('message', (event: MessageEvent<SyncMessage>) => {
      this.handleMessage(event.data);
    });

    this.nav.onChange((position, event) => {
      if (event.source !== 'user') return;
      this.post({
        type: 'position',
        laneId: position.laneId,
        slideIndex: position.slideIndex,
        senderId: this.senderId,
        ts: Date.now(),
      });
    });

    this.meta.onChange((snapshot) => {
      if (snapshot.source !== 'user') return;
      this.post({
        type: 'meta',
        index: snapshot.open ? snapshot.index : null,
        senderId: this.senderId,
        ts: Date.now(),
      });
    });
  }

  /**
   * Asks any other open windows where they are (position and meta overlay).
   * Resolves with the first reply, or null if nobody answers within
   * timeoutMs. In that case this window's own starting state wins.
   */
  requestInitialState(timeoutMs: number = DEFAULT_HANDSHAKE_TIMEOUT_MS): Promise<InitialSyncState | null> {
    return new Promise((resolve) => {
      let settled = false;

      const handler = (event: MessageEvent<SyncMessage>) => {
        const message = event.data;
        if (settled || message.senderId === this.senderId || message.type !== 'state') return;
        settled = true;
        clearTimeout(timer);
        this.channel.removeEventListener('message', handler);
        resolve({
          position: { laneId: message.laneId, slideIndex: message.slideIndex },
          metaIndex: message.metaIndex,
        });
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.channel.removeEventListener('message', handler);
        resolve(null);
      }, timeoutMs);

      this.channel.addEventListener('message', handler);
      this.post({ type: 'request-state', senderId: this.senderId });
    });
  }

  close(): void {
    this.channel.close();
  }

  private handleMessage(message: SyncMessage): void {
    if (message.senderId === this.senderId) return;

    if (message.type === 'request-state') {
      const position = this.nav.state;
      this.post({
        type: 'state',
        laneId: position.laneId,
        slideIndex: position.slideIndex,
        metaIndex: this.meta.isOpen ? this.meta.currentIndex : null,
        senderId: this.senderId,
        ts: Date.now(),
      });
      return;
    }

    if (message.type === 'meta') {
      if (message.index === null) {
        this.meta.close('remote');
      } else {
        this.meta.show(message.index, 'remote');
      }
      return;
    }

    this.nav.goTo({ laneId: message.laneId, slideIndex: message.slideIndex }, 'remote');
    if (message.type === 'state') {
      if (message.metaIndex === null) {
        this.meta.close('remote');
      } else {
        this.meta.show(message.metaIndex, 'remote');
      }
    }
  }

  private post(message: SyncMessage): void {
    this.channel.postMessage(message);
  }
}
