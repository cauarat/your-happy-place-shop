/**
 * Drafts a curation table from what the supplier wrote.
 *
 *     npm run catalog:table -- --designer=Vans
 *     npm run catalog:table -- --designer=Vans --out=data/curation/vans.json
 *
 * `catalog:curate` applies a table; it does not write one, on purpose — the
 * point of the table is that a person reads it before the catalogue changes.
 * This produces the draft for that person to read, with the supplier's original
 * kept alongside every row under `was`, which is what makes the reading
 * possible at all.
 *
 * The reasoning about what a title says is `src/lib/curation.ts` and is tested
 * there; this file is the catalogue and the JSON.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { readSupplierTitle } from "../src/lib/curation";
import { ROOT, fail, shortPath, readCatalogue } from "./catalog-file";

interface Flags {
  designer: string;
  out: string;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { designer: "", out: "" };
  for (const arg of argv) {
    const [name, value] = arg.replace(/^--/, "").split("=");
    switch (name) {
      case "designer": flags.designer = value; break;
      case "out": flags.out = value; break;
      case "help":
        console.log(
          "\n  npm run catalog:table -- --designer=Name [--out=path]\n\n" +
            "    --designer=Name   whose titles to draft (required)\n" +
            "    --out=path        where to write (default: data/curation/<designer>.json)\n"
        );
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) fail(`Unknown flag: ${arg}. Try --help.`);
    }
  }
  if (!flags.designer) fail("Which designer? Pass --designer=Name.");
  return flags;
}

/** What is worth a second pair of eyes before this is applied. */
function noteFor(name: string): string | undefined {
  if (name.length < 4) return "nothing left after cleaning — check by hand";
  // A quote with no space on either side is a missing space —
  // "Old Skool 36'Pearlized Port Royale'ComplexCon". A quote that opens after a
  // space and closes against a letter is just a quoted colourway, which is how
  // most of these are correctly written, so only the sandwiched case counts.
  if (/[A-Za-z0-9]['"\u2018\u2019\u201c\u201d][A-Za-z0-9]/.test(name)) {
    return "the supplier ran words into its quotes — check the spacing";
  }
  // "…'Navy White'190" — a price the supplier left on the end of the title.
  if (/['"\u2018\u2019\u201c\u201d]\s*\d+$/.test(name)) {
    return "a stray number is left on the end — check it is not a price";
  }
  return undefined;
}

function run() {
  const flags = parseFlags(process.argv.slice(2));
  const catalogue = readCatalogue();
  const products = catalogue.filter((product) => product.designer === flags.designer);
  if (products.length === 0) fail(`No products for designer "${flags.designer}".`);

  const slug = flags.designer.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const out = flags.out
    ? (flags.out.startsWith("/") ? flags.out : join(ROOT, flags.out))
    : join(ROOT, "data", "curation", `${slug}.json`);

  const rows = products.map((product) => {
    const { name, styleCode } = readSupplierTitle(product.name, product.designer);
    return {
      id: product.id,
      name,
      category: product.category,
      // The style code is the only part of the supplier's line worth keeping,
      // and the description is where the catalogue already keeps specifics.
      ...(styleCode ? { description: `${name} · ${styleCode}` } : { description: name }),
      was: { name: product.name },
      // Anything the rules could not turn into a name is a row to look at, not
      // a row to trust.
      ...(noteFor(name) ? { note: noteFor(name) } : {}),
    };
  });

  const table = {
    designer: flags.designer,
    source: products[0]?.productLinks?.[0] ?? "",
    remove: [] as { id: string; was: string }[],
    products: rows,
  };

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(table, null, 2) + "\n");

  const flagged = rows.filter((row) => row.note);
  console.log(`\n  ${rows.length} rows → ${shortPath(out)}`);
  if (flagged.length > 0) console.log(`  ${flagged.length} need a look by hand`);
  console.log(`\n  Read it, then: npm run catalog:curate -- --in=${shortPath(out)}\n`);
}

run();
