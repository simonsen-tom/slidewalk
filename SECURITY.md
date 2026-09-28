# Security

## Reporting a problem

If you think you've found a security issue, please don't open a public
issue. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/simonsen-tom/slidewalk/security/advisories/new)
instead. Tell us what you found, how to reproduce it, and what you think
the impact is. We'll get back to you as soon as we can.

Only the latest version on `main` gets security fixes.

## What Slidewalk trusts

A few things are by design, so they aren't vulnerabilities:

- **Decks are trusted.** Slide markdown renders with raw HTML allowed and no
  sanitizer, so a deck can run any script it likes in your browser. Only
  present decks you wrote yourself or trust.
- **The server is for local use.** It serves the deck folder as its web
  root to anyone who can reach it, with no authentication. It listens on
  `localhost` by default. Be careful with `--host` on a network you don't
  trust.

Problems outside those boundaries are exactly what we want to hear about.
Think of things like reading files outside the deck folder, or a request
that crashes the server.
