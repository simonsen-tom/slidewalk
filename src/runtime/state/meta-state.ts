export type MetaSource = 'user' | 'remote';

export interface MetaSnapshot {
  open: boolean;
  index: number | null;
  source: MetaSource;
}

export type MetaListener = (snapshot: MetaSnapshot) => void;

/**
 * Local state for the meta-slide overlay, which number keys open and close
 * (see input/keyboard.ts). Unlike PresenterState and OverviewState, changes
 * here carry a `source` tag, just like NavigationController's NavSource.
 * That lets sync/broadcast.ts tell a local open/close (which should go out
 * to the other windows) from one that came in from another window (which
 * shouldn't be sent back out, or we'd get an echo loop).
 *
 * There's no cursor moving through a grid here, unlike OverviewState. Number
 * keys pick a slot directly, so all we track is whether the overlay is open
 * and which meta slide it's showing.
 */
export class MetaState {
  private readonly metaSlideCount: number;
  private open = false;
  private index: number | null = null;
  private readonly listeners = new Set<MetaListener>();

  constructor(metaSlideCount: number) {
    this.metaSlideCount = metaSlideCount;
  }

  get isOpen(): boolean {
    return this.open;
  }

  get currentIndex(): number | null {
    return this.index;
  }

  /** Shows the meta slide at `index`. Does nothing if it's out of range (like a digit key with no slide behind it). */
  show(index: number, source: MetaSource = 'user'): void {
    if (index < 0 || index >= this.metaSlideCount) return;
    this.open = true;
    this.index = index;
    this.emit(source);
  }

  /** Closes the overlay. Does nothing if it's already closed. */
  close(source: MetaSource = 'user'): void {
    if (!this.open) return;
    this.open = false;
    this.emit(source);
  }

  onChange(listener: MetaListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(source: MetaSource): void {
    const snapshot: MetaSnapshot = { open: this.open, index: this.index, source };
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
