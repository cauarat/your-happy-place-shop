/**
 * Re-frames a supplier's cover photos so they sit on the grid like the rest.
 *
 *     npm run catalog:reframe -- --dry-run    # measure and report, upload nothing
 *     npm run catalog:reframe                 # apply it
 *
 * The catalogue's tiles are portrait, and every supplier but one shoots
 * portrait: a shoe photographed at 3:4, filling the width, sitting on the
 * bottom of the frame. `boostmasterlin` shoots 3:2 landscape with the shoe
 * small in the middle, and a landscape photo in a portrait tile is the one case
 * the standard display crop cannot rescue — `computeCropStyles` would cover the
 * tile by slicing 44% off each side, taking the toe and the heel with it.
 *
 * So the fix is to the photograph, not to the crop: trim the sweep away, and
 * recompose the shoe onto a portrait canvas in the position the rest of the
 * catalogue already uses. After this the product takes the ordinary footwear
 * crop and needs no special case anywhere in the app.
 *
 * The geometry is `src/lib/reframe.ts` and is tested there; this file is the
 * network, the JPEG codec and the bucket. Originals are never deleted — the
 * previous URL is kept on the product as `originalImage`.
 */
import { inflateSync } from "node:zlib";
import { decode, encode } from "jpeg-js";
import type { Product } from "../src/data/products";
import type { Frame } from "../src/lib/coverPhoto";
import { reframe, BOTTOM_MARGIN, MAX_SHOE_HEIGHT } from "../src/lib/reframe";
import { FOOTWEAR_TILE_CROP } from "../src/lib/cropUtils";
import { fail, readCatalogue, writeCatalogue, bumpCatalogVersion } from "./catalog-file";
import { connectR2, uploadBytes, type R2 } from "./r2";

/** JPEG quality for the re-encoded canvas. */
const QUALITY = 92;

/** Photos are fetched this many at a time. */
const CONCURRENCY = 4;

interface Flags {
  designer: string;
  dryRun: boolean;
  bump: boolean;
  limit: number;
  force: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { designer: "Vans", dryRun: false, bump: true, limit: Infinity, force: false };
  for (const arg of argv) {
    const [name, value] = arg.replace(/^--/, "").split("=");
    switch (name) {
      case "designer": flags.designer = value; break;
      case "dry-run": flags.dryRun = true; break;
      case "no-bump": flags.bump = false; break;
      case "limit": flags.limit = Number(value); break;
      case "force": flags.force = true; break;
      case "help":
        console.log(
          "\n  npm run catalog:reframe -- [flags]\n\n" +
            '    --designer=Name   whose cover photos to re-frame (default: "Vans")\n' +
            "    --dry-run         measure and report, upload nothing\n" +
            "    --limit=N         only the first N products\n" +
            "    --force           re-frame photos that have been re-framed already\n" +
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
 * Just enough PNG to read one photo.
 *
 * `jpeg-js` is the only codec the scripts have, and one of this supplier's
 * covers is a PNG — which is not worth a dependency, especially as the tree
 * currently refuses to resolve one. This covers the case that actually turns
 * up: 8 bits a channel, not interlaced. Anything else says so rather than
 * returning wrong pixels.
 */
function decodePng(bytes: Uint8Array): Frame {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const depth = view.getUint8(24);
  const colourType = view.getUint8(25);
  const interlace = view.getUint8(28);

  if (depth !== 8) throw new Error(`PNG bit depth ${depth} unsupported (need 8)`);
  if (interlace !== 0) throw new Error("interlaced PNG unsupported");
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colourType];
  if (!channels) throw new Error(`PNG colour type ${colourType} unsupported`);

  const parts: Uint8Array[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = view.getUint32(offset - bytes.byteOffset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === "IDAT") parts.push(bytes.subarray(offset + 8, offset + 8 + length));
    if (type === "IEND") break;
    offset += 12 + length;
  }
  const raw = new Uint8Array(inflateSync(Buffer.concat(parts.map((part) => Buffer.from(part)))));

  // Un-filter: each scanline is prefixed by the filter it was encoded with, and
  // every filter predicts a byte from its left (a), above (b) and above-left (c).
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const previous = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = previous ? previous[x] : 0;
      const c = previous && x >= channels ? previous[x - channels] : 0;
      let value = line[x];
      switch (filter) {
        case 0: break;
        case 1: value += a; break;
        case 2: value += b; break;
        case 3: value += (a + b) >> 1; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`PNG filter ${filter} unknown`);
      }
      out[y * stride + x] = value & 0xff;
    }
  }

  // Widen to the RGBA the analyser expects. A transparent pixel is composited
  // onto white, because that is what the tile puts behind it.
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const from = i * channels;
    const grey = channels <= 2;
    const r = grey ? out[from] : out[from];
    const g = grey ? out[from] : out[from + 1];
    const b = grey ? out[from] : out[from + 2];
    const alpha = colourType === 4 ? out[from + 1] : colourType === 6 ? out[from + 3] : 255;
    const mix = alpha / 255;
    data[i * 4] = r * mix + 255 * (1 - mix);
    data[i * 4 + 1] = g * mix + 255 * (1 - mix);
    data[i * 4 + 2] = b * mix + 255 * (1 - mix);
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

async function fetchFrame(url: string): Promise<Frame> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (PNG_MAGIC.every((byte, i) => bytes[i] === byte)) return decodePng(bytes);

  // `useTArray` keeps the pixels in a typed array instead of a plain Buffer,
  // which is what the analyser expects.
  const raw = decode(bytes, { useTArray: true, maxResolutionInMP: 40 });
  return {
    data: new Uint8ClampedArray(raw.data.buffer, raw.data.byteOffset, raw.data.length),
    width: raw.width,
    height: raw.height,
  };
}

function toJpeg(frame: Frame): Uint8Array {
  const encoded = encode(
    { data: Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.length), width: frame.width, height: frame.height },
    QUALITY
  );
  return new Uint8Array(encoded.data);
}

interface Outcome {
  product: Product;
  shoeWidth?: number;
  shoeHeight?: number;
  cappedByHeight?: boolean;
  url?: string;
  error?: string;
}

async function run() {
  const flags = parseFlags(process.argv.slice(2));
  const catalogue = readCatalogue();

  const named = catalogue.filter((product) => product.designer === flags.designer && product.image);

  // A product that has been through here already carries the photo it started
  // with. Re-framing the re-framed one would trim the canvas this script just
  // painted and shrink the shoe again, one run at a time, and the original
  // would be lost behind the second `originalImage`. Opt in with --force.
  const alreadyDone = named.filter((product) => product.originalImage);
  const targets = (flags.force ? named : named.filter((product) => !product.originalImage)).slice(0, flags.limit);

  if (named.length === 0) fail(`No products with a photo for designer "${flags.designer}".`);
  if (targets.length === 0) {
    console.log(`\n  All ${named.length} ${flags.designer} photos have been re-framed already. --force to redo them.\n`);
    return;
  }
  if (alreadyDone.length > 0 && !flags.force) {
    console.log(`\n  ${alreadyDone.length} already re-framed, skipping (--force to redo them)`);
  }

  console.log(`\n  ${targets.length} ${flags.designer} cover photos${flags.dryRun ? " (dry run)" : ""}\n`);

  const r2 = flags.dryRun ? null : connectR2("  Re-framing has no fallback — the recomposed photo has to go somewhere.");

  const outcomes: Outcome[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const product = targets[cursor++];
      const outcome: Outcome = { product };
      try {
        const frame = await fetchFrame(product.image);
        const result = reframe(frame);
        if (!result) throw new Error("no subject found in the frame");

        outcome.shoeWidth = result.shoeWidth;
        outcome.shoeHeight = result.shoeHeight;
        outcome.cappedByHeight = result.cappedByHeight;

        if (r2) outcome.url = await uploadBytes(toJpeg(result.frame), "image/jpeg", r2);
      } catch (error) {
        outcome.error = error instanceof Error ? error.message : String(error);
      }
      outcomes.push(outcome);
      process.stdout.write(`\r  ${outcomes.length}/${targets.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n\n");

  const done = outcomes.filter((o) => !o.error);
  const failed = outcomes.filter((o) => o.error);
  const capped = done.filter((o) => o.cappedByHeight);

  if (done.length > 0) {
    const widths = done.map((o) => o.shoeWidth!);
    const heights = done.map((o) => o.shoeHeight!);
    const mean = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;
    console.log(`  shoe width  ${(mean(widths) * 100).toFixed(1)}% of the tile (Louis Vuitton: 97.7%)`);
    console.log(`  shoe height ${(mean(heights) * 100).toFixed(1)}% of the tile (Louis Vuitton: 33.5%)`);
    console.log(`  sitting ${(BOTTOM_MARGIN * 100).toFixed(0)}% clear of the bottom\n`);
  }
  if (capped.length > 0) console.log(`  ${capped.length} were capped at ${MAX_SHOE_HEIGHT * 100}% frame height rather than full width\n`);
  for (const outcome of failed) console.log(`  ! ${outcome.product.name.slice(0, 60)} — ${outcome.error}`);
  if (failed.length > 0) console.log("");

  if (flags.dryRun) {
    console.log(`  Dry run: nothing uploaded, catalogue untouched.\n`);
    return;
  }

  const byId = new Map(done.filter((o) => o.url).map((o) => [o.product.id, o.url!]));
  const updated = catalogue.map((product): Product => {
    const url = byId.get(product.id);
    if (!url) return product;
    return {
      ...product,
      image: url,
      // The album keeps its order; only the cover is replaced in place.
      images: (product.images ?? []).map((image) => (image === product.image ? url : image)),
      // Kept so this is reversible and the untouched original is never orphaned.
      originalImage: product.originalImage ?? product.image,
      displayCrops: { ...(product.displayCrops ?? {}), 0: { ...FOOTWEAR_TILE_CROP } },
    };
  });

  writeCatalogue(updated);
  console.log(`  ${byId.size} re-framed and written to the catalogue.`);

  if (flags.bump) {
    const version = bumpCatalogVersion();
    if (version) console.log(`  CATALOG_VERSION raised to ${version} — browsers will reseed.`);
  }
  console.log("");
}

run().catch((error) => fail(error instanceof Error ? error.message : String(error)));
