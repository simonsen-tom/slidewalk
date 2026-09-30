# Slidewalk

[![CI](https://github.com/simonsen-tom/slidewalk/actions/workflows/ci.yml/badge.svg)](https://github.com/simonsen-tom/slidewalk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small web app for presenting markdown slide decks. Instead of one long line
of slides, your deck is a 2D grid: **lanes** are parallel tracks, and
**slides** run in order within each lane.

It's built to be as "pure web" as possible: native HTML/CSS/JS in the browser
(Web Components, CSS custom properties, `BroadcastChannel`, native ES
modules), with TypeScript only for authoring, compiled by plain `tsc`. No
bundler. There are just two runtime dependencies, on purpose:
[`marked`](https://github.com/markedjs/marked) renders the markdown, and
[`sirv`](https://github.com/lukeed/sirv) serves static files with proper HTTP
Range support (so `<video>` seeking works).

## Requirements

- Node.js 24 or newer. This repo pins **v24** in `.nvmrc`, so run `nvm use`
  or `fnm use` before you start.

## Setup

```bash
npm install
```

## Running a presentation

Point `npm start` at a folder with your deck in it. That's an `index.html`
plus its markdown and asset files (see [Authoring a deck](#authoring-a-deck)
below):

```bash
npm start -- examples/hello-deck
```

This builds the app and starts a local server (by default on
`http://localhost:8080`). Open that URL in a browser and you're presenting.

Options:

```bash
npm start -- <deck-folder> [--port <number>] [--host <address>]
```

Your deck folder can live anywhere on disk. It doesn't have to be inside this
repo. A relative `<deck-folder>` is resolved from the directory you run the
command in, so from any folder you can do either of these:

```bash
npm --prefix ~/path/to/slidewalk start -- ./my-talk   # no install needed
slidewalk ./my-talk                                   # after a one-time `npm run build && npm link` in this repo
```

The deck folder becomes the server's web root. That means everything your
deck uses (markdown files, images, video) has to live inside that folder.

Want to try it without making a deck first? `examples/hello-deck/` is a
small working deck in this repo. It has two lanes, a mix of light and dark
slides, a meta slide, speaker notes, and a custom `theme.css`.

### Keyboard shortcuts

| Key               | Action                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `→` / `Page Down` | Next slide in the current lane                                                               |
| `←` / `Page Up`   | Previous slide in the current lane                                                           |
| `↓`               | Switch to the next lane, landing on its first slide                                          |
| `↑`               | Switch to the previous lane, landing on its first slide                                      |
| `P`               | Toggle presenter mode (just in this window)                                                  |
| `T`               | Toggle the deck's default light/dark theme                                                   |
| `O`               | Toggle the zoomed-out overview grid                                                          |
| `1`-`9`, `0`      | Show meta slide 1-9, or the 10th one (`0`). See [Meta slides](#meta-slides).                 |
| `Enter`           | _(overview only)_ Jump to the selected slide and close the overview                          |
| `Escape`          | Close whichever overlay is open. That's the meta slide if one is showing, else the overview. |

Navigation stops at the edges of the deck. It doesn't wrap around. Open the
same URL in a second browser window to get synced audience and presenter
views. See [Presenter mode & multi-window sync](#presenter-mode--multi-window-sync).

### Overview grid

Press `O` to zoom out to a grid with every slide in the deck. There's one
row per lane, with the lane name on the left and each slide shown as a live
thumbnail. The arrow keys move a selection around the grid, stopping at the
edges just like normal navigation. `Enter` (or clicking a thumbnail) jumps
the presentation there and closes the grid. `Escape` (or pressing `O` again)
closes it without changing your current slide.

### Meta slides

You can put up to 10 slides in a single `<slidewalk-meta>` block. They're
for reference stuff you want on hand at any point in a talk, without it
being part of the lane/slide flow. Think a map, a diagram, or contact info.

You can't reach them with the arrow keys or the overview grid. Each one has
a number key instead. The 1st `<slidewalk-slide>` inside `<slidewalk-meta>`
is `1`, the 2nd is `2`, and so on up to the 9th on `9`, with the 10th on
`0`. Press a key and that slide shows up full-screen. `Escape` hides it
again and you're right back where you were. Your lane/slide position never
actually changes while a meta slide is up. Opening a meta slide closes the
overview grid if it's open, and vice versa. Only one full-screen overlay
shows at a time.

Unlike presenter mode and the overview grid, **meta slides are synced
across windows** (see
[Presenter mode & multi-window sync](#presenter-mode--multi-window-sync)).
Press a number key in one window and the slide shows up in every synced
window, including the one your audience sees. A newly opened window also
picks up whatever meta slide the others already have open.

```html
<slidewalk-meta>
  <slidewalk-slide src="meta/map.md"></slidewalk-slide>
</slidewalk-meta>
```

## Development

```bash
npm run watch   # tsc --watch plus a CSS/vendor-asset watcher, side by side
npm test        # runs the unit tests
npm run build   # one-off build (tsc, then copy CSS/vendor assets into dist/)
npm run format  # format everything with Prettier (format:check only checks)
npm run all     # format, build, then test
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/),
like `feat: ...`, `fix(runtime): ...` or `docs: ...`. Stage your changes and
run `npx cz` for a guided prompt that writes the message for you. There's
also a `commit-msg` git hook (husky sets it up when you run `npm install`)
that runs commitlint on every commit. So a message that doesn't follow the
format gets rejected, however you commit.

While you're working, run `npm run watch` in one terminal and
`npm start -- <deck>` in another. Editing **deck content** (markdown,
`index.html`, images, video) never needs a rebuild. The server reads
straight from disk. Editing the **app's own** TypeScript or CSS under
`src/runtime/` gets picked up by `npm run watch` automatically.
(`scripts/dev-watch.mjs` runs `tsc --watch` and `scripts/watch-styles.mjs`
together. The second one re-copies `src/runtime/styles/` into
`dist/runtime/` whenever something changes.) Either way, the dev server
reloads your browser for you when a file changes.

### Tests

```bash
npm test
```

Tests run on Node's built-in [`node:test`](https://nodejs.org/api/test.html)
runner, so there's no test framework to install. Each test file sits right
next to the module it covers as `*.test.ts` (for example
`src/runtime/state/navigation.test.ts`). They compile separately from the
app (`tsconfig.test.json` → `dist-test/`), so test code never ends up in
what browsers load. Tests that need a DOM, like the deck parser's, use
[`linkedom`](https://github.com/WebReflection/linkedom). It's a lightweight
DOM that runs inside Node, so we don't need a real browser.

## Authoring a deck

A deck is a folder with an `index.html` that describes its structure, plus
the markdown files and assets it uses (referenced by relative path).

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My Deck</title>
    <link rel="stylesheet" href="/__slidewalk__/styles/base.css" />
    <link rel="stylesheet" href="/__slidewalk__/styles/themes/light.css" />
    <link rel="stylesheet" href="/__slidewalk__/styles/themes/dark.css" />
    <link rel="stylesheet" href="/__slidewalk__/styles/presenter.css" />
    <link rel="stylesheet" href="/__slidewalk__/styles/overview.css" />
    <link rel="stylesheet" href="/__slidewalk__/styles/meta.css" />
    <!-- Optional. See Theming below. -->
    <link rel="stylesheet" href="theme.css" />
  </head>
  <body>
    <slidewalk-deck default-theme="light" title="My Deck">
      <slidewalk-lane id="main" label="Main Track">
        <slidewalk-slide src="slides/intro.md"></slidewalk-slide>
        <slidewalk-slide src="slides/details.md" theme="dark"></slidewalk-slide>
      </slidewalk-lane>
      <slidewalk-lane id="deep-dive" label="Deep Dive">
        <slidewalk-slide src="slides/deep-1.md"></slidewalk-slide>
      </slidewalk-lane>
    </slidewalk-deck>

    <script type="module" src="/__slidewalk__/main.js"></script>
  </body>
</html>
```

The `/__slidewalk__/...` paths come from the app itself, not from your deck
folder. The server serves its own compiled runtime under that reserved
prefix, so your deck only ever needs your own content. Just **don't** name a
top-level folder in your deck `__slidewalk__`. That prefix always wins.

**Elements & attributes:**

- `<slidewalk-deck>`: `default-theme` (`light` or `dark`, optional, defaults
  to `light`) and `title` (informational).
- `<slidewalk-lane>`: `id` (required and unique. The order in the document
  is the up/down order) and `label` (optional, shown in the presenter
  panel).
- `<slidewalk-slide>`:
  - `src` (required): path to a markdown file, relative to `index.html`. Any
    subfolder layout works.
  - `theme` (optional): `light` or `dark`, to override the theme for just
    this slide.
  - `id` (optional): generated for you if you leave it out.
  - `flair-character` (optional): any single character or emoji. See
    "Heading flair" below.
  - `flair-duration` (optional): milliseconds, defaults to `500`. Only does
    anything together with `flair-character`.
  - `background-animation-character` (optional): any single character or
    emoji. See "Background tapestry" below.
- `<slidewalk-meta>`: at most one per deck, as a direct child of
  `<slidewalk-deck>` (next to the `<slidewalk-lane>`s, not inside one). It
  holds up to 10 `<slidewalk-slide>` children with the same attributes as
  above. You show and hide them with number keys instead of navigating. See
  [Meta slides](#meta-slides).

### Heading flair

Set `flair-character` on a `<slidewalk-slide>` and the slide's `<h1>`
animates in. Every character starts out as the flair character, and then
the real ones appear left to right over `flair-duration` milliseconds
(`500` by default). It's purely cosmetic and opt-in, so slides without
`flair-character` look exactly the same as before. The slide's markdown
needs to have an `<h1>` for this to work. If someone prefers reduced motion
(`prefers-reduced-motion`), the real heading just shows up right away.

```markdown
<slidewalk-slide src="slides/intro.md" flair-character="⚡" flair-duration="800"></slidewalk-slide>
```

### Background tapestry

Set `background-animation-character` on a `<slidewalk-slide>` and you get
lots of faint, slowly drifting copies of that character behind the slide's
content. It's purely decorative and opt-in, so slides without it look
exactly the same as before. With `prefers-reduced-motion`, the tapestry
still shows up but stays still.

```markdown
<slidewalk-slide src="slides/intro.md" background-animation-character="✦"></slidewalk-slide>
```

A deck needs at least one lane, and every lane needs at least one slide. If
something's wrong with the deck, you get a full-page error explaining what
happened instead of a blank screen.

### Slide markdown

Slides are rendered with `marked`, with **raw HTML allowed and no
sanitizer**. Decks are meant to run locally and be trusted, so feel free to
mix markdown and HTML in the same file:

```markdown
# A Slide

Some **markdown** text, an image, and an embedded video.

![a diagram](../assets/diagram.png)

<video src="../assets/demo.mp4" controls></video>
```

**Relative paths inside a slide are relative to that markdown file**, not to
`index.html`. So a slide at `lanes/travel/01.md` can use `assets/photo.jpg`
to mean `lanes/travel/assets/photo.jpg`, or `../shared/logo.svg` to mean
`lanes/shared/logo.svg`. This works for markdown images and links, for
`src`, `href`, `poster`, `srcset` and `data` attributes in raw HTML, and for
`url(...)` in `style` attributes and `<style>` blocks. It works the same
way in speaker notes. Paths starting with `/` are relative to the deck
folder. Full URLs (`https:`, `data:`, ...) and `#fragment` links are left
alone.

**Speaker notes** go in an HTML comment at the very end of the file. They're
stripped out before the slide renders, only show up in presenter mode, and
can use markdown too:

```markdown
# A Slide

Slide content here.

<!-- notes
These notes only show up in presenter mode, and can use *markdown* too.
-->
```

### Code blocks

Fenced code blocks get syntax highlighting, with no extra dependencies. Tag
the block with its language:

````markdown
```css
.sw-slide {
  --sw-bg: #fdf6e3;
}
```
````

These languages are supported (aliases in brackets):

- JavaScript, TypeScript and JSON (`js`, `javascript`, `mjs`, `cjs`, `jsx`,
  `ts`, `typescript`, `tsx`, `json`, `jsonc`)
- CSS (`css`)
- HTML and XML (`html`, `xml`, `svg`)
- Shell (`sh`, `bash`, `shell`, `zsh`, `console`)

Any other language, or a block with no language, still gets the code box
styling, just without colors. Hand-written `<pre><code class="language-js">`
in raw HTML gets highlighted too, and so does code in speaker notes.

The highlighter is a small set of regex rules per language
(`src/runtime/deck/highlight.ts`), not a full parser. So it can trip over
unusual syntax (like regex literals in JS), but it's plenty for
slide-sized snippets. It uses just five token colors, and every one of them
is WCAG AAA (at least 7:1) on the code background in both built-in themes.
A test (`src/runtime/styles/contrast.test.ts`) checks that, so a color
tweak that breaks it fails `npm test`.

### Theming

Ten CSS custom properties control a slide's colors: `--sw-bg`, `--sw-fg`,
`--sw-h1` to `--sw-h6` (one color per heading level), and `--sw-link` plus
`--sw-link-hover` for links. The built-in `light` and `dark` themes live in
`src/runtime/styles/themes/`.

Links are always underlined, whatever their color. A link color that's AAA
on the slide background can't look all that different from body text, so
the underline is what really tells people it's a link. Keyboard focus gets
an outline in `--sw-link`.

Code gets seven more. `--sw-code-bg` is the code box background, and
`--sw-code-fg` is plain code text. Then there's one per token type:
`--sw-code-comment`, `--sw-code-keyword`, `--sw-code-string`,
`--sw-code-number` and `--sw-code-name`. Code sits on its own background on
purpose. That way the token colors stay readable even when you change a
slide's `--sw-bg`. If you override the code colors, checking their contrast
is up to you. A contrast checker like WebAIM's is handy for that.

To change them, put a `theme.css` next to your deck's `index.html` and link
it **after** the built-in stylesheets, so it wins:

```html
<head>
  <!-- ...the built-in /__slidewalk__/ stylesheets first... -->
  <link rel="stylesheet" href="/__slidewalk__/styles/meta.css" />
  <!-- ...then yours -->
  <link rel="stylesheet" href="theme.css" />
</head>
```

Every slide is rendered as a `.sw-slide` element, wherever it shows up (main
stage, presenter preview, overview grid, meta slide). It carries
`data-sw-theme` (the theme it ended up with) and `data-slide-id` (its `id`
from `index.html`). So these three selectors cover everything:

```css
/* every slide currently showing the light theme */
.sw-slide[data-sw-theme='light'] {
  --sw-bg: #f8fafc;
  --sw-h1: #0f766e;
}

/* every slide currently showing the dark theme */
.sw-slide[data-sw-theme='dark'] {
  --sw-h2: #ffcc00;
}

/* one slide, whatever theme it ends up with */
.sw-slide[data-slide-id='closer'] {
  --sw-bg: #000;
}
```

Combine the two to give one slide its own theme, with a light and a dark
version. Pressing `T` then switches between your two palettes (as long as
the slide doesn't have a fixed `theme="..."` in `index.html`):

```css
.sw-slide[data-slide-id='intro'][data-sw-theme='light'] {
  --sw-bg: #fdf6e3;
  --sw-fg: #2b2118;
}
.sw-slide[data-slide-id='intro'][data-sw-theme='dark'] {
  --sw-bg: #1e1812;
  --sw-fg: #f7ecd8;
}
```

`examples/hello-deck/theme.css` is a good starting point. It lists every
variable with comments, and the deck's "Make it yours" slide shows a
per-slide theme with light and dark versions (press `T` on it). Edits to `theme.css` live-reload like any other
deck file. (A `<style>` block in `index.html` works exactly the same way, if
you'd rather keep it all in one file.)

Pressing `T` only toggles the deck's _default_ theme. Slides with their own
`theme="dark"` or `theme="light"` attribute never change.

The overview grid (`O`) isn't a `.sw-slide`. One row can mix light and dark
thumbnails, so it can't follow any single slide's theme. Instead, two of its
own colors follow the deck's live _default_ theme: `--sw-overview-label`
(the lane name color) and `--sw-overview-accent` (the outline on the
selected thumbnail). Their fallback values are in `styles/base.css`, and
each theme sets its own in `styles/themes/{light,dark}.css` via
`#sw-overview[data-sw-theme="..."]`. Pressing `T` updates them right away,
just like the ten slide variables. You can override them the same way,
for example in `theme.css`:

```css
#sw-overview[data-sw-theme='dark'] {
  --sw-overview-accent: #ff6b6b;
}
```

### Presenter mode & multi-window sync

Open the same deck URL in two browser windows (say, one on your laptop and
one on the projector). Navigate in either window and the other follows
along in real time, using the browser's built-in `BroadcastChannel` API.
There's no server round-trip, and it works with more than two windows too.
A newly opened window jumps to wherever the others already are.

`P` toggles presenter mode **separately in each window**. So one window can
show the presenter view while the other stays in plain audience mode.
Presenter mode shows the current slide's speaker notes, an elapsed timer
(it starts the first time you open presenter mode and keeps running), a
preview of the next slide in the current lane, and a "Lane · N of M"
readout.

Normally sync only covers your position. [Meta slides](#meta-slides) are
the one exception: showing or hiding one syncs across windows too, while
presenter mode and the overview grid never do.

## Codebase overview

```
src/
  server/            Node side: the CLI and the static file server
  runtime/           Everything compiled and served to the browser
scripts/             Build-time Node scripts (asset copying/vendoring)
examples/hello-deck/ A small working sample deck
```

### `src/server/`: the Node CLI and static server

| File             | What it does                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cli.ts`         | Entry point (the `slidewalk` bin). Parses argv (`<deck-folder>`, `--port`, `--host`), checks the deck folder exists and has an `index.html`, then starts the server.                 |
| `server.ts`      | Two [`sirv`](https://github.com/lukeed/sirv) static mounts plus one routing check. Requests under `/__slidewalk__/` get the app's own compiled runtime. Everything else is the deck. |
| `live-reload.ts` | The `/__slidewalk__/livereload` SSE endpoint. Watches the deck and runtime folders and tells connected browsers to reload when something changes.                                    |
| `constants.ts`   | Shared constants (`RESERVED_PREFIX`, default port and host).                                                                                                                         |

### `src/runtime/`: everything that runs in the browser

| Path                                           | What it does                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`                                      | Gets the app going. Parses the deck DOM, wires up navigation, themes, presenter sync and the keyboard, renders the first slide, and restores your position from the URL hash.                                                                                                    |
| `deck/model.ts`                                | Core types (`Deck`, `Lane`, `Slide`, `MetaSlide`, `Position`) and a few small, pure lookup helpers.                                                                                                                                                                              |
| `deck/parser.ts`                               | Reads the `<slidewalk-deck>` markup into a `Deck` model and checks its structure (unique ids, no empty lanes, and so on).                                                                                                                                                        |
| `deck/markdown.ts`                             | Fetches a slide's `.md` file, splits off the trailing `<!-- notes -->` comment, renders both through `marked`, and caches the result per slide `src`.                                                                                                                            |
| `deck/highlight.ts`                            | The built-in syntax highlighter. Small per-language regex rules wrap code tokens in `sw-tok-*` spans for fenced code blocks.                                                                                                                                                     |
| `deck/rebase-urls.ts`                          | Rewrites relative URLs in a rendered slide so they point at files next to the `.md`, not next to `index.html`.                                                                                                                                                                   |
| `state/navigation.ts`                          | `NavigationController`: the 2D grid navigation logic (next/prev/laneUp/laneDown, stopping at the edges). Switching lanes always lands on the first slide. Every change is tagged with a `source` (`user`, `remote` or `init`) so the sync code can tell local input from remote. |
| `state/presenter-state.ts`                     | A tiny per-window on/off flag for presenter mode. It's deliberately not connected to the sync module. That's what keeps presenter mode separate in each window.                                                                                                                  |
| `state/overview-state.ts`                      | `OverviewState`: a local (not synced) open/closed flag plus a selection cursor for the overview grid. The cursor moves with the same `stepPosition` helper as `NavigationController`, so it stops at the edges the same way.                                                     |
| `state/meta-state.ts`                          | `MetaState`: an open/closed flag plus which meta slot is showing. Like `NavigationController`, changes are tagged with a `source` (`user` or `remote`), since this one is synced across windows.                                                                                 |
| `sync/broadcast.ts`                            | `PresenterSync`: the cross-window `BroadcastChannel` protocol. It sends out your position and meta-overlay changes, applies the ones coming in, and handles the "where is everyone?" handshake when a new window opens.                                                          |
| `sync/live-reload.ts`                          | Listens to the dev server's live-reload endpoint and reloads the page when files change.                                                                                                                                                                                         |
| `theme/theme.ts`                               | `ThemeController`: tracks the deck's current default theme and works out each slide's actual theme. A slide's own `theme` attribute always beats the toggle.                                                                                                                     |
| `input/keyboard.ts`                            | The key-to-action mapping. The pure `resolveAction()` and `resolveMetaDigit()` functions can be tested without a browser. Plus the `keydown` listener that hooks them up.                                                                                                        |
| `render/slide-renderer.ts`                     | Mounts one slide's HTML into a stage element and tags it with its theme (`data-sw-theme`). Used for the main stage, the presenter-mode next-slide preview, and the meta-slide overlay.                                                                                           |
| `render/scope-slide-styles.ts`                 | Wraps any `<style>` in a slide's markdown in CSS `@scope`, so it only affects that slide.                                                                                                                                                                                        |
| `render/background-tapestry.ts`                | Builds the optional floating background from `background-animation-character`. It's a pure layout generator (with an injectable RNG) plus a DOM builder that `slide-renderer.ts` uses.                                                                                           |
| `render/presenter-view.ts`                     | Builds and updates the presenter panel: notes, elapsed timer, next-slide preview, and lane/index readout.                                                                                                                                                                        |
| `render/overview-view.ts`                      | Builds, shows and hides the zoomed-out overview grid. One row per lane, one live thumbnail per slide (rendered the first time you open it, then just shown or hidden), plus selection highlighting and click-to-jump.                                                            |
| `render/meta-view.ts`                          | Shows and hides the meta-slide overlay. The actual slide mounting is handed off to its own `SlideRenderer`.                                                                                                                                                                      |
| `elements/slidewalk-{deck,lane,slide,meta}.ts` | Inert custom element registrations for `<slidewalk-deck>`, `<slidewalk-lane>`, `<slidewalk-slide>` and `<slidewalk-meta>`. They just stop "unknown element" warnings. The real parsing happens in `deck/parser.ts` with plain DOM queries.                                       |
| `vendor/marked.d.ts`                           | Hand-written types for the vendored copy of `marked` (more on that below).                                                                                                                                                                                                       |
| `styles/base.css`                              | Layout, slide typography, the presenter-mode grid, and error states.                                                                                                                                                                                                             |
| `styles/themes/{light,dark}.css`               | The CSS custom property values for the two built-in themes.                                                                                                                                                                                                                      |
| `styles/presenter.css`                         | Presenter panel styling (notes, timer, preview, readout).                                                                                                                                                                                                                        |
| `styles/overview.css`                          | The overview grid overlay, lane rows and labels, and the thumbnail trick: a fixed 960×540 "virtual slide" scaled down with a CSS `transform`, so thumbnails reuse the real `.sw-slide` and theme rules.                                                                          |
| `styles/meta.css`                              | The full-screen overlay for whichever meta slide is showing.                                                                                                                                                                                                                     |

### `scripts/`: build-time only, never shipped

- `copy-assets.mjs`: after `tsc` runs, this copies `src/runtime/styles/` and
  a vendored copy of `marked` (`node_modules/marked/lib/marked.esm.js`) into
  `dist/runtime/`. Why vendor it? Browsers can't resolve a bare
  `import ... from 'marked'` on their own, and we don't want an import map
  in every deck's `index.html`. So `deck/markdown.ts` imports it from a
  relative path (`../vendor/marked.js`) instead, and this script makes sure
  that file actually exists.
- `copy-test-vendor.mjs`: the same vendoring step, but into `dist-test/`, so
  the tests can import the real `marked` too.
- `watch-styles.mjs`: re-runs `copyAssets()` (from `copy-assets.mjs`)
  whenever anything under `src/runtime/styles/` changes. It's debounced, so
  one save doesn't trigger a pile of copies.
- `dev-watch.mjs`: the `npm run watch` entry point. It runs `tsc --watch` and
  `watch-styles.mjs` side by side as child processes, and Ctrl+C stops both.

### Build output (gitignored)

- `dist/`: the app as served to browsers, plus the `slidewalk` CLI
  (`npm run build` / `npm start`).
- `dist-test/`: compiled test files. `npm test` runs them, and they're never
  served.

## Known v1 limitations

- The presenter-mode next-slide preview mounts the next slide's real HTML.
  So an embedded `<video>` or `<iframe>` on that slide also mounts (and
  might autoplay or start loading) in the preview.
- `npm start` doesn't open a browser for you.
- If a slide fails to load (say, a typo in `src`), you get an error message
  on that slide instead of the whole app crashing.
- Overview thumbnails are built once per page load. They don't re-theme if
  you toggle the deck's default theme afterwards (same as the presenter-mode
  preview).
- The floating background (`background-animation-character`) doesn't show
  up on overview thumbnails. Same reasoning as the video issue above, plus
  we'd rather not run lots of animations at once while the grid is open. It
  does show up in the presenter-mode next-slide preview.
- With `prefers-reduced-motion: reduce`, the tapestry shows up as a still
  layer instead of disappearing completely.
- Overview thumbnails mount the real slide HTML too, so embedded `<video>`
  and `<iframe>` elements mount there as well (same as the presenter-mode
  preview).
- Nothing on screen tells you how many meta slides a deck has or which
  number keys are in use. You need to know your own deck. Pressing a number
  with no meta slide behind it (like `5` when there are only 2) just does
  nothing.

## Contributing

Bug reports, ideas and pull requests are all welcome. Have a look at
[CONTRIBUTING.md](CONTRIBUTING.md) first. It covers how we write code,
docs and commit messages here. Found a security issue? Please follow
[SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

Slidewalk is released under the [MIT License](LICENSE). Use it, change it,
ship it, sell it. Just keep the copyright notice around.
