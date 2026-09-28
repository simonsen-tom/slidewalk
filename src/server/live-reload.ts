import { watch, type FSWatcher } from 'node:fs';
import type http from 'node:http';

export interface LiveReloadHub {
  handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void;
  close(): void;
}

/**
 * Watches `watchPaths` (recursively) and pushes an SSE `reload` message to
 * every connected client whenever anything under them changes.
 */
export function createLiveReloadHub(watchPaths: string[]): LiveReloadHub {
  const clients = new Set<http.ServerResponse>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleReload(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    // Debounce: a single save can fire several fs events in quick succession.
    debounceTimer = setTimeout(() => {
      for (const client of clients) client.write('data: reload\n\n');
    }, 100);
  }

  const watchers: FSWatcher[] = watchPaths.map((dir) => watch(dir, { recursive: true }, scheduleReload));

  return {
    handleRequest(req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
    },
    close() {
      for (const watcher of watchers) watcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const client of clients) client.end();
      clients.clear();
    },
  };
}
