/**
 * Puts the right photo on the tile.
 *
 *     npm run catalog:covers -- --dry-run    # what would change, nothing written
 *     npm run catalog:covers                 # apply it
 *
 * An imported product leads with whatever photo the supplier happened to put
 * first in its album, which on a grid means a flat lay next to a model shot
 * next to a close-up of a seam. This measures every photo of every product and
 * promotes the one that looks like the rest of the catalogue: the piece alone,
 * centred, on an even white sweep.
 *
 * The judging is in `src/lib/coverPhoto.ts` and is tested there; this file is
 * the network, the JPEG decoder and the catalogue write. Nothing is uploaded
 * and no photo is deleted — the only changes are which URL sits first.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { decode } from "jpeg-js";
import type { Product } from "../src/data/products";
import { measureCover, judgeCover, pickCover, type Candidate, type CoverMeasurement, type Frame } from "../src/lib/coverPhoto";
import {
  ROOT,
  fail,
  shortPath,
  readJson,
  readCatalogue,
  writeCatalogue,
  bumpCatalogVersion,
} from "./catalog-file";

const CACHE_PATH = join(ROOT, "data", "curation", ".cover-scores.json");

/** Photos are fetched this many at a time; decoding is the slow part anyway. */
const CONCURRENCY = 6;

/**
 * The measurement is of background and framing, not of detail.
 *
 * A quarter of a megapixel answers both questions as well as two megapixels do,
 * and scanning every pixel of 891 full-size photos is minutes of work for an
 * answer that does not change.
 */
const MAX_EDGE = 256;

interface Flags {
  designer: string;
  dryRun: boolean;
  bump: boolean;
  refresh: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { designer: "Union Kingdom", dryRun: false, bump: true, refresh: false };
  for (const arg of argv) {
    const [name, value] = arg.replace(/^--/, "").split("=");
    switch (name) {
      case "designer": flags.designer = value; break;
      case "dry-run": flags.dryRun = true; break;
      case "no-bump": flags.bump = false; break;
      case "refresh": flags.refresh = true; break;
      case "help":
        console.log(
          "\n  npm run catalog:covers -- [flags]\n\n" +
            '    --designer=Name   whose products to judge (default: "Union Kingdom")\n' +
            "    --dry-run         report what would change, change nothing\n" +
            "    --refresh         re-measure photos already in the cache\n" +
            "    --no-bump         do not raise CATALOG_VERSION\n"
        );
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) fail(`Unknown flag: ${arg}. Try --help.`);
    }
  }
  return flags;
}

/**
 * Box-averaged downscale.
 *
 * Averaging rather than sampling, because the thing being measured is a thin
 * clear margin at the edge of the frame: drop the wrong pixel and a flat lay
 * reads as a garment touching the border.
 */
function downscale(source: Frame, maxEdge: number): Frame {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  if (scale === 1) return source;

  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  const boxWidth = source.width / width;
  const boxHeight = source.height / height;

  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * boxHeight);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * boxHeight));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * boxWidth);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * boxWidth));

      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = y0; sy < y1 && sy < source.height; sy++) {
        for (let sx = x0; sx < x1 && sx < source.width; sx++) {
          const i = (sy * source.width + sx) * 4;
          r += source.data[i];
          g += source.data[i + 1];
          b += source.data[i + 2];
          n++;
        }
      }
      const i = (y * width + x) * 4;
      data[i] = r / n;
      data[i + 1] = g / n;
      data[i + 2] = b / n;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

async function measure(url: string): Promise<CoverMeasurement> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  // `useTArray` keeps the pixels in a typed array instead of a plain Buffer,
  // which is what the analyser expects.
  const raw = decode(bytes, { useTArray: true, maxResolutionInMP: 40 });
  const frame: Frame = {
    data: new Uint8ClampedArray(raw.data.buffer, raw.data.byteOffset, raw.data.length),
    width: raw.width,
    height: raw.height,
  };
  return measureCover(downscale(frame, MAX_EDGE));
}

/**
 * Raw measurements, never verdicts.
 *
 * Judging is cheap and thresholds change; downloading and decoding 891 photos
 * is neither. Cached this way, retuning a threshold re-judges the whole
 * catalogue instantly instead of re-fetching it.
 */
type Cache = Record<string, CoverMeasurement>;

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const catalogue = readCatalogue();
  const products = catalogue.filter((product) => product.designer === flags.designer);
  if (products.length === 0) fail(`No products by "${flags.designer}" in the catalogue.`);

  const cache = flags.refresh ? {} : readJson<Cache>(CACHE_PATH, {});
  const all = [...new Set(products.flatMap((product) => product.images ?? []))];

  // Suppliers slip a size chart into the gallery as a PNG — a landscape table
  // of measurements, sometimes sitting first, which is how one ended up as a
  // product tile. They are photographs of nothing and can never be a cover, so
  // they are set aside by name rather than failing to decode.
  const urls = all.filter((url) => /\.jpe?g(\?|$)/i.test(url));
  const charts = all.length - urls.length;
  const pending = urls.filter((url) => !cache[url]);

  console.log(`\n  ${products.length} products by ${flags.designer} · ${all.length} images`);
  if (charts > 0) console.log(`  ${charts} set aside as size charts, not photographs`);
  console.log(`  ${pending.length} to measure, ${urls.length - pending.length} already cached`);

  let index = 0;
  let done = 0;
  const failures: string[] = [];
  const worker = async () => {
    while (index < pending.length) {
      const url = pending[index++];
      try {
        cache[url] = await measure(url);
      } catch (error) {
        failures.push(`${url} — ${error instanceof Error ? error.message : String(error)}`);
      }
      done++;
      if (done % 25 === 0 || done === pending.length) {
        process.stdout.write(`\r  measured ${done}/${pending.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (pending.length > 0) process.stdout.write("\n");
  for (const failure of failures) console.log(`  ! ${failure}`);

  mkdirSync(join(ROOT, "data", "curation"), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  const promoted: { name: string; from: string; to: string; score: number }[] = [];
  const kept: { name: string; why: string }[] = [];
  const untouched: string[] = [];

  const updated = catalogue.map((product): Product => {
    if (product.designer !== flags.designer) return product;

    const candidates: Candidate[] = (product.images ?? [])
      .filter((url) => cache[url])
      .map((url) => ({ url, report: judgeCover(cache[url]) }));

    const winner = pickCover(candidates, { incumbent: product.images?.[0] });
    if (!winner) {
      // Every photo is a model shot or a crop. Moving one of those to the front
      // in place of another buys nothing, so the product is left as it is.
      const reasons = new Set(candidates.map((candidate) => candidate.report.rejectedFor ?? "unmeasured"));
      kept.push({ name: product.name, why: [...reasons].join("; ") });
      return product;
    }
    if (winner.url === product.images?.[0]) {
      untouched.push(product.name);
      return product;
    }

    promoted.push({
      name: product.name,
      from: product.images?.[0] ?? "",
      to: winner.url,
      score: winner.report.score,
    });
    return {
      ...product,
      image: winner.url,
      // Only the cover moves; everything else keeps the album's own order.
      images: [winner.url, ...(product.images ?? []).filter((url) => url !== winner.url)],
    };
  });

  console.log(
    `\n  ${promoted.length} covers changed · ${untouched.length} already right · ${kept.length} left alone`
  );
  for (const change of promoted.slice(0, 12)) {
    console.log(`    ${change.score.toFixed(2)}  ${change.name}`);
  }
  if (promoted.length > 12) console.log(`    … and ${promoted.length - 12} more`);

  if (kept.length > 0) {
    console.log(`\n  No photo in the catalogue's pattern — cover left as it was:`);
    for (const row of kept) console.log(`    · ${row.name} — ${row.why}`);
  }

  if (flags.dryRun) {
    console.log("\n  Nothing was written — this was a dry run.\n");
    return;
  }

  writeCatalogue(updated);
  if (flags.bump) {
    const version = bumpCatalogVersion();
    if (version) {
      console.log(
        `\n  CATALOG_VERSION → ${version}. Every browser reseeds its catalogue on the next visit,\n` +
          "  which DISCARDS product edits made in the admin panel on that device."
      );
    }
  }
  console.log(`\n  ${shortPath(CACHE_PATH)} holds the measurements; re-running costs nothing.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
