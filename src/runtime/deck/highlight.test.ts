import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { highlightCode, highlightCodeBlocks, type TokenType } from './highlight.js';

const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');

/** Every highlighted token as [type, text], in order, with HTML entities decoded. */
function tokens(html: string): [TokenType, string][] {
  const box = document.createElement('div');
  box.innerHTML = html;
  return Array.from(box.querySelectorAll('span')).map((span) => [
    span.className.replace('sw-tok-', '') as TokenType,
    span.textContent ?? '',
  ]);
}

function textOf(html: string): string {
  const box = document.createElement('div');
  box.innerHTML = html;
  return box.textContent ?? '';
}

function highlight(code: string, lang: string): string {
  const html = highlightCode(code, lang);
  assert.notEqual(html, null, `expected "${lang}" to be supported`);
  return html!;
}

test('unknown or empty languages come back as null', () => {
  assert.equal(highlightCode('print(1)', 'python'), null);
  assert.equal(highlightCode('x', ''), null);
});

test('language names are case-insensitive and aliases work', () => {
  for (const lang of ['JS', 'javascript', 'ts', 'TypeScript', 'json', 'css', 'HTML', 'xml', 'sh', 'bash', 'shell']) {
    assert.notEqual(highlightCode('x', lang), null, lang);
  }
});

test('JS: keywords, strings, numbers, literals and comments', () => {
  const html = highlight('const answer = 42; // the answer\nif (ok) return "yes";', 'js');
  assert.deepEqual(tokens(html), [
    ['keyword', 'const'],
    ['number', '42'],
    ['comment', '// the answer'],
    ['keyword', 'if'],
    ['keyword', 'return'],
    ['string', '"yes"'],
  ]);
});

test('JS: property access after a dot is never a keyword', () => {
  assert.deepEqual(tokens(highlight('obj.type = this.default;', 'ts')), [['keyword', 'this']]);
});

test('JS: digits inside identifiers are not numbers', () => {
  assert.deepEqual(tokens(highlight('h1 = x2;', 'js')), []);
});

test('JSON: keys are names, values keep their own types', () => {
  assert.deepEqual(tokens(highlight('{ "name": "deck", "count": 1.5e3, "ok": null }', 'json')), [
    ['name', '"name"'],
    ['string', '"deck"'],
    ['name', '"count"'],
    ['number', '1.5e3'],
    ['name', '"ok"'],
    ['number', 'null'],
  ]);
});

test('JS: template literals and block comments can span lines', () => {
  assert.deepEqual(tokens(highlight('/* a\nb */ `x\ny`', 'js')), [
    ['comment', '/* a\nb */'],
    ['string', '`x\ny`'],
  ]);
});

test('CSS: selectors and properties are names, values are numbers', () => {
  const html = highlight(
    ".sw-slide[data-slide-id='x'] {\n  --sw-bg: #fdf6e3;\n  margin: 0 1.5rem !important;\n}",
    'css',
  );
  assert.deepEqual(tokens(html), [
    ['name', '.sw-slide[data-slide-id='],
    ['string', "'x'"],
    ['name', ']'],
    ['name', '--sw-bg'],
    ['number', '#fdf6e3'],
    ['name', 'margin'],
    ['number', '0'],
    ['number', '1.5rem'],
    ['keyword', '!important'],
  ]);
});

test('CSS: a colon inside a comment or url() does not confuse the property', () => {
  const html = highlight('a { /* note: hi */ background: url(x:y.png); }', 'css');
  assert.deepEqual(tokens(html), [
    ['name', 'a'],
    ['comment', '/* note: hi */'],
    ['name', 'background'],
  ]);
});

test('CSS: at-rules and nested selectors', () => {
  const html = highlight('@media print { a:hover { color: red; } }', 'css');
  assert.deepEqual(tokens(html), [
    ['keyword', '@media'],
    ['name', 'print'],
    ['name', 'a:hover'],
    ['name', 'color'],
  ]);
});

test('HTML: tags, attributes, values, comments, doctype and entities', () => {
  const html = highlight('<!doctype html>\n<!-- hi -->\n<a href="x.html" class=big>Tom &amp; Jerry</a>', 'html');
  assert.deepEqual(tokens(html), [
    ['keyword', '<!doctype html>'],
    ['comment', '<!-- hi -->'],
    ['keyword', 'a'],
    ['name', 'href'],
    ['string', '"x.html"'],
    ['name', 'class'],
    ['string', 'big'],
    ['number', '&amp;'],
    ['keyword', 'a'],
  ]);
});

test('Shell: commands, flags, variables, strings and comments', () => {
  const html = highlight('npm --prefix ~/x start -- ./talk # go\necho "$HOME" && npx cz', 'bash');
  assert.deepEqual(tokens(html), [
    ['keyword', 'npm'],
    ['name', '--prefix'],
    ['name', '--'],
    ['comment', '# go'],
    ['keyword', 'echo'],
    ['string', '"$HOME"'],
    ['keyword', 'npx'],
  ]);
});

test('Shell: a # inside a word is not a comment', () => {
  assert.deepEqual(tokens(highlight('echo a#b', 'sh')), [['keyword', 'echo']]);
});

test('output is escaped and never loses or changes text', () => {
  const samples: [string, string][] = [
    ['if (a < b && c > "d") { x = \'<b>\'; }', 'js'],
    ['a::before { content: "<&>"; }', 'css'],
    ['<p title="a & b">1 < 2</p>', 'html'],
    ['echo "<tag>" > out.txt', 'bash'],
  ];
  for (const [code, lang] of samples) {
    const html = highlight(code, lang);
    assert.doesNotMatch(html.replace(/<\/?span[^>]*>/g, ''), /[<>]/, `raw < or > leaked for ${lang}`);
    assert.equal(textOf(html), code, lang);
  }
});

test('unterminated strings and comments finish without hanging', () => {
  for (const [code, lang] of [
    ['"open', 'js'],
    ['/* open', 'js'],
    ['`open', 'ts'],
    ['/* open', 'css'],
    ['a { color: "open', 'css'],
    ['<!-- open', 'html'],
    ['<a href="open', 'html'],
    ['echo "open', 'bash'],
  ]) {
    assert.equal(textOf(highlight(code!, lang!)), code, `${lang}: ${code}`);
  }
});

test('highlightCodeBlocks highlights fenced blocks and tags every <pre>', () => {
  const root = document.createElement('div');
  root.innerHTML = [
    '<pre><code class="language-js">const a = 1;</code></pre>',
    '<pre><code class="language-python">x = 1</code></pre>',
    '<pre><code>plain</code></pre>',
    '<p><code>inline</code></p>',
  ].join('');
  highlightCodeBlocks(root);
  const pres = root.querySelectorAll('pre');
  assert.equal(pres.length, 3);
  for (const pre of pres) assert.ok(pre.classList.contains('sw-code'));
  assert.match(pres[0]!.innerHTML, /<span class="sw-tok-keyword">const<\/span>/);
  assert.equal(pres[1]!.querySelector('code')!.innerHTML, 'x = 1');
  assert.equal(pres[2]!.querySelector('code')!.innerHTML, 'plain');
  assert.equal(root.querySelector('p')!.innerHTML, '<code>inline</code>');
});
