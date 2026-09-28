// Runs `tsc --watch` and the CSS/vendor asset watcher side by side, so
// `npm run watch` covers both TS recompiles and styles/watch-styles.mjs
// re-copies. A plain shell `&` chain would work too, but spawning both as
// child processes here makes Ctrl+C shut everything down reliably, whatever
// shell you're in.
import { spawn } from 'node:child_process';

const children = [
  spawn('tsc', ['-p', 'tsconfig.json', '--watch'], { stdio: 'inherit' }),
  spawn('node', ['scripts/watch-styles.mjs'], { stdio: 'inherit' }),
];

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

for (const child of children) {
  child.on('exit', shutdown);
}
