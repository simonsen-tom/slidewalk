// Hand-written ambient types for the vendored copy of marked at ./marked.js
// (copied from node_modules/marked/lib/marked.esm.js by scripts/copy-assets.mjs).
// We only declare the bits this app actually uses.
export const marked: {
  parse(src: string): string;
};
