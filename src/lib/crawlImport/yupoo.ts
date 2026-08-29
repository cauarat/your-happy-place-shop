/**
 * Yupoo album sites, read as a catalogue.
 *
 * Yupoo is a photo host, not a shop: a supplier's site is a wall of albums,
 * one album per product, and there is no structured product data anywhere on
 * it — no JSON-LD, no prices, no descriptions. What it does have is exactly
 * three things, in markup that has not changed in years: the album's title, its
 * photos at a known set of sizes, and the categories it was filed under.
 *
 * So the album is read here and handed to the rest of the importer as if a
 * crawler had extracted it — a page carrying a `product` object. Everything
 * downstream (our vocabulary, dedupe, re-hosting, the catalogue write) then
 * works exactly as it does for a real shop.
 *
 * The fetching is in `scripts/import-crawl.ts`; this file only reads HTML.
 */
import type { CrawlPage } from "./types";

/** `https://<supplier>.x.yupoo.com/albums` and anything under it. */
export function isYupooUrl(url: string): boolean {
  try {
    return /(^|\.)yupoo\.com$/i.test(new URL(url).host);
  } catch {
    return false;
  }
}

/** The site root for a Yupoo URL — every other page hangs off it. */
export function yupooOrigin(url: string): string {
  return new URL(url).origin;
}

/**
 * The category a Yupoo URL names, if it names one.
 *
 * `--yupoo=<site>/albums` means the whole supplier; `--yupoo=<site>/categories/5287790`
 * means one shelf of it, and a supplier's wall runs to thousands of albums
 * across dozens of categories, so the difference is not a detail. An album URL
 * is deliberately not a category: it is one product, and the caller asking for
 * a single album has said nothing about how to file it.
 */
export function yupooCategoryId(url: string): string | undefined {
  try {
    return new URL(url).pathname.match(/\/categories\/(\d+)/)?.[1];
  } catch {
    return undefined;
  }
}

/**
 * A category page's own name for itself.
 *
 * The heading is rendered by script, so the markup carries the name in
 * `og:title` only — `"Vans | 分类 | BoostMaster… | 又拍图片管家"`, the category
 * first and the site's own furniture after it. Only the first segment is the
 * category; the rest is the same on every page of the site.
 */
export function parseCategoryName(html: string): string | undefined {
  const title = html.match(/<meta property="og:title" content="([^"]*)"/i)?.[1];
  const name = decodeEntities(title?.split("|")[0] ?? "");
  return name || undefined;
}

const attribute = (tag: string, name: string): string | undefined => {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? match[1].trim() : undefined;
};

/**
 * HTML entities that turn up in Yupoo titles.
 *
 * The named handful these sites use, and the numeric form for everything
 * else — decimal or hex. The hex form is not a curiosity: this supplier writes
 * every apostrophe as `&#x27;`, so a title like `Sk8-Low &#x27;Contrast&#x27;`
 * reaches the shop window with the entity still in it unless it is decoded
 * here. An unrecognised code point is left as written rather than guessed at.
 *
 * `&amp;` is decoded last, so that decoding cannot itself spell a new entity.
 */
export function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (entity, code: string) => {
      const point = /^x/i.test(code) ? parseInt(code.slice(1), 16) : Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    })
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export interface AlbumCard {
  id: string;
  url: string;
  title: string;
}

/**
 * The album cards on an index or category page.
 *
 * The two pages write the same card differently — the index puts the
 * attributes on one line with an absolute href, the category pages spread them
 * over several lines with a relative one — so the tag is found first and its
 * attributes read afterwards, rather than matched in a fixed order.
 */
export function parseAlbumCards(html: string, baseUrl: string): AlbumCard[] {
  const cards = new Map<string, AlbumCard>();

  for (const tag of html.match(/<a\s[^>]*album__main[^>]*>/gi) ?? []) {
    const href = attribute(tag, "href");
    const id = href?.match(/\/albums\/(\d+)/)?.[1];
    if (!href || !id) continue;
    cards.set(id, {
      id,
      url: new URL(href, baseUrl).toString(),
      title: decodeEntities(attribute(tag, "title") ?? ""),
    });
  }
  return [...cards.values()];
}

export interface CategoryLink {
  url: string;
  name: string;
}

/** The categories in the site's own nav, in its own words. */
export function parseCategoryLinks(html: string, baseUrl: string): CategoryLink[] {
  const links = new Map<string, CategoryLink>();

  for (const match of html.matchAll(
    /href="((?:https?:\/\/[^"]+)?\/categories\/\d+[^"]*)"[^>]*>\s*(?:<[^>]+>\s*)*([^<]{1,80})/gi
  )) {
    const url = new URL(match[1], baseUrl).toString();
    const name = decodeEntities(match[2]);
    if (name) links.set(url, { url, name });
  }
  return [...links.values()];
}

export interface Album {
  title: string;
  images: string[];
  /** The supplier's own shop, which albums carry in their meta description. */
  shopUrl?: string;
}

/**
 * One album page: its title and every photo in it.
 *
 * Every photo is written into the page three times — the gallery's `big`, a
 * `medium` copy and a `square` thumbnail — so counting `<img>` tags counts each
 * picture three times over. Only the gallery tags carry `data-album-id`, and
 * that is what the album's own photos are taken from; the header cover and the
 * thumbnail strip are left out, and the sizes are normalised so the same
 * picture cannot enter twice under two renderings.
 *
 * Photos are lazy-loaded, so the URL is in `data-src`, with `data-origin-src`
 * (the untouched upload) as the fallback. `src` holds a placeholder.
 */
export function parseAlbumPage(html: string, url: string): Album | null {
  const title =
    decodeEntities(html.match(/class="showalbumheader__gallerytitle"[^>]*>([^<]+)</i)?.[1] ?? "") ||
    decodeEntities(html.match(/<meta property="og:title" content="([^"|]+)/i)?.[1] ?? "");

  const tags = html.match(/<img\s[^>]*>/gi) ?? [];
  const gallery = tags.filter((tag) => attribute(tag, "data-album-id"));

  const images = new Map<string, true>();
  // A page with no gallery markup at all still has its pictures somewhere.
  for (const tag of gallery.length > 0 ? gallery : tags) {
    const source = attribute(tag, "data-src") ?? attribute(tag, "data-origin-src");
    if (!source || !/photo\.yupoo\.com/i.test(source)) continue;
    images.set(atSize(new URL(source, url).toString()), true);
  }

  if (!title || images.size === 0) return null;

  // The album's description field is where these suppliers put the link to
  // their real shop, which is the only other fact the page carries.
  const shopUrl = html
    .match(/<meta name="description"[^>]*content="([^"]*)"/i)?.[1]
    ?.match(/https?:\/\/[^\s"]+/)?.[0];

  return { title, images: [...images.keys()], shopUrl: shopUrl && !isYupooUrl(shopUrl) ? shopUrl : undefined };
}

/**
 * An album as a crawled product page.
 *
 * The description is the album's own title, and that is not a shortcut: these
 * sites carry no product prose anywhere — not in the album, not in the meta
 * description, which holds the supplier's links, and not on the shop those
 * links point at. The specification is written into the title instead, weight
 * and material and fit, so that is what the description can honestly be.
 */
export function albumToPage(
  album: Album,
  albumUrl: string,
  options: { category?: string; brand?: string } = {}
): CrawlPage {
  return {
    url: albumUrl,
    product: {
      title: album.title,
      brand: options.brand,
      category: options.category,
      description: album.title,
      links: album.shopUrl ? [album.shopUrl] : undefined,
      variants: [{ images: album.images.map((url) => ({ url })) }],
    },
  };
}

/**
 * A Yupoo photo URL at the size we want to keep.
 *
 * The same picture is served as `square`, `small`, `medium`, `big` and
 * `original` under one hash. `big` is 1200px on the long edge — enough for a
 * product page, and a third of the weight of the original. The file extension
 * is kept: Yupoo renders a PNG upload as `big.png`, and asking it for `big.jpg`
 * gets nothing.
 */
export function atSize(photoUrl: string, size: "small" | "medium" | "big" | "original" = "big"): string {
  return photoUrl.replace(
    /\/(?:square|small|medium|big|original|[0-9a-f]{6,})\.(jpe?g|png|webp)(\?[^/]*)?$/i,
    (_, extension: string) => `/${size}.${extension}`
  );
}
