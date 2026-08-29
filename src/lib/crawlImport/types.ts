/**
 * Shared shapes for the crawl importer.
 *
 * Everything here is plain data: the pure half of the importer (reading,
 * extracting, mapping, deduping) never touches the disk, the network or R2 —
 * that all lives in `scripts/import-crawl.ts`. This is what makes the mapping
 * testable without a crawl in hand.
 */

/** One page of a Firecrawl export, whatever shape the export itself had. */
export interface CrawlPage {
  /** The page's own URL. Products are traced back to the shop through this. */
  url: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  metadata?: Record<string, unknown>;
  /** Present when the crawl ran with `formats: ["json"]` and a schema. */
  json?: Record<string, unknown>;
  /**
   * Present when the crawl asked for Firecrawl's `product` format: a
   * deterministic read of the page's own structured data — title, brand,
   * category, description and priced variants. Fail-closed, so a page that has
   * one really is a product page.
   */
  product?: Record<string, unknown>;
}

/** Which extraction layer answered for a field. Reported, never stored. */
export type ExtractionSource = "product" | "json" | "jsonld" | "metadata" | "markdown";

/**
 * A product as the crawl describes it — before any of our own vocabulary is
 * applied. Category and designer are still the shop's words at this point, and
 * images are still the shop's URLs.
 */
export interface RawProduct {
  name: string;
  price?: number;
  oldPrice?: number;
  description?: string;
  images: string[];
  designer?: string;
  category?: string;
  colors?: string[];
  sizes?: string[];
  /** Other pages for the same product — the supplier's own shop, typically. */
  links?: string[];
  /** The crawled page this came from. */
  sourceUrl: string;
  /** The layer that supplied the name, for the report. */
  via: ExtractionSource;
}

/** A page that did not become a product, and why. */
export interface SkippedPage {
  url: string;
  reason: string;
}
