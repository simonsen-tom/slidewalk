/**
 * Builds the optional "floating tapestry" background you get from the
 * `background-animation-character` attribute. It's lots of faint, gently
 * drifting copies of one character, sitting behind the slide's real content.
 */

export interface TapestryCharDescriptor {
  leftPct: number;
  topPct: number;
  sizeRem: number;
  driftXPct: number;
  driftYPct: number;
  rotateDeg: number;
  durationMs: number;
  delayMs: number;
  opacity: number;
}

export const TAPESTRY_CHARACTER_COUNT = 24;

const SIZE_MIN_REM = 1.25;
const SIZE_MAX_REM = 3.5;
const DURATION_MIN_MS = 1000;
const DURATION_MAX_MS = 5000;
const DRIFT_MIN_PCT = 10;
const DRIFT_MAX_PCT = 22;
const ROTATE_MIN_DEG = 12;
const ROTATE_MAX_DEG = 28;
const OPACITY_MIN = 0.08;
const OPACITY_MAX = 0.12;

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randSign(rng: () => number): 1 | -1 {
  return rng() < 0.5 ? -1 : 1;
}

/**
 * Pure generator for the tapestry's per-character layout, with an injectable
 * RNG. It stays DOM-free so we can unit test it directly (same idea as
 * flairRevealedCount in slide-renderer.ts).
 */
export function generateTapestryDescriptors(
  count: number = TAPESTRY_CHARACTER_COUNT,
  rng: () => number = Math.random,
): TapestryCharDescriptor[] {
  return Array.from({ length: count }, () => {
    const durationMs = randRange(rng, DURATION_MIN_MS, DURATION_MAX_MS);
    return {
      leftPct: randRange(rng, 0, 100),
      topPct: randRange(rng, 0, 100),
      sizeRem: randRange(rng, SIZE_MIN_REM, SIZE_MAX_REM),
      driftXPct: randRange(rng, DRIFT_MIN_PCT, DRIFT_MAX_PCT) * randSign(rng),
      driftYPct: randRange(rng, DRIFT_MIN_PCT, DRIFT_MAX_PCT) * randSign(rng),
      rotateDeg: randRange(rng, ROTATE_MIN_DEG, ROTATE_MAX_DEG) * randSign(rng),
      durationMs,
      // A negative delay means each character starts somewhere mid-cycle,
      // instead of them all moving in lockstep from the same pose on mount.
      delayMs: -randRange(rng, 0, durationMs),
      opacity: randRange(rng, OPACITY_MIN, OPACITY_MAX),
    };
  });
}

/**
 * Builds the `.sw-bg-tapestry` container with one `.sw-bg-tapestry-char` span
 * per descriptor. Each descriptor becomes inline CSS custom properties that
 * the @keyframes in base.css pick up. It's purely decorative.
 */
export function buildBackgroundTapestry(
  character: string,
  descriptors: TapestryCharDescriptor[] = generateTapestryDescriptors(),
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'sw-bg-tapestry';
  container.setAttribute('aria-hidden', 'true');

  for (const d of descriptors) {
    const span = document.createElement('span');
    span.className = 'sw-bg-tapestry-char';
    span.textContent = character;
    span.style.setProperty('--sw-tap-left', `${d.leftPct}%`);
    span.style.setProperty('--sw-tap-top', `${d.topPct}%`);
    span.style.setProperty('--sw-tap-size', `${d.sizeRem}rem`);
    span.style.setProperty('--sw-tap-dx', `${d.driftXPct}%`);
    span.style.setProperty('--sw-tap-dy', `${d.driftYPct}%`);
    span.style.setProperty('--sw-tap-rot', `${d.rotateDeg}deg`);
    span.style.setProperty('--sw-tap-dur', `${d.durationMs}ms`);
    span.style.setProperty('--sw-tap-delay', `${d.delayMs}ms`);
    span.style.setProperty('--sw-tap-op', `${d.opacity}`);
    container.appendChild(span);
  }

  return container;
}
