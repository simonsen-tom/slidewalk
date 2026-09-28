/**
 * Slide HTML gets mounted into index.html's page, so left alone, every
 * relative URL in it would resolve against index.html instead of the
 * markdown file it was written in. These helpers point relative URLs back at
 * the slide's own location. That way a slide at `lanes/intro/01.md` can use
 * `assets/photo.jpg` or `../shared/logo.svg` just like any other file would.
 *
 * We only touch truly relative references. Anything with a scheme
 * (`https:`, `data:`, `mailto:`...), protocol-relative URLs (`//host/...`),
 * root-absolute paths (`/...`, which mean the deck folder root) and
 * fragment-only links (`#id`) are left exactly as they are.
 */

const URL_ATTRIBUTES = ['src', 'href', 'poster', 'data', 'xlink:href'];
const SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]*?)\1\s*\)/g;

export function isRelativeUrl(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    !SCHEME_RE.test(trimmed) &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('#') &&
    !trimmed.startsWith('?')
  );
}

/** Resolves a relative `value` against `baseUrl`. Same-origin results come back as a root-absolute path. */
export function rebaseUrl(value: string, baseUrl: URL): string {
  if (!isRelativeUrl(value)) return value;
  const resolved = new URL(value.trim(), baseUrl);
  return resolved.origin === baseUrl.origin ? resolved.pathname + resolved.search + resolved.hash : resolved.href;
}

function rebaseSrcset(value: string, baseUrl: URL): string {
  return value
    .split(',')
    .map((candidate) => {
      const [url, ...descriptors] = candidate.trim().split(/\s+/);
      return url ? [rebaseUrl(url, baseUrl), ...descriptors].join(' ') : candidate;
    })
    .join(', ');
}

export function rebaseCssUrls(css: string, baseUrl: URL): string {
  return css.replace(CSS_URL_RE, (match, quote: string, url: string) =>
    isRelativeUrl(url) ? `url(${quote}${rebaseUrl(url, baseUrl)}${quote})` : match,
  );
}

/**
 * Rewrites relative URLs under `root` in place. That covers URL attributes,
 * `srcset`, and `url(...)` in both `style` attributes and `<style>` blocks.
 * Make sure `root` is inert (not in a live document). Otherwise the browser
 * starts fetching the old, wrong URLs before we get to fix them.
 */
export function rebaseRelativeUrls(root: ParentNode, baseUrl: URL): void {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    for (const name of URL_ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (value !== null) el.setAttribute(name, rebaseUrl(value, baseUrl));
    }
    const srcset = el.getAttribute('srcset');
    if (srcset !== null) el.setAttribute('srcset', rebaseSrcset(srcset, baseUrl));
    const style = el.getAttribute('style');
    if (style !== null) el.setAttribute('style', rebaseCssUrls(style, baseUrl));
    if (el.localName === 'style' && el.textContent) {
      el.textContent = rebaseCssUrls(el.textContent, baseUrl);
    }
  }
}
