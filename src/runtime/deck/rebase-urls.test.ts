import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { isRelativeUrl, rebaseCssUrls, rebaseRelativeUrls, rebaseUrl } from './rebase-urls.js';

const BASE = new URL('http://localhost:8080/lanes/intro/01.md');
const doc = parseHTML('<!DOCTYPE html><html><body></body></html>').document as unknown as Document;

test('isRelativeUrl only accepts genuinely relative references', () => {
  for (const url of ['assets/a.png', './a.png', '../a.png', 'a b.png']) assert.equal(isRelativeUrl(url), true, url);
  for (const url of [
    '',
    '/a.png',
    '//cdn/a.png',
    'https://x/a.png',
    'data:image/png;base64,AA',
    'mailto:a@b',
    '#top',
    '?q=1',
  ]) {
    assert.equal(isRelativeUrl(url), false, url);
  }
});

test('rebaseUrl resolves relative paths against the slide file', () => {
  assert.equal(rebaseUrl('assets/a.png', BASE), '/lanes/intro/assets/a.png');
  assert.equal(rebaseUrl('./assets/a.png', BASE), '/lanes/intro/assets/a.png');
  assert.equal(rebaseUrl('../shared/logo.svg', BASE), '/lanes/shared/logo.svg');
  assert.equal(rebaseUrl('../../top.png', BASE), '/top.png');
  assert.equal(rebaseUrl('doc.pdf#page=2', BASE), '/lanes/intro/doc.pdf#page=2');
  assert.equal(rebaseUrl("it's here.jpg", BASE), "/lanes/intro/it's%20here.jpg");
});

test('rebaseUrl leaves non-relative URLs untouched', () => {
  for (const url of ['/root.png', 'https://example.com/a.png', '#anchor', 'data:image/png;base64,AA']) {
    assert.equal(rebaseUrl(url, BASE), url);
  }
});

test('rebaseCssUrls rewrites relative url() references, quoted or not', () => {
  assert.equal(
    rebaseCssUrls(
      `a { background: url(bg.jpg) } b { background: url('../x.png') } c { background: url("https://x/y.png") }`,
      BASE,
    ),
    `a { background: url(/lanes/intro/bg.jpg) } b { background: url('/lanes/x.png') } c { background: url("https://x/y.png") }`,
  );
});

test('rebaseRelativeUrls rewrites markdown images, raw HTML attributes, srcset, and inline/embedded CSS', () => {
  const html = [
    '<p><img src="assets/a.png" alt="a"></p>',
    '<video src="../media/v.mp4" poster="assets/poster.jpg"><source src="v.webm"></video>',
    '<img srcset="assets/a-1x.png 1x, assets/a-2x.png 2x">',
    '<a href="handout.pdf">handout</a> <a href="#notes">jump</a> <a href="https://example.com">ext</a>',
    '<div style="background-image: url(assets/bg.jpg)"></div>',
    '<style>.x { background: url("assets/bg.jpg") }</style>',
  ].join('');
  const box = doc.createElement('div');
  box.innerHTML = html;
  rebaseRelativeUrls(box, BASE);
  const out = box.innerHTML;
  assert.match(out, /<img src="\/lanes\/intro\/assets\/a.png" alt="a">/);
  assert.match(out, /src="\/lanes\/media\/v.mp4" poster="\/lanes\/intro\/assets\/poster.jpg"/);
  assert.match(out, /<source src="\/lanes\/intro\/v.webm">/);
  assert.match(out, /srcset="\/lanes\/intro\/assets\/a-1x.png 1x, \/lanes\/intro\/assets\/a-2x.png 2x"/);
  assert.match(out, /href="\/lanes\/intro\/handout.pdf"/);
  assert.match(out, /href="#notes"/);
  assert.match(out, /href="https:\/\/example.com"/);
  assert.match(out, /style="background-image: url\(\/lanes\/intro\/assets\/bg.jpg\)"/);
  assert.match(out, /url\("\/lanes\/intro\/assets\/bg.jpg"\)/);
});
