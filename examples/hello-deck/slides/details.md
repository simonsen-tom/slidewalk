# How it works

- Markdown turns into HTML via `marked`, and raw HTML works too
- The deck's structure lives in `index.html`
- You navigate a 2D grid of lanes and slides, synced across windows via `BroadcastChannel`

```bash
# Present any deck folder, wherever it lives
npm start -- ./my-talk --port 3000
```

<!-- notes
This slide is tagged `theme="dark"` in index.html, so it stays dark no
matter what the deck's `default-theme` is. The code block above gets syntax
highlighting because its fence says `bash`.
-->
