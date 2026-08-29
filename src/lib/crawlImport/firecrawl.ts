/**
 * What to ask Firecrawl for. The asking itself is in `scripts/import-crawl.ts`.
 *
 * Two endpoints matter here. `/scrape` reads one page; `/crawl` walks a site
 * and is asynchronous — it answers with a job id to poll. Which one a link
 * deserves is usually obvious from the link itself, so it is decided here and
 * announced rather than asked about.
 */

export const FIRECRAWL_API = "https://api.firecrawl.dev/v2";

export type CrawlMode = "scrape" | "crawl";

/**
 * The path shapes shops give a single product.
 *
 * Deliberately narrow: guessing "crawl" for a product page costs credits and
 * imports a shop's worth of pages nobody asked for, while guessing "scrape"
 * for a listing page costs one credit and one clear message.
 */
const PRODUCT_PATH =
  /\/(products?|produtos?|artigos?|item|items|itm|dp|gp\/product|pd|sku|offer)\/[^/]+/i;

export function looksLikeProductUrl(url: string): boolean {
  try {
    const { pathname, searchParams } = new URL(url);
    if (PRODUCT_PATH.test(pathname)) return true;
    // `?id=123` / `?product_id=123` — the other common shape.
    return ["id", "productId", "product_id", "sku", "offerId"].some((key) => searchParams.has(key));
  } catch {
    return false;
  }
}

/** Scrape one page, or crawl the site — the override wins when given. */
export function modeFor(url: string, override?: CrawlMode): CrawlMode {
  return override ?? (looksLikeProductUrl(url) ? "scrape" : "crawl");
}

export interface RequestOptions {
  /**
   * Ask for the page's HTML as well.
   *
   * Off by default: it multiplies the size of a crawl by an order of magnitude
   * (a single fashion product page ran to 2.5MB of HTML), and the `product`
   * format already reads the structured data that HTML would have carried. Worth
   * turning on when a shop's pages defeat the product extractor and the JSON-LD
   * fallback is the last hope.
   */
  withHtml?: boolean;
}

/**
 * The formats every request asks for.
 *
 * `product` first: it is Firecrawl's own deterministic read of the page's
 * structured data — title, brand, category, description, priced variants — and
 * it is fail-closed, so a page that returns one really is a product page.
 * `markdown` is the fallback the extractor falls through to, and it costs
 * nothing extra.
 */
function formats(options: RequestOptions): unknown[] {
  const list: unknown[] = [{ type: "product" }, "markdown"];
  if (options.withHtml) list.push("html");
  return list;
}

export function scrapeBody(url: string, options: RequestOptions = {}): Record<string, unknown> {
  return { url, formats: formats(options) };
}

export function crawlBody(
  url: string,
  limit: number,
  options: RequestOptions = {}
): Record<string, unknown> {
  // `limit` is the credit brake. Firecrawl's own default is 10,000 pages, which
  // is not a default anybody wants to discover by accident.
  return { url, limit, scrapeOptions: { formats: formats(options) } };
}

/** The file a fetched crawl is saved to, so a re-import needs no credits. */
export function exportFileName(url: string, now = new Date()): string {
  const host = (() => {
    try {
      return new URL(url).host.replace(/^www\./i, "").replace(/[^a-z0-9.-]/gi, "-");
    } catch {
      return "crawl";
    }
  })();
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "").replace(/-/g, "");
  return `${host}-${stamp}.json`;
}
