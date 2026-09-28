import type { Direction, SlideContent, ThemeName } from '../deck/model.js';
import { loadSlideContent } from '../deck/markdown.js';
import { scopeSlideStyles } from './scope-slide-styles.js';
import { buildBackgroundTapestry } from './background-tapestry.js';

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

const TRANSITION_DURATION_MS = 320;
const TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const TRANSITION_AXIS: Record<Direction, { axis: 'X' | 'Y'; sign: 1 | -1 }> = {
  right: { axis: 'X', sign: 1 },
  left: { axis: 'X', sign: -1 },
  down: { axis: 'Y', sign: 1 },
  up: { axis: 'Y', sign: -1 },
};

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** How many of a heading's characters should be revealed at a given point in the flair animation. */
export function flairRevealedCount(elapsedMs: number, durationMs: number, totalChars: number): number {
  return Math.min(totalChars, Math.max(0, Math.floor((elapsedMs / durationMs) * totalChars)));
}

interface FlairReveal {
  /** Kicks off the timed character-by-character reveal. */
  start(): void;
}

/**
 * Sets up the optional `flair-character` reveal. If the slide qualifies, it
 * swaps the <h1> to placeholder characters right away (synchronously). That
 * happens before the panel ever hits the DOM, so the real heading never gets
 * painted. You get null back if the slide has no flair-character, the user
 * prefers reduced motion, or there's no <h1> to animate. Call `.start()` on
 * the result when the reveal should actually play (right away, or once a
 * panel transition finishes).
 */
function prepareFlairReveal(panel: HTMLElement, slide: SlideContent): FlairReveal | null {
  if (!slide.flairCharacter || prefersReducedMotion()) return null;
  const h1Maybe = panel.querySelector('h1');
  if (!h1Maybe) return null;
  const h1: HTMLElement = h1Maybe; // re-bound so TypeScript's narrowing survives into the frame() closure below

  const finalHtml = h1.innerHTML;
  const chars = Array.from(h1.textContent ?? '');
  if (chars.length === 0) return null;

  const flairCharacter = slide.flairCharacter;
  const spans = chars.map(() => {
    const span = document.createElement('span');
    span.textContent = flairCharacter;
    return span;
  });
  h1.replaceChildren(...spans);

  return {
    start(): void {
      const startTime = performance.now();
      function frame(now: number): void {
        if (!panel.isConnected) return; // we navigated away mid-animation
        const revealed = flairRevealedCount(now - startTime, slide.flairDurationMs, chars.length);
        for (let i = 0; i < revealed; i += 1) {
          if (spans[i]!.textContent !== chars[i]) spans[i]!.textContent = chars[i]!;
        }
        if (revealed < chars.length) {
          requestAnimationFrame(frame);
        } else {
          h1.innerHTML = finalHtml; // puts back the exact original markup, inline formatting and all
        }
      }
      requestAnimationFrame(frame);
    },
  };
}

/** Animates the incoming panel sliding in from `direction` while the outgoing panel slides out the opposite way. */
async function animatePanelTransition(
  outgoing: HTMLElement,
  incoming: HTMLElement,
  direction: Direction,
): Promise<void> {
  const { axis, sign } = TRANSITION_AXIS[direction];
  const enter = `translate${axis}(${100 * sign}%)`;
  const exit = `translate${axis}(${-100 * sign}%)`;
  const center = 'translate(0, 0)';

  const incomingAnimation = incoming.animate([{ transform: enter }, { transform: center }], {
    duration: TRANSITION_DURATION_MS,
    easing: TRANSITION_EASING,
    fill: 'forwards',
  });
  const outgoingAnimation = outgoing.animate([{ transform: center }, { transform: exit }], {
    duration: TRANSITION_DURATION_MS,
    easing: TRANSITION_EASING,
    fill: 'forwards',
  });

  await Promise.all([incomingAnimation.finished, outgoingAnimation.finished]);

  try {
    incomingAnimation.commitStyles();
    incomingAnimation.cancel();
  } catch {
    // The element might already be detached if someone is navigating fast.
    // That's fine. The panel swap below leaves the DOM in the right state either way.
  }
}

/**
 * Mounts one slide at a time into a viewport element. Each slide gets its own
 * absolutely-positioned panel (see .sw-viewport / .sw-slide in base.css), so
 * the outgoing and incoming panels can slide past each other using the Web
 * Animations API. We use it for both the main stage and the presenter-mode
 * next-slide preview.
 */
export class SlideRenderer {
  private readonly viewportEl: HTMLElement;
  private currentPanel: HTMLElement | null = null;
  private currentNotesHtml: string | null = null;

  constructor(viewportEl: HTMLElement) {
    this.viewportEl = viewportEl;
    this.viewportEl.classList.add('sw-viewport');
  }

  /**
   * @param direction Which side the new slide should slide in from. Pass
   *   null or leave it out for an instant swap. That's what the very first
   *   render uses, and anywhere else we don't want animation (like the
   *   presenter preview).
   */
  async renderSlide(slide: SlideContent, theme: ThemeName, direction: Direction | null = null): Promise<void> {
    const panel = document.createElement('div');
    panel.className = 'sw-slide';
    panel.dataset.swTheme = theme;
    panel.dataset.slideId = slide.id;

    try {
      const content = await loadSlideContent(slide.src);
      panel.innerHTML = content.html;
      this.currentNotesHtml = content.notesHtml;
    } catch (error) {
      this.currentNotesHtml = null;
      const message = error instanceof Error ? error.message : String(error);
      panel.innerHTML = `<div class="sw-error">Couldn't load slide "${escapeHtml(slide.src)}": ${escapeHtml(message)}</div>`;
    }

    scopeSlideStyles(panel);

    // Swap in the placeholder characters (if this slide has flair) before the
    // panel hits the DOM, so the real heading never flashes up first.
    const flairReveal = prepareFlairReveal(panel, slide);

    if (slide.backgroundAnimationCharacter) {
      panel.prepend(buildBackgroundTapestry(slide.backgroundAnimationCharacter));
    }

    const outgoingPanel = this.currentPanel;
    this.viewportEl.appendChild(panel);
    this.currentPanel = panel;

    if (!outgoingPanel || !direction || prefersReducedMotion()) {
      outgoingPanel?.remove();
      flairReveal?.start();
      return;
    }

    await animatePanelTransition(outgoingPanel, panel, direction);
    outgoingPanel.remove();
    flairReveal?.start();
  }

  /** Updates just the current panel's theme attribute without re-rendering, so embedded videos and iframes don't restart. */
  setTheme(theme: ThemeName): void {
    if (this.currentPanel) {
      this.currentPanel.dataset.swTheme = theme;
    }
  }

  /** Removes the current panel and leaves the viewport empty (like when there's no next slide in the presenter preview). */
  clear(): void {
    this.currentPanel?.remove();
    this.currentPanel = null;
    this.currentNotesHtml = null;
  }

  getCurrentNotesHtml(): string | null {
    return this.currentNotesHtml;
  }
}
