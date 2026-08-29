/**
 * Turns a Firecrawl export into catalogue products.
 *
 *     npm run catalog:import -- --url=https://shop.com/x   # crawl it now
 *     npm run catalog:import -- --dry-run     # report only, catalogue untouched
 *     npm run catalog:import                  # import an export already on disk
 *     npm run catalog:import -- --limit=3     # a trial run of three
 *
 * Either give it `--url` and it crawls the site itself through the Firecrawl
 * API, or put an export in `data/firecrawl/` — a `.json`, a `.jsonl`, or the
 * folder of per-page files Firecrawl writes — and it reads the newest thing in
 * there unless `--in` says otherwise. A fetched crawl is saved to that same
 * folder, so re-importing it later costs no credits.
 *
 * What it does, in order: flattens the export into pages, extracts a product
 * from each, translates the shop's categories and designers into ours, drops
 * anything already in the catalogue, re-hosts every image on our own R2 bucket,
 * and writes the result into `src/data/catalog.json`. The reasoning about what
 * a product *is* lives in `src/lib/crawlImport/` and is tested there; this file
 * is the disk, the network and the bucket.
 *
 * Images are re-hosted rather than hot-linked on purpose: a crawled shop can
 * change its URLs, block us, or go away, and the catalogue would go with it.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, extname, isAbsolute, resolve } from "node:path";
import type { Product } from "../src/data/products";
import {
  ROOT,
  CATALOG_PATH,
  fail,
  shortPath,
  readJson,
  readCatalogue,
  writeCatalogue,
  bumpCatalogVersion,
} from "./catalog-file";
import { connectR2, readEnv, uploadBytes, type R2 } from "./r2";
import {
  buildImportPlan,
  applyImportPlan,
  vocabularyOf,
  parseCrawlText,
  parseMarkdownFile,
  normalizeCrawl,
  modeFor,
  scrapeBody,
  crawlBody,
  exportFileName,
  FIRECRAWL_API,
  isYupooUrl,
  yupooOrigin,
  yupooCategoryId,
  parseAlbumCards,
  parseCategoryLinks,
  parseCategoryName,
  parseAlbumPage,
  albumToPage,
  atSize,
  normalizeCategory,
  type AlbumCard,
  type CrawlMode,
  type CrawlPage,
  type ImportDecision,
} from "../src/lib/crawlImport";

const CRAWL_DIR = join(ROOT, "data", "firecrawl");
const CACHE_PATH = join(CRAWL_DIR, ".image-cache.json");
const REPORT_PATH = join(CRAWL_DIR, "last-import-report.json");

/** Images are fetched and uploaded this many at a time. */
const IMAGE_CONCURRENCY = 4;
const IMAGE_ATTEMPTS = 2;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

// ── Flags ────────────────────────────────────────────────────────────────────

interface Flags {
  in?: string;
  url?: string;
  yupoo?: string;
  mode?: CrawlMode;
  maxPages: number;
  withHtml: boolean;
  dryRun: boolean;
  limit?: number;
  category?: string;
  designer?: string;
  update: boolean;
  byLink: boolean;
  images: boolean;
  bump: boolean;
}

function parseFlags(argv: string[]): Flags {
  // 50 pages is the credit brake. Firecrawl's own default is 10,000, which is
  // not a number anyone wants to meet by accident.
  const flags: Flags = { dryRun: false, update: false, byLink: false, images: true, bump: true, maxPages: 50, withHtml: false };

  for (const arg of argv) {
    const [name, value] = arg.replace(/^--/, "").split("=");
    switch (name) {
      case "in": flags.in = value; break;
      case "url": flags.url = value; break;
      case "yupoo": flags.yupoo = value; break;
      case "scrape": flags.mode = "scrape"; break;
      case "crawl": flags.mode = "crawl"; break;
      case "max-pages": flags.maxPages = Number(value); break;
      case "with-html": flags.withHtml = true; break;
      case "dry-run": flags.dryRun = true; break;
      case "limit": flags.limit = Number(value); break;
      case "category": flags.category = value; break;
      case "designer": flags.designer = value; break;
      case "update": flags.update = true; break;
      case "by-link": flags.byLink = true; break;
      case "no-images": flags.images = false; break;
      case "no-bump": flags.bump = false; break;
      case "help":
        console.log(
          "\n  npm run catalog:import -- [flags]\n\n" +
            "    --url=<url>       crawl this with Firecrawl now, then import it\n" +
            "    --yupoo=<url>     read a Yupoo album site directly (no API, no credits)\n" +
            "    --scrape          --url is one product page (default: guessed from the URL)\n" +
            "    --crawl           --url is a site or category to walk\n" +
            "    --max-pages=N     pages a crawl may fetch, and pay for (default: 50)\n" +
            "    --with-html       also fetch each page's HTML, for shops the\n" +
            "                      product extractor cannot read (much larger)\n" +
            "    --in=<file|dir>   what to import (default: newest in data/firecrawl/)\n" +
            "    --dry-run         report what would happen, change nothing\n" +
            "    --limit=N         import at most N products\n" +
            "    --category=Name   category for products whose own does not match\n" +
            "    --designer=Name   designer for products whose own does not match\n" +
            "    --update          refresh products already in the catalogue\n" +
            "    --by-link         two pages are two products, even under one name\n" +
            "    --no-images       keep the crawled image URLs, do not re-host them\n" +
            "    --no-bump         do not raise CATALOG_VERSION\n"
        );
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) fail(`Unknown flag: ${arg}. Try --help.`);
    }
  }
  if (flags.limit !== undefined && (!Number.isFinite(flags.limit) || flags.limit < 1)) {
    fail("--limit needs a positive number.");
  }
  if (!Number.isFinite(flags.maxPages) || flags.maxPages < 1) {
    fail("--max-pages needs a positive number.");
  }
  const sources = [flags.in, flags.url, flags.yupoo].filter(Boolean).length;
  if (sources > 1) fail("Give one of --in, --url or --yupoo, not several.");
  return flags;
}

// ── Reading the crawl ────────────────────────────────────────────────────────

const CRAWL_EXTENSIONS = new Set([".json", ".jsonl", ".ndjson", ".md", ".markdown"]);

/** Every crawl file under a path, newest first at the top level. */
function filesUnder(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  const entries: string[] = [];
  for (const name of readdirSync(path)) {
    if (name.startsWith(".")) continue; // our own cache and report live here
    const full = join(path, name);
    if (statSync(full).isDirectory()) entries.push(...filesUnder(full));
    else if (CRAWL_EXTENSIONS.has(extname(name).toLowerCase())) entries.push(full);
  }
  return entries;
}

/** The newest crawl file or folder in `data/firecrawl/`. */
function newestInCrawlDir(): string {
  if (!existsSync(CRAWL_DIR)) {
    fail(
      `No ${shortPath(CRAWL_DIR)}/ folder yet.\n` +
        "  Create it and put the Firecrawl export inside, or pass --in=<path>."
    );
  }
  const entries = readdirSync(CRAWL_DIR)
    .filter((name) => !name.startsWith("."))
    .map((name) => join(CRAWL_DIR, name))
    .filter((path) => statSync(path).isDirectory() || CRAWL_EXTENSIONS.has(extname(path).toLowerCase()))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (entries.length === 0) {
    fail(`Nothing to import in ${shortPath(CRAWL_DIR)}/ — put the Firecrawl export there.`);
  }
  return entries[0];
}

function readPages(path: string): CrawlPage[] {
  const pages: CrawlPage[] = [];
  for (const file of filesUnder(path)) {
    const text = readFileSync(file, "utf8");
    if (/\.(md|markdown)$/i.test(file)) {
      const page = parseMarkdownFile(file.split("/").pop() ?? file, text);
      if (page) pages.push(page);
    } else {
      pages.push(...parseCrawlText(text));
    }
  }
  return pages;
}

// ── R2 ───────────────────────────────────────────────────────────────────────

/**
 * The aspect ratio of an image, from its header alone.
 *
 * Header-only because this runs on every photo of every import and the answer
 * is four numbers: decoding megapixels to learn the shape would be the slowest
 * thing the importer does. Returns null for a format not recognised, which is
 * a reason to say nothing rather than to guess.
 */
function imageAspect(bytes: Uint8Array): number | null {
  // PNG: the IHDR is always the first chunk, width and height at a fixed offset.
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return height > 0 ? width / height : null;
  }

  // JPEG: walk the markers to the start-of-frame, which carries the size.
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length - 9) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      // SOF0-SOF15, excluding the four that are not frame headers.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const height = view.getUint16(offset + 5);
        const width = view.getUint16(offset + 7);
        return height > 0 ? width / height : null;
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      offset += 2 + view.getUint16(offset + 2);
    }
  }
  return null;
}

/** Aspect ratio of each source image, by its original URL. */
const aspectOf = new Map<string, number>();

/**
 * Fetches one image and puts it in the bucket, returning its public URL.
 *
 * `referer` is the page the image was found on, not the image's own host, and
 * it is not a nicety: photo hosts check it. Yupoo serves its pictures only to a
 * request that came from the album site — anything else gets a 567 and an HTML
 * error page.
 */
async function rehost(sourceUrl: string, r2: R2, referer?: string): Promise<string> {
  const response = await fetch(sourceUrl, {
    headers: {
      // Some shops answer 403 to a request with no browser-shaped headers.
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
      referer: referer ?? new URL(sourceUrl).origin,
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) throw new Error(`not an image (${type || "no content-type"})`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("empty file");
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error(`too large (${Math.round(bytes.byteLength / 1024 / 1024)}MB)`);

  const aspect = imageAspect(bytes);
  if (aspect) aspectOf.set(sourceUrl, aspect);

  return uploadBytes(bytes, type, r2);
}

interface ImageStats {
  uploaded: number;
  cached: number;
  failed: number;
  failures: { url: string; error: string }[];
  /**
   * Footwear whose cover photo is wider than it is tall.
   *
   * The tile is portrait, so a landscape photo letterboxes in it, and the
   * footwear crop cannot rescue that — covering a 4/5 tile with a 3:2 photo
   * cuts the toe and the heel off the shoe. This is the condition that has to
   * be re-framed, and it went unnoticed for a whole supplier once already.
   */
  landscape: { name: string; aspect: number }[];
}

/**
 * Re-hosts every image in the plan, in place.
 *
 * A product whose cover image cannot be fetched is dropped: half a product
 * with a broken picture is worse in the shop than one that was never imported,
 * and the report says which ones and why. Secondary images that fail are just
 * left out of the gallery.
 */
async function rehostImages(
  decisions: ImportDecision[],
  r2: R2,
  cache: Record<string, string>
): Promise<{ kept: ImportDecision[]; dropped: ImportDecision[]; stats: ImageStats }> {
  const stats: ImageStats = { uploaded: 0, cached: 0, failed: 0, failures: [], landscape: [] };

  // Every image remembers the page it came from, which is the referer that
  // will be sent for it.
  const refererFor = new Map<string, string>();
  for (const decision of decisions) {
    const page = decision.product.productLinks?.[0];
    if (!page) continue;
    let origin: string;
    try {
      origin = `${new URL(page).origin}/`;
    } catch {
      continue;
    }
    for (const image of decision.product.images ?? []) {
      if (!refererFor.has(image)) refererFor.set(image, origin);
    }
  }

  const sources = [...new Set(decisions.flatMap((decision) => decision.product.images ?? []))];
  const pending = sources.filter((url) => !cache[url]);
  stats.cached = sources.length - pending.length;

  let index = 0;
  let done = 0;
  const worker = async () => {
    while (index < pending.length) {
      const url = pending[index++];
      for (let attempt = 1; attempt <= IMAGE_ATTEMPTS; attempt++) {
        try {
          cache[url] = await rehost(url, r2, refererFor.get(url));
          stats.uploaded++;
          break;
        } catch (error) {
          if (attempt === IMAGE_ATTEMPTS) {
            stats.failed++;
            stats.failures.push({ url, error: error instanceof Error ? error.message : String(error) });
          }
        }
      }
      done++;
      process.stdout.write(`\r  images: ${done}/${pending.length} fetched`);
    }
  };
  await Promise.all(Array.from({ length: IMAGE_CONCURRENCY }, worker));
  if (pending.length > 0) process.stdout.write("\n");

  const kept: ImportDecision[] = [];
  const dropped: ImportDecision[] = [];

  for (const decision of decisions) {
    const sources = decision.product.images ?? [];
    const images = sources.map((url) => cache[url]).filter(Boolean);
    if (images.length === 0) {
      dropped.push({ ...decision, reason: "every image failed to download" });
      continue;
    }

    const coverSource = sources.find((url) => cache[url]);
    const aspect = coverSource ? aspectOf.get(coverSource) : undefined;
    if (aspect && aspect > 1 && decision.product.category.toLowerCase() === "footwear") {
      stats.landscape.push({ name: decision.product.name, aspect });
    }

    decision.product.images = images;
    decision.product.image = images[0];
    kept.push(decision);
  }

  return { kept, dropped, stats };
}

// ── Firecrawl ────────────────────────────────────────────────────────────────

/** How long a crawl job may run before we stop waiting on it. */
const CRAWL_DEADLINE_MS = 15 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function firecrawlKey(): string {
  const key = readEnv(["FIRECRAWL_API_KEY"]).FIRECRAWL_API_KEY;
  if (!key) {
    fail(
      "FIRECRAWL_API_KEY not found.\n" +
        "  Add it to .env (git-ignored) as:\n\n" +
        "      FIRECRAWL_API_KEY=fc-your_key_here\n\n" +
        "  Note there is no VITE_ prefix — that prefix is what would publish the\n" +
        "  key in the browser bundle. Get a key at https://firecrawl.dev."
    );
  }
  return key;
}

/** One call to Firecrawl, with its failures translated into plain sentences. */
async function callFirecrawl(
  url: string,
  key: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${key}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const detail = typeof payload.error === "string" ? payload.error : response.statusText;
    if (response.status === 401 || response.status === 403) {
      fail(`Firecrawl rejected the key (${response.status}). Check FIRECRAWL_API_KEY in .env.`);
    }
    if (response.status === 402) fail(`Firecrawl says the account is out of credits: ${detail}`);
    if (response.status === 429) fail(`Firecrawl rate limit reached: ${detail}. Try again shortly.`);
    fail(`Firecrawl answered ${response.status}: ${detail}`);
  }

  return payload;
}

/**
 * Waits for a crawl job, then collects everything it found.
 *
 * Two phases on purpose. While the job runs, the status endpoint keeps handing
 * back the pages it has so far — collecting during the wait would count the
 * same page once per poll — so the wait only watches the counter. The data is
 * read once at the end, following `next` until the last chunk.
 */
async function collectCrawl(id: string, key: string): Promise<unknown[]> {
  const statusUrl = `${FIRECRAWL_API}/crawl/${id}`;
  const deadline = Date.now() + CRAWL_DEADLINE_MS;

  for (;;) {
    const status = await callFirecrawl(statusUrl, key);
    const state = String(status.status ?? "");

    if (state === "failed") fail(`The crawl failed: ${String(status.error ?? "no reason given")}`);
    process.stdout.write(`\r  crawling: ${status.completed ?? 0}/${status.total ?? "?"} pages`);
    if (state === "completed") break;

    if (Date.now() > deadline) {
      process.stdout.write("\n");
      fail(`The crawl is still running after ${CRAWL_DEADLINE_MS / 60000} minutes. Job id: ${id}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  process.stdout.write("\n");

  const documents: unknown[] = [];
  let page: string | undefined = statusUrl;
  while (page) {
    const chunk: Record<string, unknown> = await callFirecrawl(page, key);
    if (Array.isArray(chunk.data)) documents.push(...chunk.data);
    page = typeof chunk.next === "string" ? chunk.next : undefined;
  }
  return documents;
}

/**
 * Fetches a URL through Firecrawl and saves what came back.
 *
 * The saved file is a normal export, so everything downstream — and every later
 * re-import — works the same whether the pages came from the API or from a file
 * you exported by hand. Re-running against the saved file costs no credits.
 */
async function fetchFromFirecrawl(url: string, flags: Flags): Promise<{ pages: CrawlPage[]; savedTo: string }> {
  const key = firecrawlKey();
  const mode = modeFor(url, flags.mode);
  const options = { withHtml: flags.withHtml };

  let documents: unknown[];
  if (mode === "scrape") {
    console.log(`  Scraping one page (pass --crawl to walk the whole site instead)`);
    const response = await callFirecrawl(`${FIRECRAWL_API}/scrape`, key, scrapeBody(url, options));
    documents = response.data ? [response.data] : [];
  } else {
    console.log(`  Crawling, up to ${flags.maxPages} pages (--max-pages changes that)`);
    const started = await callFirecrawl(`${FIRECRAWL_API}/crawl`, key, crawlBody(url, flags.maxPages, options));
    const id = typeof started.id === "string" ? started.id : undefined;
    if (!id) fail("Firecrawl accepted the crawl but returned no job id.");
    documents = await collectCrawl(id, key);
  }

  if (documents.length === 0) fail("Firecrawl returned nothing for that URL.");

  mkdirSync(CRAWL_DIR, { recursive: true });
  const savedTo = join(CRAWL_DIR, exportFileName(url));
  writeFileSync(savedTo, JSON.stringify({ success: true, data: documents }, null, 2));
  console.log(`  ${documents.length} pages fetched · saved to ${shortPath(savedTo)}`);

  return { pages: normalizeCrawl({ data: documents }), savedTo };
}

// ── Yupoo ────────────────────────────────────────────────────────────────────

/** Yupoo answers 567 to anything that does not look like a browser. */
const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

const ALBUM_CONCURRENCY = 4;
const POLITE_DELAY_MS = 250;

/**
 * One page of HTML, retried.
 *
 * Yupoo sits behind Cloudflare and hands out the occasional 5xx under no
 * particular provocation. A single one of those used to end a walk that had
 * already spent minutes reading the site, which is a poor trade for a failure
 * that goes away on its own a second later.
 */
async function getHtml(url: string, referer: string, attempts = 3): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: { ...BROWSER_HEADERS, referer } });
      // 4xx is an answer, not a hiccup — retrying it just wastes time.
      if (!response.ok && (response.status < 500 || attempt === attempts)) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }
      if (response.ok) return response.text();
    } catch (error) {
      if (attempt === attempts) throw error;
    }
    await sleep(attempt * 1500);
  }
}

/**
 * Every album card in one category, walking its pages.
 *
 * The pager is drawn by script and carries no "next" href to follow, so the
 * loop asks for the page after the one it has until a page brings nothing new.
 * The cap is a guard against a site that answers page 31 with page 1 for ever.
 *
 * The category's own name for itself comes back with the cards: on a category
 * page it is in `og:title` and nowhere else, and the caller needs it to file
 * what it just read.
 *
 * A page that will not load ends the walk but does not throw away the pages
 * that did: the albums already read are still albums. The error comes back
 * alongside them, because what a partial read means is the caller's to decide.
 */
async function readCategoryAlbums(
  categoryUrl: string,
  origin: string,
  referer: string
): Promise<{ cards: AlbumCard[]; name?: string; error?: string }> {
  const albums = new Map<string, AlbumCard>();
  let name: string | undefined;
  let error: string | undefined;

  try {
    for (let page = 1; page <= 30; page++) {
      const separator = categoryUrl.includes("?") ? "&" : "?";
      const html = await getHtml(`${categoryUrl}${separator}page=${page}`, referer);
      name ??= parseCategoryName(html);
      const found = parseAlbumCards(html, origin);
      if (found.every((card) => albums.has(card.id))) break;
      for (const card of found) albums.set(card.id, card);
      await sleep(POLITE_DELAY_MS);
    }
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.message : String(thrown);
  }
  return { cards: [...albums.values()], name, error };
}

/**
 * Reads a whole Yupoo supplier site: every album, its photos and its category.
 *
 * No API and no credits — Yupoo serves its markup to a plain request, so this
 * is just HTTP. The result is written as a normal export, so the rest of the
 * import is the same code path a Firecrawl crawl takes.
 *
 * Categories overlap heavily on these sites — the same t-shirt sits in ALL
 * BLANKS, in PREMIUM COLLECTION and in T-SHIRT — so one has to be chosen. A
 * category the catalogue already uses wins over one it does not, which is what
 * separates a garment type from a supplier's marketing collection; between two
 * of equal standing, the smaller one wins, being the more specific claim.
 *
 * A URL naming one category reads that category alone. A supplier's wall runs
 * to thousands of albums across dozens of categories, so "the shelf I linked"
 * and "the whole warehouse" are not the same request, and the overlap the rest
 * of this function exists to resolve cannot arise: one category is the only
 * one voting.
 */
async function readYupooSite(
  url: string,
  flags: Flags,
  knownCategories: string[]
): Promise<{ pages: CrawlPage[]; savedTo: string }> {
  const origin = yupooOrigin(url);
  const referer = `${origin}/`;
  const only = yupooCategoryId(url);

  const cards = new Map<string, { url: string; title: string }>();
  const categoryOf = new Map<string, { name: string; size: number; known: boolean }>();

  if (only) {
    const shelf = await readCategoryAlbums(url, origin, referer);
    const name = shelf.name;
    const known = Boolean(name && normalizeCategory(name, knownCategories));
    for (const card of shelf.cards) {
      cards.set(card.id, card);
      if (name) categoryOf.set(card.id, { name, size: shelf.cards.length, known });
    }
    console.log(
      `  ${name ?? `category ${only}`}: ${shelf.cards.length} albums` +
        (name && !known ? " (not a catalogue category)" : "")
    );
    // The one category asked for is the whole request, so a page of it that
    // would not load is worth saying out loud rather than quietly importing
    // less than was asked for.
    if (shelf.error) console.log(`  ! stopped early: ${shelf.error}`);
    if (shelf.cards.length === 0) fail(`Nothing readable at ${url}${shelf.error ? ` — ${shelf.error}` : ""}`);
  } else {
    const index = await getHtml(`${origin}/albums`, referer);
    for (const card of parseAlbumCards(index, origin)) cards.set(card.id, card);

    for (const category of parseCategoryLinks(index, origin)) {
      const found = await readCategoryAlbums(category.url, origin, referer);
      for (const card of found.cards) cards.set(card.id, card);

      if (found.error) {
        // A category that will not load costs its own filing, nothing more: the
        // albums are still reachable from the index and from every other
        // category they sit in.
        console.log(`  ! ${category.name}: ${found.error}`);
        continue;
      }

      const known = Boolean(normalizeCategory(category.name, knownCategories));
      for (const card of found.cards) {
        const held = categoryOf.get(card.id);
        const better =
          !held || (known && !held.known) || (known === held.known && found.cards.length < held.size);
        if (better) categoryOf.set(card.id, { name: category.name, size: found.cards.length, known });
      }
      console.log(
        `  ${category.name}: ${found.cards.length} albums${known ? "" : " (not a catalogue category)"}`
      );
    }
  }

  const wanted = [...cards.entries()].slice(0, flags.limit ?? cards.size);
  console.log(
    `\n  ${cards.size} albums ${only ? "in the category" : "on the site"}` +
      (wanted.length < cards.size ? `, reading ${wanted.length}` : "")
  );

  const pages: CrawlPage[] = [];
  const failures: string[] = [];
  let index_ = 0;
  let done = 0;

  const worker = async () => {
    while (index_ < wanted.length) {
      const [id, card] = wanted[index_++];
      try {
        const html = await getHtml(card.url, referer);
        const album = parseAlbumPage(html, card.url);
        if (album) {
          pages.push(
            albumToPage(
              { ...album, title: album.title || card.title, images: album.images.map((photo) => atSize(photo)) },
              card.url,
              { category: categoryOf.get(id)?.name, brand: flags.designer }
            )
          );
        } else {
          failures.push(`${card.url} — no photos`);
        }
      } catch (error) {
        failures.push(`${card.url} — ${error instanceof Error ? error.message : String(error)}`);
      }
      done++;
      process.stdout.write(`\r  albums: ${done}/${wanted.length} read`);
      await sleep(POLITE_DELAY_MS);
    }
  };
  await Promise.all(Array.from({ length: ALBUM_CONCURRENCY }, worker));
  process.stdout.write("\n");
  for (const failure of failures) console.log(`  ! ${failure}`);

  mkdirSync(CRAWL_DIR, { recursive: true });
  const savedTo = join(CRAWL_DIR, exportFileName(origin));
  writeFileSync(savedTo, JSON.stringify({ success: true, data: pages }, null, 2));
  console.log(`  saved to ${shortPath(savedTo)}`);

  return { pages, savedTo };
}

// ── Writing ──────────────────────────────────────────────────────────────────

// ── The run ──────────────────────────────────────────────────────────────────

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  const catalogue = readCatalogue();

  let input: string;
  let pages: CrawlPage[];

  if (flags.yupoo) {
    console.log(`\n  ${flags.yupoo}`);
    const read = await readYupooSite(flags.yupoo, flags, vocabularyOf(catalogue).categories);
    input = read.savedTo;
    pages = read.pages;
  } else if (flags.url) {
    console.log(`\n  ${flags.url}`);
    const fetched = await fetchFromFirecrawl(flags.url, flags);
    input = fetched.savedTo;
    pages = fetched.pages;
  } else {
    input = flags.in ? (isAbsolute(flags.in) ? flags.in : resolve(ROOT, flags.in)) : newestInCrawlDir();
    if (!existsSync(input)) fail(`No such file or folder: ${flags.in}`);
    console.log(`\n  Reading ${shortPath(input)}`);
    pages = readPages(input);
  }

  if (pages.length === 0) fail("No crawl pages found in there. Is it a Firecrawl export?");

  console.log(`  ${pages.length} pages · ${catalogue.length} products already in the catalogue`);

  const plan = buildImportPlan(pages, catalogue, {
    limit: flags.limit,
    update: flags.update,
    byLinkOnly: flags.byLink,
    defaultCategory: flags.category,
    defaultDesigner: flags.designer,
  });

  let writable = plan.decisions.filter((decision) => decision.action !== "skip");
  const skipped = plan.decisions.filter((decision) => decision.action === "skip");
  let dropped: ImportDecision[] = [];
  let imageStats: ImageStats = { uploaded: 0, cached: 0, failed: 0, failures: [], landscape: [] };

  if (writable.length > 0 && flags.images && !flags.dryRun) {
    const cache = readJson<Record<string, string>>(CACHE_PATH, {});
    const result = await rehostImages(writable, connectR2(), cache);
    writable = result.kept;
    dropped = result.dropped;
    imageStats = result.stats;
    mkdirSync(CRAWL_DIR, { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  }

  const created = writable.filter((decision) => decision.action === "create");
  const updated = writable.filter((decision) => decision.action === "update");

  if (!flags.dryRun && writable.length > 0) {
    writeCatalogue(applyImportPlan(catalogue, writable));
    if (flags.bump) {
      const version = bumpCatalogVersion();
      if (version) {
        console.log(
          `\n  CATALOG_VERSION → ${version}. Every browser reseeds its catalogue on the next visit,\n` +
            "  which DISCARDS product edits made in the admin panel on that device."
        );
      }
    }
  }

  report(plan, { created, updated, skipped, dropped, imageStats, flags, input, pages: pages.length });
}

interface ReportInput {
  created: ImportDecision[];
  updated: ImportDecision[];
  skipped: ImportDecision[];
  dropped: ImportDecision[];
  imageStats: ImageStats;
  flags: Flags;
  input: string;
  pages: number;
}

function report(plan: ReturnType<typeof buildImportPlan>, run: ReportInput) {
  const { created, updated, skipped, dropped, imageStats, flags } = run;

  const needsReview = [...created, ...updated]
    .map((decision) => ({
      id: decision.product.id,
      name: decision.product.name,
      warnings: plan.warnings[decision.product.id] ?? [],
    }))
    .filter((entry) => entry.warnings.length > 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    input: shortPath(run.input),
    dryRun: flags.dryRun,
    pages: { total: run.pages, becameProducts: plan.decisions.length, notProducts: plan.skippedPages.length },
    created: created.map((d) => ({ id: d.product.id, name: d.product.name, url: d.product.productLinks?.[0] })),
    updated: updated.map((d) => ({ id: d.product.id, name: d.product.name, url: d.product.productLinks?.[0] })),
    skipped: skipped.map((d) => ({ name: d.product.name, url: d.product.productLinks?.[0], reason: d.reason })),
    dropped: dropped.map((d) => ({ name: d.product.name, url: d.product.productLinks?.[0], reason: d.reason })),
    notProducts: plan.skippedPages,
    images: imageStats,
    needsReview,
  };

  mkdirSync(CRAWL_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(payload, null, 2));

  console.log(
    `\n  ${flags.dryRun ? "Would import" : "Imported"}: ${created.length} new` +
      `${updated.length > 0 ? `, ${updated.length} updated` : ""}` +
      `\n  Skipped: ${skipped.length} already known or duplicated in the crawl` +
      `\n  Not products: ${plan.skippedPages.length} pages` +
      (dropped.length > 0 ? `\n  Dropped: ${dropped.length} (images unreachable)` : "") +
      (flags.images && !flags.dryRun
        ? `\n  Images: ${imageStats.uploaded} uploaded, ${imageStats.cached} already on R2, ${imageStats.failed} failed`
        : "")
  );

  for (const entry of [...created, ...updated].slice(0, 5)) {
    const product = entry.product;
    console.log(
      `    · ${product.name} — ${product.designer || "no designer"} / ${product.category || "no category"} / ${product.price}`
    );
  }
  if (created.length + updated.length > 5) console.log(`    · … and ${created.length + updated.length - 5} more`);

  if (needsReview.length > 0) {
    console.log(`\n  ${needsReview.length} need a look in the admin (see the report).`);
  }

  if (imageStats.landscape.length > 0) {
    console.log(
      `\n  ${imageStats.landscape.length} footwear photos are landscape, and the tile is portrait.` +
        "\n  They will letterbox on the grid until they are re-framed:" +
        "\n    npm run catalog:reframe -- --designer=Name"
    );
    for (const entry of imageStats.landscape.slice(0, 5)) {
      console.log(`    · ${entry.name.slice(0, 60)} (${entry.aspect.toFixed(2)}:1)`);
    }
    if (imageStats.landscape.length > 5) console.log(`    · … and ${imageStats.landscape.length - 5} more`);
  }
  console.log(
    `\n  Report: ${shortPath(REPORT_PATH)}` +
      (flags.dryRun ? "\n  Nothing was written to the catalogue — this was a dry run.\n" : "\n")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
