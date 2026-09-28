import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

export async function copyAssets() {
  const stylesSrc = path.join(projectRoot, 'src/runtime/styles');
  const stylesDest = path.join(projectRoot, 'dist/runtime/styles');
  await cp(stylesSrc, stylesDest, { recursive: true });

  const vendorDestDir = path.join(projectRoot, 'dist/runtime/vendor');
  await mkdir(vendorDestDir, { recursive: true });
  await cp(path.join(projectRoot, 'node_modules/marked/lib/marked.esm.js'), path.join(vendorDestDir, 'marked.js'));
}

// Only run as a one-shot copy when invoked directly (`node scripts/copy-assets.mjs`),
// not when imported by scripts/watch-styles.mjs for repeated copies.
if (import.meta.url === `file://${process.argv[1]}`) {
  copyAssets()
    .then(() => console.log('Copied styles and vendored marked.js into dist/runtime/'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
