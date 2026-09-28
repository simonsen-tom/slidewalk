# Contributing to Slidewalk

Thanks for wanting to help out! Bug reports, ideas and pull requests are all
welcome. This page covers how things work around here, so your change can
land without much back and forth.

## Before you start

For anything bigger than a small fix, please open an issue first and tell us
what you have in mind. That way we can agree on the approach before you
spend time on code.

## Getting set up

You'll need Node.js 24 or newer. The repo pins v24 in `.nvmrc`, so run
`nvm use` or `fnm use` first.

```bash
npm install     # also installs the commit-msg git hook
npm run watch   # rebuilds on every change
npm start -- examples/hello-deck   # in a second terminal
```

The [Development](README.md#development) and
[Codebase overview](README.md#codebase-overview) sections of the README
walk through the rest.

## A few principles

- **Keep it pure web.** Slidewalk runs on native browser features (Web
  Components, CSS custom properties, `BroadcastChannel`, native ES modules)
  with TypeScript compiled by plain `tsc`. Please don't add a bundler or a
  framework.
- **Two runtime dependencies, on purpose.** Those are `marked` and `sirv`.
  If you think we need another one, raise it in an issue first.
- **Built-in themes stay WCAG AAA.** Every built-in theme color needs a
  contrast ratio of at least 7:1. `src/runtime/styles/contrast.test.ts`
  checks this. If you change a color, update the ratio comments in the
  theme file too.
- **The README is the source of truth** for anything user-facing or about
  deck authoring. If your change affects how people use Slidewalk, update
  the README in the same pull request.

## Tests

Tests use Node's built-in `node:test` runner. Each test file sits next to
the module it covers as `*.test.ts`. Please add or update tests for
behavior you change.

```bash
npm test
```

## Formatting

Prettier handles formatting (single quotes, semicolons, 120 print width,
trailing commas). There's no linter. Run `npm run format` before you commit,
or `npm run all` to format, build and test in one go. Heads up: `npm run all`
rewrites files in place, including example decks.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/),
like `feat(runtime): add slide counter` or `docs: fix a typo`. A
`commit-msg` hook runs commitlint and rejects anything else. If you'd rather
not remember the format, stage your changes and run `npx cz` for a guided
prompt.

## How we write

We keep everything friendly and fairly casual. That goes for code comments,
docs, error messages, commit messages and example slide text. Write like
you're explaining things to a teammate you like: plain words, short
sentences, a bit of warmth.

- Don't use em dashes (—) or en dashes (–) to join or break up a sentence,
  and don't use a spaced double hyphen as a stand-in. Write two sentences
  instead.
- For a label followed by its description, use a colon rather than a dash.
- Casual doesn't mean vague. Comments should still explain the _why_ behind
  non-obvious code.
- Keep jokes and exclamation marks rare. Friendly beats cute.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE), the same as the rest of the project.
