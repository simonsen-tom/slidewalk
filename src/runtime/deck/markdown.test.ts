import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marked } from 'marked';
import { parseHTML } from 'linkedom';
import { renderMarkdown, splitNotes } from './markdown.js';

test('splitNotes extracts a trailing single-line notes comment', () => {
  const raw = '# Hello\n\nBody text.\n\n<!-- notes\nSpeaker notes here.\n-->';
  const { body, notes } = splitNotes(raw);
  assert.equal(body, '# Hello\n\nBody text.');
  assert.equal(notes, 'Speaker notes here.');
});

test('splitNotes extracts a multi-line notes comment with markdown inside', () => {
  const raw = ['# Title', '', 'Body.', '', '<!-- notes', 'Line one.', '', '*Line two, emphasized.*', '-->'].join('\n');
  const { body, notes } = splitNotes(raw);
  assert.equal(body, '# Title\n\nBody.');
  assert.equal(notes, 'Line one.\n\n*Line two, emphasized.*');
});

test('splitNotes returns notes: null when no comment is present', () => {
  const raw = '# Hello\n\nJust body text, no notes.';
  const { body, notes } = splitNotes(raw);
  assert.equal(body, raw);
  assert.equal(notes, null);
});

test('splitNotes ignores a non-trailing HTML comment (not end-anchored)', () => {
  const raw = '# Hello\n\n<!-- notes\nnot at the end\n-->\n\nMore body after.';
  const { body, notes } = splitNotes(raw);
  assert.equal(body, raw);
  assert.equal(notes, null);
});

test('splitNotes treats an empty notes block as no notes', () => {
  const raw = '# Hello\n\n<!-- notes\n\n-->';
  const { body, notes } = splitNotes(raw);
  assert.equal(body, '# Hello');
  assert.equal(notes, null);
});

test('marked renders headings and images from slide markdown', () => {
  const html = marked.parse('# Title\n\n![alt text](./diagram.png)') as string;
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<img src="\.\/diagram\.png" alt="alt text">/);
});

test('marked passes raw HTML through untouched (no sanitizer)', () => {
  const html = marked.parse('<video src="./demo.mp4" controls></video>') as string;
  assert.match(html, /<video src="\.\/demo\.mp4" controls><\/video>/);
});

test('renderMarkdown rebases relative URLs and highlights fenced code in one pass', () => {
  const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');
  const markdown = ['![map](assets/map.png)', '', '```css', 'a { color: red; }', '```'].join('\n');
  const html = renderMarkdown(markdown, new URL('http://localhost/lane/01.md'), () => document.createElement('div'));
  assert.match(html, /<img src="\/lane\/assets\/map.png" alt="map">/);
  assert.match(html, /<pre class="sw-code"><code class="language-css"><span class="sw-tok-name">a<\/span>/);
});
