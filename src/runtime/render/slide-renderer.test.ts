import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flairRevealedCount } from './slide-renderer.js';

test('flairRevealedCount reveals nothing before time starts', () => {
  assert.equal(flairRevealedCount(0, 500, 10), 0);
});

test('flairRevealedCount reveals everything once elapsed reaches the duration', () => {
  assert.equal(flairRevealedCount(500, 500, 10), 10);
});

test('flairRevealedCount reveals everything past the duration too', () => {
  assert.equal(flairRevealedCount(900, 500, 10), 10);
});

test('flairRevealedCount reveals a proportional count mid-animation', () => {
  assert.equal(flairRevealedCount(250, 500, 10), 5);
});

test('flairRevealedCount is 0 for an empty heading', () => {
  assert.equal(flairRevealedCount(250, 500, 0), 0);
});
