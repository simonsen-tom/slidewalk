import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MetaState } from './meta-state.js';

test('starts closed with no current index', () => {
  const meta = new MetaState(3);
  assert.equal(meta.isOpen, false);
  assert.equal(meta.currentIndex, null);
});

test('show() opens the overlay at the given index', () => {
  const meta = new MetaState(3);
  meta.show(1);
  assert.equal(meta.isOpen, true);
  assert.equal(meta.currentIndex, 1);
});

test('show() is a no-op for an out-of-range index', () => {
  const meta = new MetaState(2);
  const seen: unknown[] = [];
  meta.onChange((snapshot) => seen.push(snapshot));

  meta.show(2); // valid indices are 0-1
  meta.show(-1);

  assert.deepEqual(seen, []);
  assert.equal(meta.isOpen, false);
});

test('close() is a no-op when already closed', () => {
  const meta = new MetaState(3);
  const seen: unknown[] = [];
  meta.onChange((snapshot) => seen.push(snapshot));

  meta.close();

  assert.deepEqual(seen, []);
});

test('close() hides the overlay without changing the last shown index', () => {
  const meta = new MetaState(3);
  meta.show(2);
  meta.close();
  assert.equal(meta.isOpen, false);
  assert.equal(meta.currentIndex, 2);
});

test('source defaults to "user" and is passed through to listeners', () => {
  const meta = new MetaState(3);
  const sources: string[] = [];
  meta.onChange((snapshot) => sources.push(snapshot.source));

  meta.show(0);
  meta.show(1, 'remote');
  meta.close();
  meta.show(0);
  meta.close('remote');

  assert.deepEqual(sources, ['user', 'remote', 'user', 'user', 'remote']);
});

test('onChange returns an unsubscribe function', () => {
  const meta = new MetaState(3);
  let calls = 0;
  const unsubscribe = meta.onChange(() => {
    calls += 1;
  });

  meta.show(0);
  assert.equal(calls, 1);

  unsubscribe();
  meta.show(1);
  assert.equal(calls, 1);
});
