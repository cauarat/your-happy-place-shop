/**
 * Turns whatever Firecrawl handed you into a flat `CrawlPage[]`.
 *
 * The exports come in several shapes depending on how the crawl was taken —
 * the API's `{ success, data: [...] }` envelope, a bare array, one JSON object
 * per line, or a folder with a file per page. None of that should reach the
 * extractor, so it is all flattened here.
 */
import type { CrawlPage } from "./types";

/** Keys a page object might carry its own URL under, best first. */
const URL_KEYS = ["url", "sourceURL", "sourceUrl", "source_url", "link", "canonicalUrl"];

/** Keys an envelope might carry the page list under. */
const LIST_KEYS = ["data", "pages", "results", "items", "documents"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstString = (source: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

/**
 * One page object → `CrawlPage`, or null if it carries nothing usable.
 *
 * A page with no URL anywhere is dropped: the URL is both the dedupe key and
 * the base for resolving relative image paths, so a page without one cannot be
 * imported safely.
 */
export function toCrawlPage(value: unknown): CrawlPage | null {
  if (!isRecord(value)) return null;

  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  const url =
    firstString(value, URL_KEYS) ??
    (metadata ? firstString(metadata, [...URL_KEYS, "og:url", "ogUrl"]) : undefined);
  if (!url) return null;

  const page: CrawlPage = { url };
  if (typeof value.markdown === "string") page.markdown = value.markdown;
  if (typeof value.html === "string") page.html = value.html;
  if (typeof value.rawHtml === "string") page.rawHtml = value.rawHtml;
  if (metadata) page.metadata = metadata;
  if (isRecord(value.product)) page.product = value.product;
  if (isRecord(value.json)) page.json = value.json;
  // Some exports put the schema'd extraction under `extract` (the older name)
  // or `llm_extraction` instead of `json`.
  else if (isRecord(value.extract)) page.json = value.extract;
  else if (isRecord(value.llm_extraction)) page.json = value.llm_extraction;

  return page;
}

/**
 * Any parsed export value → the pages inside it.
 *
 * Handles the `{ success, data: [...] }` envelope, a bare array, a nested
 * envelope (`{ data: { data: [...] } }`, which the job-status endpoint
 * returns), and a single page on its own.
 */
export function normalizeCrawl(value: unknown): CrawlPage[] {
  if (Array.isArray(value)) {
    return value.map(toCrawlPage).filter((page): page is CrawlPage => page !== null);
  }
  if (!isRecord(value)) return [];

  for (const key of LIST_KEYS) {
    const list = value[key];
    if (Array.isArray(list) || isRecord(list)) {
      const pages = normalizeCrawl(list);
      if (pages.length > 0) return pages;
    }
  }

  const single = toCrawlPage(value);
  return single ? [single] : [];
}

/**
 * A file's text → the pages inside it, JSON or JSON-per-line.
 *
 * JSONL is tried whenever the whole-file parse fails, which is also what a
 * truncated or concatenated export looks like — better to import the lines
 * that do parse than to fail on the one that does not.
 */
export function parseCrawlText(text: string): CrawlPage[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    return normalizeCrawl(JSON.parse(trimmed));
  } catch {
    // Not one JSON document. Try it as one per line.
  }

  const pages: CrawlPage[] = [];
  for (const line of trimmed.split("\n")) {
    const source = line.trim().replace(/,$/, "");
    if (!source || source === "[" || source === "]") continue;
    try {
      pages.push(...normalizeCrawl(JSON.parse(source)));
    } catch {
      // A line that is not JSON is not a page. Skip it.
    }
  }
  return pages;
}

/**
 * A markdown file from a per-page export → a `CrawlPage`.
 *
 * Firecrawl writes these with the page's metadata in YAML front matter. The
 * file name is the fallback URL, since these exports name files after the URL
 * they came from.
 */
export function parseMarkdownFile(fileName: string, text: string): CrawlPage | null {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const metadata: Record<string, unknown> = {};

  if (match) {
    for (const line of match[1].split("\n")) {
      const pair = line.match(/^\s*["']?([\w:.-]+)["']?\s*:\s*(.*)$/);
      if (!pair) continue;
      metadata[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  const url =
    firstString(metadata, [...URL_KEYS, "og:url", "ogUrl"]) ?? urlFromFileName(fileName);
  if (!url) return null;

  return {
    url,
    markdown: match ? text.slice(match[0].length) : text,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

/**
 * The URL a per-page export encoded into a file name.
 *
 * These names are the URL with the separators replaced, so the domain survives
 * even when the exact path does not. Anything that cannot be read back as a
 * URL returns undefined and the page is skipped rather than guessed at.
 */
function urlFromFileName(fileName: string): string | undefined {
  const base = fileName.replace(/\.(md|markdown|json|html?)$/i, "");
  const decoded = (() => {
    try {
      return decodeURIComponent(base);
    } catch {
      return base;
    }
  })();

  if (/^https?:\/\//i.test(decoded)) return decoded;
  // `https___example_com_produto_x` and friends.
  const restored = decoded.replace(/^https?[_-]{2,3}/i, "https://").replace(/_/g, "/");
  return /^https?:\/\/[^/]+\./i.test(restored) ? restored : undefined;
}
