/**
 * One crawled page → the product it describes.
 *
 * Five layers, best first: Firecrawl's own `product` extraction, a schema'd
 * `json` extraction, JSON-LD in the HTML, the page's own metadata, then the
 * markdown itself. They are merged rather than raced — the best layer wins each
 * field, and a lower one fills what the better ones left empty, so a page with
 * a thin JSON-LD block still gets its gallery out of the markdown.
 */
import { looksLikeProductUrl } from "./firecrawl";
import type { CrawlPage, ExtractionSource, RawProduct } from "./types";

type Draft = Partial<Omit<RawProduct, "sourceUrl" | "via">>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Case-insensitive lookup, since crawled JSON keys are not ours to control. */
function pick(source: Record<string, unknown>, keys: string[]): unknown {
  const lowered = new Map(Object.keys(source).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actual = lowered.get(key.toLowerCase());
    if (actual !== undefined && source[actual] !== undefined && source[actual] !== null) {
      return source[actual];
    }
  }
  return undefined;
}

const NAME_KEYS = ["name", "title", "productName", "product_name", "produto", "nome"];
const PRICE_KEYS = ["price", "salePrice", "sale_price", "currentPrice", "priceValue", "preco", "preço", "valor"];
const OLD_PRICE_KEYS = ["oldPrice", "listPrice", "compareAtPrice", "originalPrice", "regularPrice", "fullPrice", "precoAntigo"];
const DESCRIPTION_KEYS = ["description", "descricao", "descrição", "details", "longDescription", "summary"];
const IMAGE_KEYS = ["images", "imageUrls", "image_urls", "gallery", "photos", "pictures", "image", "imagem", "imagens"];
const DESIGNER_KEYS = ["designer", "brand", "vendor", "manufacturer", "marca", "maker", "label"];
const CATEGORY_KEYS = ["category", "categoria", "productType", "product_type", "type", "collection"];
const COLOR_KEYS = ["colors", "colours", "color", "colour", "cores", "cor"];
const SIZE_KEYS = ["sizes", "size", "tamanhos", "tamanho", "availableSizes"];

/**
 * A price as a number, from whatever the page called it.
 *
 * Both conventions appear in the same crawl often enough to matter:
 * `R$ 1.234,56` and `$1,234.56` are the same amount written two ways. The rule
 * is that the *last* separator is the decimal one — unless it is followed by
 * three digits, which makes it a thousands separator (`1.234` is 1234).
 */
export function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (isRecord(value)) {
    const inner = pick(value, [...PRICE_KEYS, "amount", "value"]);
    return inner === undefined ? undefined : parsePrice(inner);
  }
  if (typeof value !== "string") return undefined;

  const match = value.replace(/\s/g, "").match(/-?\d[\d.,]*/);
  if (!match) return undefined;

  let digits = match[0];
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  const lastSeparator = Math.max(lastComma, lastDot);

  if (lastSeparator === -1) {
    const plain = Number(digits);
    return Number.isFinite(plain) && plain >= 0 ? plain : undefined;
  }

  const decimals = digits.length - lastSeparator - 1;
  if (decimals === 3) {
    // `1.234` / `1,234` — a thousands separator, no decimal part at all.
    digits = digits.replace(/[.,]/g, "");
  } else {
    digits = digits.slice(0, lastSeparator).replace(/[.,]/g, "") + "." + digits.slice(lastSeparator + 1);
  }

  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i;

/**
 * Chrome that is never the product: the shop's own furniture, repeated on
 * every page, which would otherwise become the first image of every import.
 */
const NOT_A_PRODUCT_IMAGE = /(logo|icon|favicon|sprite|placeholder|banner|avatar|pixel|badge|payment|flag|thumb_default|loading|spinner)/i;

/** An absolute, plausible product image URL, or undefined. */
export function resolveImageUrl(src: unknown, baseUrl: string): string | undefined {
  if (isRecord(src)) return resolveImageUrl(pick(src, ["url", "src", "contentUrl", "@id"]), baseUrl);
  if (typeof src !== "string") return undefined;

  const raw = src.trim();
  if (!raw || raw.startsWith("data:")) return undefined;

  let absolute: string;
  try {
    absolute = new URL(raw, baseUrl).toString();
  } catch {
    return undefined;
  }

  if (NOT_A_PRODUCT_IMAGE.test(absolute)) return undefined;
  // An extension is the reliable signal. Image CDNs that hide it behind a path
  // still say so in a `format=`/`fm=` parameter, which is worth honouring.
  if (!IMAGE_EXTENSION.test(absolute) && !/[?&](format|fm)=(jpe?g|png|webp|avif)/i.test(absolute)) {
    return undefined;
  }
  return absolute;
}

/** Absolute, de-duplicated, in the order the page listed them. */
function collectImages(values: unknown, baseUrl: string): string[] {
  const list = Array.isArray(values) ? values : [values];
  const seen = new Set<string>();
  for (const item of list) {
    const url = resolveImageUrl(item, baseUrl);
    if (url) seen.add(url);
  }
  return [...seen];
}

function toStringList(value: unknown): string[] | undefined {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;/|]/) : [];
  const cleaned = list
    .map((item) => (isRecord(item) ? String(pick(item, ["name", "value"]) ?? "") : String(item ?? "")))
    .map((item) => item.trim())
    .filter(Boolean);
  return cleaned.length > 0 ? [...new Set(cleaned)] : undefined;
}

function toText(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return toText(value.find((item) => typeof item === "string"));
  if (isRecord(value)) return toText(pick(value, ["name", "value", "text"]));
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Paths a shop gives a list of products rather than one product. */
const LISTING_PATH =
  /\/(collections?|categor(y|ia|ies|ias)|catalogo?g?u?e?|search|busca|tags?|brands?|designers?|shop|loja|new-arrivals|sale|all)(\/|$)/i;

/**
 * A page that lists products instead of being one.
 *
 * These are the false positives a whole-site crawl produces: a category page
 * carries the shop's name in `og:title`, a tile's price in its markdown and a
 * grid of product photos, which is enough to look like a product to every
 * layer that guesses. The deterministic layers do not guess — Firecrawl's
 * `product` format is fail-closed and JSON-LD is the shop's own declaration —
 * so this only applies to what the fallbacks produced.
 */
export function isListingUrl(url: string): boolean {
  if (looksLikeProductUrl(url)) return false; // `/collections/mens/products/x`
  try {
    const { pathname } = new URL(url);
    return pathname === "/" || pathname === "" || LISTING_PATH.test(pathname);
  } catch {
    return false;
  }
}

/** The layers that read what a shop published, rather than inferring it. */
export const DETERMINISTIC_SOURCES: ExtractionSource[] = ["product", "json", "jsonld"];

// ── Layer 0: Firecrawl's product format ──────────────────────────────────────

/**
 * Firecrawl's `product` format — the shop's own structured data, read
 * deterministically rather than guessed at, and fail-closed: a page that
 * returns one is a product page.
 *
 * The shape is a product with priced variants:
 *
 *     { title, brand, category, description,
 *       variants: [{ values: { size, color }, price: { amount, currency },
 *                    availability: { inStock }, images: [{ url }] }] }
 *
 * The catalogue has no variants — one product, one price — so the variants are
 * folded down: the lowest price anyone can actually pay, every image any
 * variant shows, and the sizes and colours as the product's own lists.
 */
function fromProductFormat(product: Record<string, unknown> | undefined, baseUrl: string): Draft {
  if (!product) return {};

  const variants = Array.isArray(product.variants) ? product.variants.filter(isRecord) : [];

  const prices = variants
    .map((variant) => parsePrice(pick(variant, [...PRICE_KEYS, "amount"])))
    .filter((price): price is number => price !== undefined && price > 0);

  const oldPrices = variants
    .map((variant) => parsePrice(pick(variant, [...OLD_PRICE_KEYS, "compareAtPrice", "compare_at_price"])))
    .filter((price): price is number => price !== undefined && price > 0);

  // `values` holds the variant's own axes — size, colour — under names the
  // shop chose; the variant title is the fallback ("8", "Black / M").
  const valuesOf = (variant: Record<string, unknown>, keys: string[]): string | undefined => {
    const values = isRecord(variant.values) ? variant.values : undefined;
    return values ? toText(pick(values, keys)) : undefined;
  };

  const sizes = [
    ...new Set(
      variants
        .map((variant) => valuesOf(variant, SIZE_KEYS) ?? toText(variant.title))
        .filter((size): size is string => Boolean(size))
    ),
  ];
  const colors = [
    ...new Set(
      variants
        .map((variant) => valuesOf(variant, COLOR_KEYS))
        .filter((color): color is string => Boolean(color))
    ),
  ];

  const images = [
    ...new Set([
      ...collectImages(pick(product, IMAGE_KEYS), baseUrl),
      ...variants.flatMap((variant) => collectImages(variant.images, baseUrl)),
    ]),
  ];

  return {
    name: toText(pick(product, NAME_KEYS)),
    price: prices.length > 0 ? Math.min(...prices) : parsePrice(pick(product, PRICE_KEYS)),
    oldPrice: oldPrices.length > 0 ? Math.max(...oldPrices) : undefined,
    description: toText(pick(product, DESCRIPTION_KEYS)),
    images,
    designer: toText(pick(product, DESIGNER_KEYS)),
    category: toText(pick(product, CATEGORY_KEYS)),
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    links: toStringList(pick(product, ["links", "url"])),
  };
}

// ── Layer 1: a schema'd `json` extraction ────────────────────────────────────

function fromJson(json: Record<string, unknown> | undefined, baseUrl: string): Draft {
  if (!json) return {};
  // A schema often nests the product under `product` or `data`.
  const source = (() => {
    const nested = pick(json, ["product", "data", "item"]);
    return isRecord(nested) && pick(nested, NAME_KEYS) !== undefined ? nested : json;
  })();

  return {
    name: toText(pick(source, NAME_KEYS)),
    price: parsePrice(pick(source, PRICE_KEYS)),
    oldPrice: parsePrice(pick(source, OLD_PRICE_KEYS)),
    description: toText(pick(source, DESCRIPTION_KEYS)),
    images: collectImages(pick(source, IMAGE_KEYS), baseUrl),
    designer: toText(pick(source, DESIGNER_KEYS)),
    category: toText(pick(source, CATEGORY_KEYS)),
    colors: toStringList(pick(source, COLOR_KEYS)),
    sizes: toStringList(pick(source, SIZE_KEYS)),
  };
}

// ── Layer 2: JSON-LD ─────────────────────────────────────────────────────────

const hasType = (node: Record<string, unknown>, type: string): boolean => {
  const value = node["@type"];
  return Array.isArray(value)
    ? value.some((item) => String(item).toLowerCase() === type)
    : String(value ?? "").toLowerCase() === type;
};

/** Every node in a JSON-LD document, `@graph` and nested arrays included. */
function flattenJsonLd(value: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLd(item, out);
  } else if (isRecord(value)) {
    out.push(value);
    if (Array.isArray(value["@graph"])) flattenJsonLd(value["@graph"], out);
  }
  return out;
}

export function findProductJsonLd(html: string): Record<string, unknown> | undefined {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1].trim());
    } catch {
      continue; // A malformed block is not worth failing the whole import over.
    }
    const product = flattenJsonLd(parsed).find((node) => hasType(node, "product"));
    if (product) return product;
  }
  return undefined;
}

function fromJsonLd(html: string | undefined, baseUrl: string): Draft {
  if (!html) return {};
  const product = findProductJsonLd(html);
  if (!product) return {};

  const offers = (() => {
    const value = product.offers;
    const list = Array.isArray(value) ? value : [value];
    return list.find(isRecord);
  })();

  return {
    name: toText(product.name),
    price: parsePrice(offers ? pick(offers, [...PRICE_KEYS, "lowPrice"]) : undefined),
    oldPrice: parsePrice(offers ? pick(offers, [...OLD_PRICE_KEYS, "highPrice"]) : undefined),
    description: toText(product.description),
    images: collectImages(product.image, baseUrl),
    designer: toText(product.brand),
    category: toText(product.category),
    colors: toStringList(product.color),
    sizes: toStringList(product.size),
  };
}

// ── Layer 3: the page's metadata ─────────────────────────────────────────────

function fromMetadata(metadata: Record<string, unknown> | undefined, baseUrl: string): Draft {
  if (!metadata) return {};
  const title = toText(pick(metadata, ["og:title", "ogTitle", "title"]));

  return {
    // Titles are usually `Product — Shop`; the shop's own name is noise here.
    name: title ? title.split(/\s+[|–—]\s+/)[0].trim() : undefined,
    price: parsePrice(pick(metadata, ["product:price:amount", "og:price:amount", "price"])),
    oldPrice: parsePrice(pick(metadata, OLD_PRICE_KEYS)),
    description: toText(pick(metadata, ["og:description", "ogDescription", "description"])),
    images: collectImages(pick(metadata, ["og:image", "ogImage", "image", "twitter:image"]), baseUrl),
    designer: toText(pick(metadata, ["product:brand", "og:brand", ...DESIGNER_KEYS])),
    category: toText(pick(metadata, ["product:category", ...CATEGORY_KEYS])),
  };
}

// ── Layer 4: the markdown ────────────────────────────────────────────────────

const PRICE_IN_TEXT = /(?:R\$|US\$|USD|BRL|EUR|\$|€|£)\s?\d[\d.,]*/i;
const SIZE_TOKEN = /^(XXS|XS|S|M|L|XL|XXL|XXXL|3XL|\d{1,2}(?:[.,]5)?|\d{2}-\d{2})$/i;

function fromMarkdown(markdown: string | undefined, baseUrl: string): Draft {
  if (!markdown) return {};
  const lines = markdown.split("\n");

  const heading = lines.find((line) => /^#\s+\S/.test(line)) ?? lines.find((line) => /^##\s+\S/.test(line));
  const name = heading ? heading.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim() : undefined;

  const images = collectImages(
    [
      ...[...markdown.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)/g)].map((match) => match[1]),
      ...[...markdown.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]),
    ],
    baseUrl
  );

  // A struck-through price next to a live one is the old price, and that is
  // the only shape where guessing is safe — two loose numbers on a page are as
  // likely to be shipping or instalments.
  const struck = markdown.match(new RegExp(`~~\\s*(${PRICE_IN_TEXT.source})\\s*~~`, "i"));
  const priceMatch = markdown.replace(/~~[^~]*~~/g, "").match(PRICE_IN_TEXT);

  const sizes = (() => {
    const index = lines.findIndex((line) => /\b(size|sizes|tamanho|tamanhos)\b/i.test(line));
    if (index === -1) return undefined;
    const tokens = lines
      .slice(index, index + 6)
      .join(" ")
      .split(/[\s,;|[\]()*_-]+/)
      .filter((token) => SIZE_TOKEN.test(token));
    return tokens.length > 0 ? [...new Set(tokens.map((token) => token.toUpperCase()))] : undefined;
  })();

  const description = (() => {
    const start = heading ? lines.indexOf(heading) + 1 : 0;
    const body = lines
      .slice(start)
      .filter((line) => {
        const text = line.trim();
        if (!text || text.startsWith("#") || text.startsWith("|")) return false;
        // Image lines, bare links and nav rows are not description.
        return !/^[!*-]?\s*\[/.test(text) && !text.startsWith("![");
      })
      .join("\n")
      .trim();
    return body ? body.slice(0, 2000).trim() : undefined;
  })();

  return {
    name,
    price: priceMatch ? parsePrice(priceMatch[0]) : undefined,
    oldPrice: struck ? parsePrice(struck[1]) : undefined,
    description,
    images,
    sizes,
  };
}

// ── The merge ────────────────────────────────────────────────────────────────

/**
 * The product a page describes, or null if it does not describe one.
 *
 * A page needs a name and at least one image to count. Category listings, blog
 * posts and the shop's own pages fail one or both, which is exactly the filter
 * a whole-site crawl needs.
 */
export function extractProduct(page: CrawlPage): RawProduct | null {
  const html = page.html ?? page.rawHtml;
  const layers: Array<[ExtractionSource, Draft]> = [
    ["product", fromProductFormat(page.product, page.url)],
    ["json", fromJson(page.json, page.url)],
    ["jsonld", fromJsonLd(html, page.url)],
    ["metadata", fromMetadata(page.metadata, page.url)],
    ["markdown", fromMarkdown(page.markdown, page.url)],
  ];

  const merged: Draft = {};
  let via: ExtractionSource = "markdown";

  for (const [source, draft] of layers) {
    for (const [key, value] of Object.entries(draft) as [keyof Draft, unknown][]) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (merged[key] === undefined) {
        (merged as Record<string, unknown>)[key] = value;
        if (key === "name") via = source;
      }
    }
    // Images are the exception to first-wins: a gallery is usually split
    // between the layers, and more angles of the same product is what the
    // admin wants. Order is kept, so the best layer's image stays the cover.
    if (draft.images?.length) {
      merged.images = [...new Set([...(merged.images ?? []), ...draft.images])];
    }
  }

  if (!merged.name || !merged.images?.length) return null;

  return {
    ...merged,
    name: merged.name,
    images: merged.images.slice(0, 12),
    sourceUrl: page.url,
    via,
  };
}
