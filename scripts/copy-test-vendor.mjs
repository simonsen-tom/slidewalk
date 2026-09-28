// markdown.ts imports the vendored marked.js via a relative path, so the
// compiled test output (dist-test/src/runtime/vendor/) needs its own copy
// too. The one copy-assets.mjs puts in dist/runtime/vendor/ lives at a
// different path, and dist-test can't see it.
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

const destDir = path.join(projectRoot, 'dist-test/src/runtime/vendor');
await mkdir(destDir, { recursive: true });
await cp(path.join(projectRoot, 'node_modules/marked/lib/marked.esm.js'), path.join(destDir, 'marked.js'));
