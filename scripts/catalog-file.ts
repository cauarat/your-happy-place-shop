/**
 * The catalogue as a file on disk, and the one line that makes browsers reread it.
 *
 * Shared by the two scripts that write products — the crawl importer and the
 * curation pass. The version bump especially: it edits `store.ts` by regex, and
 * two copies of that drifting apart is a bug nobody would find until a browser
 * quietly kept serving last week's catalogue.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Product } from "../src/data/products";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CATALOG_PATH = join(ROOT, "src", "data", "catalog.json");
export const STORE_PATH = join(ROOT, "src", "lib", "store.ts");

/** Stops with a message rather than a stack trace. */
export function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** A path as the reader knows it: relative inside the repo, absolute outside. */
export function shortPath(path: string): string {
  const inside = relative(ROOT, path);
  return inside.startsWith("..") ? path : inside;
}

export function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const readCatalogue = (): Product[] => readJson<Product[]>(CATALOG_PATH, []);

/** Two-space JSON, so the next change reads as a diff and not as a rewrite. */
export function writeCatalogue(products: Product[]): void {
  writeFileSync(CATALOG_PATH, JSON.stringify(products, null, 2) + "\n");
}

/**
 * Raises `CATALOG_VERSION` in the store.
 *
 * Without this no browser sees the change: the catalogue is seeded into
 * localStorage once and only reseeded when that string changes. The cost is
 * that the reseed also discards whatever was edited in the admin panel on that
 * device, which is why every caller announces it.
 */
export function bumpCatalogVersion(): string | null {
  const source = readFileSync(STORE_PATH, "utf8");
  const match = source.match(/const CATALOG_VERSION = "v(\d+)"/);
  if (!match) {
    console.warn("  ! Could not find CATALOG_VERSION in src/lib/store.ts — raise it by hand.");
    return null;
  }
  const next = `v${Number(match[1]) + 1}`;
  writeFileSync(STORE_PATH, source.replace(match[0], `const CATALOG_VERSION = "${next}"`));
  return next;
}
