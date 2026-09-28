import { marked } from '../vendor/marked.js';
import { rebaseRelativeUrls } from './rebase-urls.js';
import { highlightCodeBlocks } from './highlight.js';

export interface SplitContent {
  body: string;
  notes: string | null;
}

const NOTES_RE = /<!--\s*notes([\s\S]*?)-->\s*$/;

export function splitNotes(raw: string): SplitContent {
  const match = NOTES_RE.exec(raw);
  if (!match) {
    return { body: raw, notes: null };
  }
  const notes = match[1].trim();
  const body = raw.slice(0, match.index).trimEnd();
  return { body, notes: notes.length > 0 ? notes : null };
}

export interface SlideContent {
  html: string;
  notesHtml: string | null;
}

/**
 * Turns slide markdown into the HTML we mount. It parses into a fresh document
 * from `createHTMLDocument`, which has no browsing context, so nothing in it
 * gets fetched while we're still fixing things up. Then it points relative
 * URLs at the markdown file (see rebase-urls.ts) and highlights code blocks
 * (see highlight.ts).
 */
export function renderMarkdown(
  markdown: string,
  baseUrl: URL,
  createContainer: () => Element = () => document.implementation.createHTMLDocument('').body,
): string {
  const container = createContainer();
  container.innerHTML = marked.parse(markdown) as string;
  rebaseRelativeUrls(container, baseUrl);
  highlightCodeBlocks(container);
  return container.innerHTML;
}

const cache = new Map<string, SlideContent>();

export async function loadSlideContent(src: string): Promise<SlideContent> {
  const cached = cache.get(src);
  if (cached) return cached;

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`the server said ${response.status} ${response.statusText}`);
  }
  const raw = await response.text();
  const { body, notes } = splitNotes(raw);

  // Relative URLs in the slide resolve against the markdown file itself, not index.html.
  const baseUrl = new URL(response.url || src, document.baseURI);
  const content: SlideContent = {
    html: renderMarkdown(body, baseUrl),
    notesHtml: notes ? renderMarkdown(notes, baseUrl) : null,
  };
  cache.set(src, content);
  return content;
}

export function clearSlideContentCache(): void {
  cache.clear();
}
