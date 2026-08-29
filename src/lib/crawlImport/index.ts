/**
 * The crawl importer's pure half: a Firecrawl export in, catalogue products out.
 *
 * Nothing here touches the disk, the network or R2 — `scripts/import-crawl.ts`
 * does all of that around this. Kept apart so the part that decides what a
 * product *is* can be tested without a crawl, a bucket or a browser.
 *
 *     crawl text/pages → readCrawl → extract → mapping → dedupe → decisions
 *
 * `firecrawl.ts` is the exception in spirit only: it shapes the API request the
 * script then makes, and makes none itself.
 */
import type { Product } from "@/data/products";
import { extractProduct, isListingUrl, DETERMINISTIC_SOURCES } from "./extract";
import { toProduct, vocabularyOf, type MapOptions } from "./mapping";
import { planImport, applyDecisions, type DedupeOptions, type ImportDecision } from "./dedupe";
import type { CrawlPage, RawProduct, SkippedPage } from "./types";

export type { CrawlPage, RawProduct, SkippedPage } from "./types";
export type { ImportAction, ImportDecision } from "./dedupe";
export type { MapOptions, MappedProduct } from "./mapping";
export { normalizeCrawl, parseCrawlText, parseMarkdownFile, toCrawlPage } from "./readCrawl";
export { extractProduct, parsePrice, resolveImageUrl, findProductJsonLd, isListingUrl } from "./extract";
export {
  toProduct,
  vocabularyOf,
  normalizeCategory,
  normalizeDesigner,
  normalizeToken,
  allowsQuantity,
  CATEGORY_ALIASES,
  DESIGNER_ALIASES,
} from "./mapping";
export { planImport, applyDecisions, normalizeUrl } from "./dedupe";
export {
  isYupooUrl,
  yupooOrigin,
  yupooCategoryId,
  parseAlbumCards,
  parseCategoryLinks,
  parseCategoryName,
  parseAlbumPage,
  albumToPage,
  atSize,
  decodeEntities,
  type Album,
  type AlbumCard,
  type CategoryLink,
} from "./yupoo";
export {
  FIRECRAWL_API,
  looksLikeProductUrl,
  modeFor,
  scrapeBody,
  crawlBody,
  exportFileName,
  type CrawlMode,
} from "./firecrawl";

export interface BuildOptions extends DedupeOptions {
  /** Stop after this many products. `--limit`, for a trial run. */
  limit?: number;
  defaultCategory?: string;
  defaultDesigner?: string;
  /** Fixed timestamp base, so a run is reproducible in tests. */
  now?: number;
}

export interface ImportPlan {
  decisions: ImportDecision[];
  /** Pages that described no product, with the reason. */
  skippedPages: SkippedPage[];
  /** Per-product notes for the admin, keyed by product id. */
  warnings: Record<string, string[]>;
  /** What each product looked like before our vocabulary was applied. */
  raw: Record<string, RawProduct>;
}

/**
 * Crawl pages + the current catalogue → everything the CLI needs to decide.
 *
 * The catalogue supplies the vocabulary as well as the duplicates: categories
 * and designers are read off it, so an import speaks the words the shop
 * already uses rather than the crawled shop's.
 */
export function buildImportPlan(
  pages: CrawlPage[],
  catalogue: Product[],
  options: BuildOptions = {}
): ImportPlan {
  const { categories, designers } = vocabularyOf(catalogue);
  const now = options.now ?? Date.now();

  const skippedPages: SkippedPage[] = [];
  const warnings: Record<string, string[]> = {};
  const raw: Record<string, RawProduct> = {};
  const candidates: Product[] = [];

  for (const page of pages) {
    if (options.limit !== undefined && candidates.length >= options.limit) break;

    const extracted = extractProduct(page);
    if (!extracted) {
      skippedPages.push({ url: page.url, reason: "no product name or no image on the page" });
      continue;
    }
    if (!DETERMINISTIC_SOURCES.includes(extracted.via) && isListingUrl(page.url)) {
      // A category page that only *looks* like a product to the guessing
      // layers. The shop published no product data for it, and its URL says
      // what it is.
      skippedPages.push({ url: page.url, reason: "a listing page — the shop published no product data for it" });
      continue;
    }

    const mapOptions: MapOptions = {
      categories,
      designers,
      defaultCategory: options.defaultCategory,
      defaultDesigner: options.defaultDesigner,
      now,
      index: candidates.length,
    };
    const { product, warnings: notes } = toProduct(extracted, mapOptions);

    candidates.push(product);
    raw[product.id] = extracted;
    if (notes.length > 0) warnings[product.id] = notes;
  }

  return {
    decisions: planImport(candidates, catalogue, {
      update: options.update,
      byLinkOnly: options.byLinkOnly,
    }),
    skippedPages,
    warnings,
    raw,
  };
}

export { applyDecisions as applyImportPlan };
