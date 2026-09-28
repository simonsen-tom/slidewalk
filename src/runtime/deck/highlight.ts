/**
 * A tiny, dependency-free syntax highlighter for code blocks in slides.
 *
 * It turns code text into escaped HTML where interesting bits are wrapped in
 * `<span class="sw-tok-...">`. There are only five token types on purpose.
 * Fewer colors keep slides calm, and make it much easier to keep every color
 * at WCAG AAA contrast (see the --sw-code-* variables in styles/themes/).
 *
 * This isn't a real parser. Each language is a handful of regexes tried in
 * order at each position, so it can get odd edge cases wrong (like regex
 * literals in JS). For slide-sized snippets that's a fair trade for ~200
 * lines and zero dependencies.
 */

export type TokenType = 'comment' | 'keyword' | 'string' | 'number' | 'name';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch]!);
}

function token(type: TokenType | null, text: string): string {
  return type ? `<span class="sw-tok-${type}">${escapeHtml(text)}</span>` : escapeHtml(text);
}

/** A regex (must use the sticky `y` flag) plus either a token type or a function that renders the match itself. */
type Rule = [RegExp, TokenType | ((match: string) => string)];

/**
 * The shared scanner. At each position we try the rules in order and use the
 * first one that matches. If none do, we emit one plain character and move on,
 * so it always finishes and never loses text.
 */
function scan(code: string, rules: Rule[]): string {
  let out = '';
  let plain = '';
  let pos = 0;
  outer: while (pos < code.length) {
    for (const [re, kind] of rules) {
      re.lastIndex = pos;
      const match = re.exec(code);
      if (!match || match[0].length === 0) continue;
      out += escapeHtml(plain) + (typeof kind === 'function' ? kind(match[0]) : token(kind, match[0]));
      plain = '';
      pos += match[0].length;
      continue outer;
    }
    plain += code[pos];
    pos += 1;
  }
  return out + escapeHtml(plain);
}

// --- Shared bits ---------------------------------------------------------

const DOUBLE_QUOTED = /"(?:[^"\\\n]|\\.)*"?/y;
const SINGLE_QUOTED = /'(?:[^'\\\n]|\\.)*'?/y;
const BLOCK_COMMENT = /\/\*[\s\S]*?(?:\*\/|$)/y;

// --- JavaScript / TypeScript / JSON --------------------------------------

const JS_KEYWORDS = new Set(
  (
    'as async await break case catch class const continue debugger default delete do else enum export extends ' +
    'finally for from function get if implements import in instanceof interface let new of private protected ' +
    'public readonly return set static super switch this throw try type typeof var void while with yield ' +
    'any boolean never number string symbol unknown'
  ).split(' '),
);
const JS_LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const JS_RULES: Rule[] = [
  [/\/\/[^\n]*/y, 'comment'],
  [BLOCK_COMMENT, 'comment'],
  // A quoted string followed by a colon is an object/JSON key.
  [/"(?:[^"\\\n]|\\.)*"(?=\s*:)/y, 'name'],
  [DOUBLE_QUOTED, 'string'],
  [SINGLE_QUOTED, 'string'],
  [/`(?:[^`\\]|\\[\s\S])*`?/y, 'string'],
  [/(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)n?/y, 'number'],
  // After a dot it's a property access (like `obj.type`), never a keyword.
  [/(?<=\.)[A-Za-z_$][\w$]*/y, (word) => token(null, word)],
  // Whole words, so we never color digits in the middle of an identifier.
  [
    /[A-Za-z_$][\w$]*/y,
    (word) => token(JS_KEYWORDS.has(word) ? 'keyword' : JS_LITERALS.has(word) ? 'number' : null, word),
  ],
];

// --- Shell / Bash ----------------------------------------------------------

const SHELL_RULES: Rule[] = [
  [/(?<!\S)#[^\n]*/y, 'comment'],
  [/"(?:[^"\\]|\\[\s\S])*"?/y, 'string'],
  [/'[^']*'?/y, 'string'],
  [/\$\{[^}\n]*\}?|\$[\w@#?$!*-]+/y, 'keyword'],
  [/(?<!\S)--?[\w-]+/y, 'name'],
  // The first word of a command (at the start, or after a pipe, ;, && or a subshell) is the command itself.
  [/(?<=(?:^|[\n|;&(])[ \t]*)[\w./~+-]+/y, 'keyword'],
  [/[\w./~+:@%-]+/y, (word) => token(null, word)],
];

// --- HTML / XML --------------------------------------------------------------

/** Colors the inside of one tag: the tag name, attribute names and attribute values. */
function renderTag(tag: string): string {
  const rules: Rule[] = [
    [
      /<\/?[\w:.-]+/y,
      (name) => escapeHtml(name.startsWith('</') ? '</' : '<') + token('keyword', name.replace(/^<\/?/, '')),
    ],
    [/"[^"]*"?|'[^']*'?/y, 'string'],
    [/(?<==)[^\s"'=<>`]+/y, 'string'], // an unquoted attribute value, like class=big
    [/[^\s"'=<>/]+/y, 'name'],
  ];
  return scan(tag, rules);
}

const HTML_RULES: Rule[] = [
  [/<!--[\s\S]*?(?:-->|$)/y, 'comment'],
  [/<![A-Za-z][^>]*>?/y, 'keyword'],
  [/<\/?[A-Za-z][^<>]*>?/y, renderTag],
  [/&(?:#\d+|#x[\da-fA-F]+|\w+);/y, 'number'],
];

// --- CSS -----------------------------------------------------------------------

/**
 * CSS needs a little more context than a flat rule list. The same word means
 * different things in a selector (`a:hover {`) and in a declaration
 * (`color: red;`). So at the start of each chunk we peek ahead: if a `{` comes
 * before the next `;` or `}`, the chunk is a selector (or an at-rule prelude).
 * Otherwise it's a declaration.
 */
function highlightCss(code: string): string {
  const shared: Rule[] = [
    [BLOCK_COMMENT, 'comment'],
    [DOUBLE_QUOTED, 'string'],
    [SINGLE_QUOTED, 'string'],
    [/@[\w-]+/y, 'keyword'],
  ];
  const selectorRules: Rule[] = [...shared, [/[^\s{};,>+~()"'/]+/y, 'name']];

  function declarationRules(): Rule[] {
    // Only the first `word:` in a declaration is the property. After that we're in the value.
    let expectProperty = true;
    return [
      ...shared,
      [
        /[\w-]+(?=\s*:)/y,
        (word) => {
          const isProperty = expectProperty;
          expectProperty = false;
          return token(isProperty ? 'name' : null, word);
        },
      ],
      [/!important\b/y, 'keyword'],
      [/#[\da-fA-F]{3,8}\b/y, 'number'],
      [/-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/y, 'number'],
      [/[\w-]+/y, (word) => token(null, word)],
    ];
  }

  // Split into chunks that end right after a `{`, `;` or `}` (skipping over comments and strings).
  const chunkRe = /(?:\/\*[\s\S]*?(?:\*\/|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|[^{};"'/]|\/(?!\*))*[{};]?/y;
  let out = '';
  let pos = 0;
  while (pos < code.length) {
    chunkRe.lastIndex = pos;
    const chunk = chunkRe.exec(code)![0];
    if (chunk.length === 0) break; // shouldn't happen, but never loop forever
    pos += chunk.length;
    out += scan(chunk, chunk.endsWith('{') ? selectorRules : declarationRules());
  }
  return out;
}

// --- Public API --------------------------------------------------------------

const LANGUAGES: Record<string, (code: string) => string> = {};
for (const alias of ['js', 'javascript', 'mjs', 'cjs', 'jsx', 'ts', 'typescript', 'tsx', 'json', 'jsonc']) {
  LANGUAGES[alias] = (code) => scan(code, JS_RULES);
}
for (const alias of ['sh', 'bash', 'shell', 'zsh', 'console']) LANGUAGES[alias] = (code) => scan(code, SHELL_RULES);
for (const alias of ['html', 'xml', 'svg']) LANGUAGES[alias] = (code) => scan(code, HTML_RULES);
LANGUAGES['css'] = highlightCss;

/**
 * Highlights `code` as `lang` and returns escaped HTML with token spans.
 * Returns null if we don't know the language, so the caller can leave the
 * block exactly as it was.
 */
export function highlightCode(code: string, lang: string): string | null {
  const highlight = LANGUAGES[lang.trim().toLowerCase()];
  return highlight ? highlight(code) : null;
}

/**
 * Finds every `<pre><code class="language-...">` under `root` and highlights
 * it in place. That's exactly what marked produces for fenced code blocks,
 * and it works for hand-written HTML too. Every <pre> with a <code> inside
 * also gets the `sw-code` class, highlighted or not.
 */
export function highlightCodeBlocks(root: ParentNode): void {
  for (const codeEl of Array.from(root.querySelectorAll('pre > code'))) {
    codeEl.parentElement?.classList.add('sw-code');
    const lang = /(?:^|\s)language-(\S+)/.exec(codeEl.getAttribute('class') ?? '')?.[1];
    if (!lang) continue;
    const html = highlightCode(codeEl.textContent ?? '', lang);
    if (html !== null) codeEl.innerHTML = html;
  }
}
