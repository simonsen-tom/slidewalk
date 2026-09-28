import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyAssets } from './copy-assets.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const stylesDir = path.join(projectRoot, 'src/runtime/styles');

let timer = null;

function scheduleCopy() {
  if (timer) clearTimeout(timer);
  // Debounce: a single save can fire several fs events in quick succession.
  timer = setTimeout(() => {
    copyAssets()
      .then(() => console.log('[watch-styles] copied styles into dist/runtime/'))
      .catch((err) => console.error('[watch-styles] copy failed:', err));
  }, 100);
}

await copyAssets();
console.log(`[watch-styles] watching ${stylesDir} for changes...`);
watch(stylesDir, { recursive: true }, () => scheduleCopy());
