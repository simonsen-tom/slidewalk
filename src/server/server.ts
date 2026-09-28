import http from 'node:http';
import sirv from 'sirv';
import { RESERVED_PREFIX } from './constants.js';
import { createLiveReloadHub } from './live-reload.js';

export interface ServerOptions {
  deckDir: string;
  runtimeDir: string;
  port: number;
  host: string;
}

function notFound(res: http.ServerResponse): void {
  res.statusCode = 404;
  res.end('Not found');
}

/**
 * Two sirv mounts plus one routing check. Requests under RESERVED_PREFIX get
 * the app's own compiled runtime (JS/CSS). Everything else comes from the
 * user's deck folder, which acts as the web root.
 */
export function startServer(opts: ServerOptions): http.Server {
  const serveDeck = sirv(opts.deckDir, { dev: true, etag: true });
  const serveRuntime = sirv(opts.runtimeDir, { dev: true, etag: true });
  const liveReload = createLiveReloadHub([opts.deckDir, opts.runtimeDir]);

  const server = http.createServer((req, res) => {
    if (req.url && req.url.startsWith(RESERVED_PREFIX)) {
      const innerUrl = req.url.slice(RESERVED_PREFIX.length) || '/';
      if (innerUrl === '/livereload') {
        liveReload.handleRequest(req, res);
        return;
      }
      req.url = innerUrl;
      serveRuntime(req, res, () => notFound(res));
      return;
    }
    serveDeck(req, res, () => notFound(res));
  });

  server.on('close', () => liveReload.close());
  server.listen(opts.port, opts.host);
  return server;
}
