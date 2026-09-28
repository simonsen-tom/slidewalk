import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAction, resolveMetaDigit, type KeyModifiers } from './keyboard.js';

const noMods: KeyModifiers = { alt: false, ctrl: false, meta: false, shift: false };

test('arrow keys map to the expected navigation actions', () => {
  assert.equal(resolveAction('ArrowRight', noMods), 'next');
  assert.equal(resolveAction('PageDown', noMods), 'next');
  assert.equal(resolveAction('ArrowLeft', noMods), 'prev');
  assert.equal(resolveAction('PageUp', noMods), 'prev');
  assert.equal(resolveAction('ArrowUp', noMods), 'laneUp');
  assert.equal(resolveAction('ArrowDown', noMods), 'laneDown');
});

test('P toggles presenter mode, case-insensitively', () => {
  assert.equal(resolveAction('p', noMods), 'togglePresenter');
  assert.equal(resolveAction('P', { ...noMods, shift: true }), 'togglePresenter');
});

test('Alt/Ctrl/Meta-modified P does not toggle presenter mode', () => {
  assert.equal(resolveAction('p', { ...noMods, alt: true }), null);
  assert.equal(resolveAction('p', { ...noMods, ctrl: true }), null);
  assert.equal(resolveAction('p', { ...noMods, meta: true }), null);
});

test('T toggles theme, case-insensitively', () => {
  assert.equal(resolveAction('t', noMods), 'toggleTheme');
  assert.equal(resolveAction('T', { ...noMods, shift: true }), 'toggleTheme');
});

test('O toggles the overview grid, case-insensitively', () => {
  assert.equal(resolveAction('o', noMods), 'toggleOverview');
  assert.equal(resolveAction('O', { ...noMods, shift: true }), 'toggleOverview');
});

test('Enter confirms the overview selection', () => {
  assert.equal(resolveAction('Enter', noMods), 'confirm');
});

test('Escape closes the overview', () => {
  assert.equal(resolveAction('Escape', noMods), 'closeOverview');
});

test('Ctrl/Meta-modified keys never resolve to an action, to avoid stealing browser shortcuts', () => {
  assert.equal(resolveAction('ArrowRight', { ...noMods, ctrl: true }), null);
  assert.equal(resolveAction('t', { ...noMods, meta: true }), null);
  assert.equal(resolveAction('p', { ...noMods, alt: true, ctrl: true }), null);
  assert.equal(resolveAction('o', { ...noMods, ctrl: true }), null);
  assert.equal(resolveAction('Enter', { ...noMods, meta: true }), null);
  assert.equal(resolveAction('Escape', { ...noMods, ctrl: true }), null);
});

test('unrelated keys resolve to null', () => {
  assert.equal(resolveAction('a', noMods), null);
  assert.equal(resolveAction('Tab', noMods), null);
});

test('digits "1".."9" map to meta slots 0..8, and "0" maps to slot 9', () => {
  assert.equal(resolveMetaDigit('1', noMods), 0);
  assert.equal(resolveMetaDigit('2', noMods), 1);
  assert.equal(resolveMetaDigit('9', noMods), 8);
  assert.equal(resolveMetaDigit('0', noMods), 9);
});

test('resolveMetaDigit ignores non-digit keys', () => {
  assert.equal(resolveMetaDigit('a', noMods), null);
  assert.equal(resolveMetaDigit('Enter', noMods), null);
});

test('Alt/Ctrl/Meta-modified digits do not resolve, to avoid stealing browser shortcuts', () => {
  assert.equal(resolveMetaDigit('1', { ...noMods, alt: true }), null);
  assert.equal(resolveMetaDigit('1', { ...noMods, ctrl: true }), null);
  assert.equal(resolveMetaDigit('1', { ...noMods, meta: true }), null);
});
