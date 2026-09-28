# Make it yours

This slide has its own warm theme, with a light and a dark version. Press
**T** to flip between them. It all lives in `theme.css`, a plain stylesheet
next to `index.html`, linked after the built-in styles:

```css
.sw-slide[data-slide-id='theming'][data-sw-theme='light'] {
  --sw-bg: #fdf6e3;
  --sw-h1: #7f1d1d;
}
.sw-slide[data-slide-id='theming'][data-sw-theme='dark'] {
  --sw-bg: #1e1812;
  --sw-h1: #fcd9a8;
}
```

Use `[data-sw-theme="light"]` or `[data-sw-theme="dark"]` to restyle a whole
theme, or `[data-slide-id="..."]` to change just one slide. The `--sw-code-*`
variables restyle code blocks too, like the one above.

<!-- notes
Open examples/hello-deck/theme.css while presenting. Every variable is
listed there, along with some commented-out deck-wide examples. Save the
file and the browser reloads right away.
-->
