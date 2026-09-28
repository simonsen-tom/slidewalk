import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This runs from dist-test/src/runtime/styles/, so we step back up to the repo's src/ to read the real CSS.
const STYLES_DIR = fileURLToPath(new URL('../../../../src/runtime/styles/', import.meta.url));

/** WCAG AAA for normal-size text. */
const AAA = 7;

/** Pulls every `--sw-*: #hex` custom property out of the first rule block that `selector` starts. */
function readVars(file: string, selector: string): Record<string, string> {
  const css = readFileSync(STYLES_DIR + file, 'utf8');
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `couldn't find ${selector} in ${file}`);
  const block = css.slice(start, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/(--sw-[\w-]+):\s*(#[\da-fA-F]{6})\b/g)) vars[name!] = value!;
  return vars;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

test('contrast() matches known WCAG values', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#777777', '#777777'), 1);
  assert.equal(contrast('#1f0e33', '#ffffff').toFixed(2), '17.97');
});

for (const theme of ['light', 'dark']) {
  const vars = readVars(`themes/${theme}.css`, `.sw-slide[data-sw-theme='${theme}']`);

  test(`${theme} theme: body text and headings are AAA on the slide background`, () => {
    for (const name of ['--sw-fg', '--sw-h1', '--sw-h2', '--sw-h3', '--sw-h4', '--sw-h5', '--sw-h6']) {
      assert.ok(vars[name], `${name} is missing`);
      const ratio = contrast(vars[name]!, vars['--sw-bg']!);
      assert.ok(ratio >= AAA, `${name} ${vars[name]} is only ${ratio.toFixed(2)}:1 on ${vars['--sw-bg']}`);
    }
  });

  test(`${theme} theme: every code color is AAA on the code background`, () => {
    const codeColors = Object.keys(vars).filter((name) => name.startsWith('--sw-code-') && name !== '--sw-code-bg');
    assert.deepEqual(codeColors.sort(), [
      '--sw-code-comment',
      '--sw-code-fg',
      '--sw-code-keyword',
      '--sw-code-name',
      '--sw-code-number',
      '--sw-code-string',
    ]);
    for (const name of codeColors) {
      const ratio = contrast(vars[name]!, vars['--sw-code-bg']!);
      assert.ok(ratio >= AAA, `${name} ${vars[name]} is only ${ratio.toFixed(2)}:1 on ${vars['--sw-code-bg']}`);
    }
  });
}

test('the :root fallback in base.css matches the light theme', () => {
  const root = readVars('base.css', ':root');
  const light = readVars('themes/light.css', ".sw-slide[data-sw-theme='light']");
  for (const [name, value] of Object.entries(light)) {
    assert.equal(root[name], value, `${name} differs between base.css :root and the light theme`);
  }
});
