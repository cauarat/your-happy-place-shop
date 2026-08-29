/**
 * A crawled product in the shop's own words → a product in ours.
 *
 * The two alias tables at the top are the single place to adjust when the next
 * crawl comes from a shop that names things differently. Everything else works
 * off the vocabulary already in the catalogue, so an import cannot invent a
 * fourteenth spelling of "Footwear".
 */
import type { Product } from "@/data/products";
import { FOOTWEAR_TILE_CROP } from "@/lib/cropUtils";
import type { RawProduct } from "./types";

/**
 * Words a shop might use for one of our categories. Matched as whole words
 * against the crawled category first, then against the product name.
 */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  Footwear: ["shoe", "shoes", "sneaker", "sneakers", "trainer", "trainers", "boot", "boots", "sandal", "sandals", "slide", "slides", "slipper", "loafer", "mule", "calcado", "calçado", "tenis", "tênis", "sapato", "bota", "chinelo"],
  Bags: ["bag", "bags", "backpack", "tote", "clutch", "luggage", "suitcase", "trunk", "duffle", "pouch", "bolsa", "mochila", "mala"],
  Clothing: ["clothing", "apparel", "shirt", "t-shirt", "tshirt", "tee", "hoodie", "sweater", "sweatshirt", "knit", "jacket", "coat", "puffer", "pants", "trousers", "jeans", "shorts", "dress", "skirt", "roupa", "camisa", "camiseta", "calca", "calça", "jaqueta", "casaco", "moletom"],
  Accessories: ["accessory", "accessories", "belt", "wallet", "scarf", "glove", "sunglasses", "eyewear", "watch", "acessorio", "acessório", "cinto", "carteira", "oculos", "óculos", "relogio", "relógio"],
  Jewelry: ["jewelry", "jewellery", "necklace", "bracelet", "ring", "earring", "pendant", "chain", "joia", "jóia", "colar", "pulseira", "anel", "brinco"],
  Caps: ["cap", "caps", "hat", "beanie", "bucket", "bone", "boné", "chapeu", "chapéu", "gorro"],
  "T-Shirt": ["t-shirt", "tshirt", "tee", "camiseta"],
  "Tank top": ["tank top", "tank", "regata"],
};

/** Spellings of a designer we already carry. Keys are matched case-insensitively. */
export const DESIGNER_ALIASES: Record<string, string[]> = {
  Hermes: ["hermès"],
  "Fear of God": ["fear of god essentials", "essentials"],
  Maison: ["maison margiela", "margiela"],
  Golden: ["golden goose"],
  Van: ["van cleef", "van cleef & arpels"],
  Zegna: ["ermenegildo zegna"],
  Brunello: ["brunello cucinelli"],
  Rier: ["rier"],
};

/**
 * Categories where a shopper may buy more than one. Same rule the catalogue
 * already enforces in `initStore`'s migration — kept identical on purpose, so
 * an imported product does not get flipped the first time a browser loads it.
 */
const QUANTITY_CATEGORIES = ["bags", "caps", "accessories"];

export const allowsQuantity = (category: string): boolean =>
  QUANTITY_CATEGORIES.includes(category.toLowerCase());

/** Lowercase, unaccented, punctuation as spaces — for comparing words only. */
export function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const containsWord = (haystack: string, needle: string): boolean =>
  new RegExp(`(^| )${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`).test(haystack);

/**
 * The catalogue's own category for this product, or undefined.
 *
 * The crawled category is tried first, then the product name — a shop that
 * files everything under "New Arrivals" still calls a sneaker a sneaker.
 */
export function normalizeCategory(
  raw: string | undefined,
  known: string[],
  name = ""
): string | undefined {
  const candidates = [raw, name].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const token = normalizeToken(candidate);
    if (!token) continue;

    const direct = known.find((category) => normalizeToken(category) === token);
    if (direct) return direct;

    // Singular/plural in either direction — the catalogue says "hoodies" where
    // a shop says "HOODIE" — and a category buried in a breadcrumb
    // ("Men > Shoes").
    const partial = known.find((category) => {
      const catToken = normalizeToken(category);
      const singular = catToken.endsWith("s") ? catToken.slice(0, -1) : catToken;
      return (
        containsWord(token, catToken) ||
        containsWord(token, `${catToken}s`) ||
        containsWord(token, singular)
      );
    });
    if (partial) return partial;

    for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
      if (!aliases.some((alias) => containsWord(token, normalizeToken(alias)))) continue;
      // Only answer with a category the catalogue actually has.
      const match = known.find((entry) => normalizeToken(entry) === normalizeToken(category));
      if (match) return match;
    }
  }
  return undefined;
}

/** The catalogue's own designer for this product, or undefined. */
export function normalizeDesigner(
  raw: string | undefined,
  known: string[],
  name = ""
): string | undefined {
  const candidates = [raw, name].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const token = normalizeToken(candidate);
    if (!token) continue;

    const direct = known.find((designer) => normalizeToken(designer) === token);
    if (direct) return direct;

    for (const [designer, aliases] of Object.entries(DESIGNER_ALIASES)) {
      if (!aliases.some((alias) => token.includes(normalizeToken(alias)))) continue;
      const match = known.find((entry) => normalizeToken(entry) === normalizeToken(designer));
      if (match) return match;
    }

    // A known designer's name inside a longer string ("Nike Air Force 1").
    const embedded = known
      .filter((designer) => containsWord(token, normalizeToken(designer)))
      .sort((a, b) => b.length - a.length)[0];
    if (embedded) return embedded;
  }

  // Nothing known matched, but the crawl did name a brand — carry it over as
  // its own designer rather than losing it. `getDesigners()` picks new ones up
  // from the products themselves.
  return raw ? titleCase(raw) : undefined;
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\p{L}[\p{L}'’-]*/gu, (word) =>
      word.length <= 3 && word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1).toLowerCase()
    );
}

export interface MapOptions {
  /** Categories the catalogue already uses. */
  categories: string[];
  /** Designers the catalogue already uses. */
  designers: string[];
  /** Used when nothing matches — the `--category` flag. */
  defaultCategory?: string;
  /** Used when nothing matches — the `--designer` flag. */
  defaultDesigner?: string;
  /** Base for ids and `createdAt`; the index keeps them unique within a run. */
  now?: number;
  index?: number;
}

export interface MappedProduct {
  product: Product;
  /** Things the admin should look at after the import. */
  warnings: string[];
}

/**
 * The product record the catalogue stores.
 *
 * Ids follow the catalogue's existing convention — a millisecond timestamp as
 * a string — offset by the item's position so a run cannot collide with
 * itself.
 */
/** The one category whose tiles are cropped rather than letterboxed. */
const isFootwear = (category: string): boolean => category.toLowerCase() === "footwear";

export function toProduct(raw: RawProduct, options: MapOptions): MappedProduct {
  const warnings: string[] = [];
  const now = options.now ?? Date.now();
  const index = options.index ?? 0;

  const name = raw.name.replace(/\s+/g, " ").trim();

  // A category the catalogue has never used is kept as the shop wrote it,
  // rather than thrown away: an uncategorised product is worse than a new
  // category, and `getCategories()` picks new ones up from the products
  // themselves. The report says which are new.
  const matchedCategory = normalizeCategory(raw.category, options.categories, name);
  const category =
    matchedCategory ?? options.defaultCategory ?? (raw.category ? titleCase(raw.category) : "");
  if (!category) warnings.push("no category matched — set one in the admin");
  else if (!matchedCategory && !options.defaultCategory) warnings.push(`new category "${category}"`);

  const designer =
    normalizeDesigner(raw.designer, options.designers, name) ?? options.defaultDesigner ?? "";
  if (!designer) warnings.push("no designer matched — set one in the admin");
  else if (!options.designers.some((entry) => normalizeToken(entry) === normalizeToken(designer))) {
    warnings.push(`new designer "${designer}"`);
  }

  const price = raw.price ?? 0;
  if (!raw.price) warnings.push("no price found — imported as 0");

  const product: Product = {
    id: String(now + index),
    name,
    category,
    designer,
    price,
    image: raw.images[0],
    createdAt: now + index,
    rating: 5,
    removeBackground: false,
    images: raw.images,
    // The page it came from, plus anywhere else it lives — a supplier's album
    // usually points at the shop the goods are actually ordered from. The
    // catalogue already carries two links per product for exactly this.
    productLinks: [...new Set([raw.sourceUrl, ...(raw.links ?? [])])],
    allowQuantity: allowsQuantity(category),
  };

  // Footwear arrives with the display crop the rest of the catalogue's shoes
  // already use, rather than waiting for someone to notice a letterboxed tile
  // and set it by hand. Every one of the 346 footwear products that had a crop
  // before this carried exactly this value.
  if (isFootwear(category)) product.displayCrops = { 0: { ...FOOTWEAR_TILE_CROP } };

  if (designer) product.designers = [designer];
  if (raw.oldPrice && raw.oldPrice > price) product.oldPrice = raw.oldPrice;
  if (raw.description) product.description = raw.description;
  if (raw.colors?.length) product.colors = raw.colors;
  if (raw.sizes?.length) product.sizes = raw.sizes;

  return { product, warnings };
}

/** The categories and designers a catalogue already uses, as the mapper needs them. */
export function vocabularyOf(products: Product[]): { categories: string[]; designers: string[] } {
  return {
    categories: [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    designers: [
      ...new Set(products.flatMap((product) => product.designers ?? [product.designer]).filter(Boolean)),
    ].sort(),
  };
}
