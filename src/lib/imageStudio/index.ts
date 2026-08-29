/**
 * The image studio: one call that turns a product photo into a clean cut-out.
 *
 * Every step is separately testable and separately arguable; this file only
 * decides the order and which of the two mask strategies to use. The order
 * matters as much as the parts — the reason the old tool produced halos is that
 * it stopped after the mask, and the reason it produced them on *padded* images
 * is that it ran after the photo had already been composited onto its own grey.
 */

import { analyzeBackground, type BackgroundReport } from "./analyze";
import { floodKey, levelAlpha, pruneSpecks, fillHoles, softenBoundary } from "./mask";
import { refineEdge, decontaminate, applyAlpha } from "./matte";
import { scoreMask, type QualityReport } from "./quality";
import { neuralMask, type Progress } from "./neural";
import { loadImage, encodeCutout, blobToDataUrl, MAX_EDGE } from "./encode";

export type { BackgroundReport } from "./analyze";
export type { QualityReport, Verdict } from "./quality";
export { analyzeBackground, WHITE_TOLERANCE, UNIFORM_TOLERANCE } from "./analyze";
export { canEncodeWebp, loadImage } from "./encode";
export { preload } from "./neural";

export type Strategy = "auto" | "neural" | "colour";

export interface StudioOptions {
  strategy?: Strategy;
  maxEdge?: number;
  quality?: number;
  progress?: Progress;
}

export interface StudioResult {
  dataUrl: string;
  blob: Blob;
  extension: string;
  width: number;
  height: number;
  background: BackgroundReport;
  quality: QualityReport;
  /** Which mask strategy actually ran. */
  strategy: Exclude<Strategy, "auto">;
}

export async function processImage(
  src: string,
  options: StudioOptions = {}
): Promise<StudioResult> {
  const { strategy = "auto", maxEdge = MAX_EDGE, quality = 0.92, progress } = options;

  const { data, width, height, blob } = await loadImage(src, maxEdge);
  const background = analyzeBackground(data, width, height);

  // A flat sweep is better served by a flood fill than by the model: it is
  // exact where the model is approximate, it costs nothing, and its edges are
  // genuinely sharp rather than a stretched 1024-pixel guess. Only about 15% of
  // the catalogue is flat enough to qualify, so the model still does the work
  // on most photos.
  const chosen: Exclude<Strategy, "auto"> =
    strategy === "auto" ? (background.uniform ? "colour" : "neural") : strategy;

  let alpha: Uint8ClampedArray;
  /** Which pixels are certainly product, for sampling its colour at the edge. */
  let solid: Uint8ClampedArray | null = null;

  if (chosen === "colour") {
    // A flood fill answers yes or no. Re-opening the boundary gives the edge
    // back to `refineEdge`, which resolves it by colour at full resolution —
    // without this the outline is stair-stepped and, because nothing is partly
    // covered, `decontaminate` has no pixels to clean.
    solid = floodKey(data, width, height, background.color);
    alpha = softenBoundary(solid, width, height, 1);
  } else {
    alpha = levelAlpha(await neuralMask(blob, width, height, progress));
  }

  // Both paths arrive here with an undecided band, and both have it settled the
  // same way: by how far each pixel sits from the background colour. The model
  // is trusted less on a busy background, where that reasoning is weaker.
  alpha = refineEdge(
    data,
    alpha,
    width,
    height,
    background.color,
    background.uniform ? 1 : 0.6,
    4,
    solid ?? undefined
  );

  alpha = fillHoles(alpha, width, height);

  const pruned = pruneSpecks(alpha, width, height);
  alpha = pruned.alpha;

  const report = scoreMask(alpha, width, height, pruned.pieces);

  decontaminate(data, alpha, background.color);
  applyAlpha(data, alpha);

  const encoded = await encodeCutout(data, width, height, quality);
  return {
    dataUrl: await blobToDataUrl(encoded.blob),
    blob: encoded.blob,
    extension: encoded.extension,
    width,
    height,
    background,
    quality: report,
    strategy: chosen,
  };
}

/**
 * How badly one photo needs the treatment, without doing the treatment.
 *
 * The batch screen runs this across the whole catalogue first so it can sort by
 * need and skip what is already clean.
 *
 * 240px rather than something smaller: shrinking a photo averages its border
 * pixels together with the product just inside them, which drags the reading
 * towards the product and reports backgrounds as dirtier than they are. At this
 * size the ring is still the background, and the cost is dominated by fetching
 * the image anyway.
 */
export async function scoreBackground(src: string): Promise<BackgroundReport> {
  const { data, width, height } = await loadImage(src, 240);
  return analyzeBackground(data, width, height);
}
