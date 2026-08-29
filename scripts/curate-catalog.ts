/**
 * Applies a curation table to the catalogue.
 *
 *     npm run catalog:curate -- --dry-run    # what would change, nothing written
 *     npm run catalog:curate                 # apply it
 *
 * A supplier files goods the way its warehouse thinks and titles them as
 * specifications. The import lands those words faithfully, which is the right
 * thing for an import to do; this is the pass that turns them into a shop —
 * departments a shopper would look under, names that fit a card, and the
 * supplier's notices to buyers taken off the shelf entirely.
 *
 * The decisions live in `data/curation/*.json`, one row per product, generated
 * by the rules in `src/lib/curation.ts` and then read through by a person. The
 * table is the point: it is reviewable in a diff, it says what each product was
 * before, and re-running it changes nothing that is already right.
 */
import { readdirSync } from "node:fs";
import { join, isAbsolute, resolve } from "node:path";
import type { Product } from "../src/data/products";
import {
  ROOT,
  fail,
  shortPath,
  readJson,
  readCatalogue,
  writeCatalogue,
  bumpCatalogVersion,
} from "./catalog-file";

const CURATION_DIR = join(ROOT, "data", "curation");

interface CuratedProduct {
  id: string;
  name: string;
  category: string;
  description?: string;
  note?: string;
  was?: { name: string; category: string };
}

interface CurationTable {
  designer?: string;
  source?: string;
  /** Rows that are not products at all — a supplier's notice to its buyers. */
  remove: { id: string; was: string }[];
  products: CuratedProduct[];
}

interface Flags {
  in?: string;
  dryRun: boolean;
  bump: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { dryRun: false, bump: true };
  for (const arg of argv) {
    const [name, value] = arg.replace(/^--/, "").split("=");
    switch (name) {
      case "in": flags.in = value; break;
      case "dry-run": flags.dryRun = true; break;
      case "no-bump": flags.bump = false; break;
      case "help":
        console.log(
          "\n  npm run catalog:curate -- [flags]\n\n" +
            "    --in=<file>   curation table (default: the only one in data/curation/)\n" +
            "    --dry-run     report what would change, change nothing\n" +
            "    --no-bump     do not raise CATALOG_VERSION\n"
        );
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) fail(`Unknown flag: ${arg}. Try --help.`);
    }
  }
  return flags;
}

function tablePath(flags: Flags): string {
  if (flags.in) return isAbsolute(flags.in) ? flags.in : resolve(ROOT, flags.in);

  const tables = readdirSync(CURATION_DIR).filter((name) => name.endsWith(".json"));
  if (tables.length === 0) fail(`No curation table in ${shortPath(CURATION_DIR)}/.`);
  if (tables.length > 1) {
    fail(`More than one table in ${shortPath(CURATION_DIR)}/ — say which with --in:\n    ${tables.join("\n    ")}`);
  }
  return join(CURATION_DIR, tables[0]);
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  const path = tablePath(flags);
  const table = readJson<CurationTable | null>(path, null);
  if (!table?.products) fail(`${shortPath(path)} is not a curation table.`);

  const catalogue = readCatalogue();
  const byId = new Map(catalogue.map((product) => [product.id, product]));

  console.log(`\n  ${shortPath(path)} → ${catalogue.length} products in the catalogue`);

  // A table written against a catalogue that has moved on is the one way this
  // goes quietly wrong, so every row is checked before anything is written.
  const missing = [
    ...table.products.filter((row) => !byId.has(row.id)).map((row) => row.id),
    ...table.remove.filter((row) => !byId.has(row.id)).map((row) => row.id),
  ];
  if (missing.length > 0) {
    console.log(`  ! ${missing.length} rows name a product that is no longer in the catalogue — skipping those`);
  }

  const renamed: { from: string; to: string }[] = [];
  const refiled: { name: string; from: string; to: string }[] = [];

  const curated = catalogue.map((product): Product => {
    const row = table.products.find((entry) => entry.id === product.id);
    if (!row) return product;

    if (row.name !== product.name) renamed.push({ from: product.name, to: row.name });
    if (row.category !== product.category) {
      refiled.push({ name: row.name, from: product.category, to: row.category });
    }
    return {
      ...product,
      name: row.name,
      category: row.category,
      ...(row.description ? { description: row.description } : {}),
    };
  });

  const removing = new Set(table.remove.map((row) => row.id));
  const kept = curated.filter((product) => !removing.has(product.id));

  for (const change of refiled) console.log(`    ${change.from} → ${change.to}`.padEnd(34) + `| ${change.name}`);
  console.log(`\n  ${refiled.length} refiled · ${renamed.length} renamed · ${catalogue.length - kept.length} removed`);
  for (const row of table.remove) console.log(`    − ${row.was}`);

  const notes = table.products.filter((row) => row.note);
  if (notes.length > 0) {
    console.log(`\n  ${notes.length} carry a note:`);
    for (const row of notes) console.log(`    · ${row.name} — ${row.note}`);
  }

  if (flags.dryRun) {
    console.log("\n  Nothing was written — this was a dry run.\n");
    return;
  }

  writeCatalogue(kept);
  if (flags.bump) {
    const version = bumpCatalogVersion();
    if (version) {
      console.log(
        `\n  CATALOG_VERSION → ${version}. Every browser reseeds its catalogue on the next visit,\n` +
          "  which DISCARDS product edits made in the admin panel on that device."
      );
    }
  }
  console.log(`\n  ${kept.length} products written to src/data/catalog.json\n`);
}

main();
