export type Action =
  | 'next'
  | 'prev'
  | 'laneUp'
  | 'laneDown'
  | 'togglePresenter'
  | 'toggleTheme'
  | 'toggleOverview'
  | 'confirm'
  | 'closeOverview';

export interface KeyModifiers {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

/**
 * Pure key -> action mapping. It's kept apart from the DOM event wiring so we
 * can unit test it with plain objects instead of real KeyboardEvents. It also
 * knows nothing about context (like whether the overview grid is open).
 * Anything mode-aware lives in main.ts's KeyActions wiring instead.
 *
 * Default bindings: ArrowRight/PageDown -> next, ArrowLeft/PageUp -> prev,
 * ArrowUp -> laneUp, ArrowDown -> laneDown, P -> togglePresenter,
 * T -> toggleTheme, O -> toggleOverview, Enter -> confirm, Escape -> closeOverview.
 * Digit keys are resolved separately, see resolveMetaDigit below.
 */
export function resolveAction(key: string, modifiers: KeyModifiers): Action | null {
  if (modifiers.alt || modifiers.ctrl || modifiers.meta) {
    return null;
  }
  switch (key) {
    case 'ArrowRight':
    case 'PageDown':
      return 'next';
    case 'ArrowLeft':
    case 'PageUp':
      return 'prev';
    case 'ArrowUp':
      return 'laneUp';
    case 'ArrowDown':
      return 'laneDown';
    case 'Enter':
      return 'confirm';
    case 'Escape':
      return 'closeOverview';
    default:
      if (key.toLowerCase() === 'p') return 'togglePresenter';
      if (key.toLowerCase() === 't') return 'toggleTheme';
      if (key.toLowerCase() === 'o') return 'toggleOverview';
      return null;
  }
}

/**
 * Pure digit-key -> meta-slot mapping. It lives apart from resolveAction
 * because it carries a payload (which slot), so it's not a plain
 * zero-argument action. 1st meta slide -> "1", ... 9th -> "9", 10th -> "0",
 * matching the common "1..9, 0" convention (e.g. browser tab switching).
 */
export function resolveMetaDigit(key: string, modifiers: KeyModifiers): number | null {
  if (modifiers.alt || modifiers.ctrl || modifiers.meta) {
    return null;
  }
  if (key === '0') return 9;
  if (key.length === 1 && key >= '1' && key <= '9') return key.charCodeAt(0) - '1'.charCodeAt(0);
  return null;
}

export interface KeyActions {
  next(): void;
  prev(): void;
  laneUp(): void;
  laneDown(): void;
  togglePresenter(): void;
  toggleTheme(): void;
  toggleOverview(): void;
  confirm(): void;
  closeOverview(): void;
  showMeta(index: number): void;
}

export function installKeyboardHandler(target: Window, actions: KeyActions): () => void {
  const handler = (event: KeyboardEvent) => {
    const modifiers: KeyModifiers = {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey,
    };

    const metaDigit = resolveMetaDigit(event.key, modifiers);
    if (metaDigit !== null) {
      event.preventDefault();
      actions.showMeta(metaDigit);
      return;
    }

    const action = resolveAction(event.key, modifiers);
    if (!action) return;
    event.preventDefault();
    actions[action]();
  };

  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
