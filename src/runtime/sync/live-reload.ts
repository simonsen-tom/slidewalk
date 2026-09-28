/**
 * Connects to the dev server's SSE endpoint (src/server/live-reload.ts) and
 * reloads the page whenever a deck or runtime file changes. It's safe to
 * always run this, since every Slidewalk server serves this route.
 */
export function connectLiveReload(): void {
  const source = new EventSource('/__slidewalk__/livereload');
  source.onmessage = () => location.reload();
}
