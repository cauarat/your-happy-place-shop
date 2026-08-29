import type { CSSProperties } from 'react';

export interface CropData {
  x: number; // 0–100 — horizontal position (0 = left edge, 50 = center, 100 = right edge)
  y: number; // 0–100 — vertical position  (0 = top edge,  50 = center, 100 = bottom edge)
  zoom: number; // 1+ — zoom multiplier on top of the base "cover" scale
}

/**
 * Computes pixel-perfect CSS positioning for a cropped image inside a container.
 *
 * The image is first scaled to *cover* the container (smallest scale that fills
 * both dimensions), then optionally zoomed further.  The user's x/y percentages
 * control which slice of the image is visible through the container's "window":
 *
 *   x = 0   → left edge of image flush with left edge of container
 *   x = 50  → centered horizontally
 *   x = 100 → right edge flush with right edge
 *
 *   y = 0   → top edge flush
 *   y = 50  → centered vertically
 *   y = 100 → bottom edge flush
 *
 * The maths works entirely with *aspect ratios*, so the output uses percentages
 * that are fully responsive — no pixel measurements or ResizeObservers needed.
 *
 * @param imageAspect      – naturalWidth / naturalHeight of the source image
 * @param containerAspect  – width / height of the container (e.g. 4/5 = 0.8)
 * @param crop             – { x, y, zoom }
 */
export function computeCropStyles(
  imageAspect: number,
  containerAspect: number,
  crop: CropData,
): CSSProperties {
  // A caller that has not measured its image yet passes NaN, and every
  // percentage below then resolves to `NaN%`, which the browser drops — leaving
  // an unpositioned, unsized image. Falling back to `contain` shows the whole
  // photo uncropped, which is wrong but recognisable, rather than broken.
  if (!Number.isFinite(imageAspect) || imageAspect <= 0 ||
      !Number.isFinite(containerAspect) || containerAspect <= 0) {
    return { width: '100%', height: '100%', objectFit: 'contain' };
  }

  const { x, y, zoom } = crop;

  // ----- rendered size (% of container) -----
  let relW: number; // image width  as % of container width
  let relH: number; // image height as % of container height

  if (imageAspect > containerAspect) {
    // Image is proportionally wider  → height fills, width overflows
    relH = 100 * zoom;
    relW = (imageAspect / containerAspect) * 100 * zoom;
  } else {
    // Image is proportionally taller → width fills, height overflows
    relW = 100 * zoom;
    relH = (containerAspect / imageAspect) * 100 * zoom;
  }

  // ----- excess (how much bigger the image is than the container, in %) -----
  const exW = relW - 100; // always ≥ 0
  const exH = relH - 100; // always ≥ 0

  // ----- position -----
  // x=0  → left  = 0        (left edge visible)
  // x=50 → left  = -exW/2   (centred)
  // x=100→ left  = -exW     (right edge visible)
  const leftPct = -(exW * x / 100);
  const topPct  = -(exH * y / 100);

  return {
    position: 'absolute',
    width:  `${relW}%`,
    height: `${relH}%`,
    left:   `${leftPct}%`,
    top:    `${topPct}%`,
    // The image is explicitly sized to cover + zoom, so we want it to
    // stretch-fill the computed box (no further object-fit needed).
    objectFit: 'fill',
  };
}

/**
 * The display crop every footwear tile uses.
 *
 * Bottom-anchored rather than centred because a shoe is photographed sitting on
 * the sweep: anchoring it to the bottom of the tile puts the sole on the same
 * line in every tile, which is what makes a row of them read as one shelf. At
 * `zoom: 1` the photo is scaled to exactly cover the frame, so nothing is
 * enlarged past its own resolution.
 *
 * It is a constant because it is not a per-product judgement — 346 footwear
 * products carry this identical value, and the importer now applies it on the
 * way in. The one thing it cannot rescue is a landscape photograph, which
 * covers a portrait tile by cropping the sides off the shoe; those are
 * re-framed by `scripts/reframe-images.ts` before this is applied.
 */
export const FOOTWEAR_TILE_CROP: CropData = { x: 50, y: 100, zoom: 1 };

/**
 * How tall a product frame is, in one place.
 *
 * This exists because the shop and the admin used to state the ratio twice —
 * once as a number handed to `computeCropStyles`, once as a Tailwind class on
 * the container — and the two drifted. The detail page asked for 4/3 on
 * footwear while rendering `aspect-square md:aspect-[4/3]`, so below the `md`
 * breakpoint the image was sized for a box a third wider than the one it was
 * shown in, and `objectFit: 'fill'` stretched it to fit. The maths was right;
 * the container was lying. Deriving both from here is what stops that.
 *
 * Note the class is deliberately NOT responsive. A ratio that changes at a
 * breakpoint cannot be expressed as the single number the crop maths needs.
 */
const FOOTWEAR_ASPECT = 4 / 3;
const DEFAULT_ASPECT = 4 / 5;

function isFootwear(category?: string): boolean {
  return category?.toLowerCase() === 'footwear';
}

/** The frame ratio for a category, as a number for `computeCropStyles`. */
export function aspectFor(category?: string): number {
  return isFootwear(category) ? FOOTWEAR_ASPECT : DEFAULT_ASPECT;
}

/** The same ratio as a Tailwind class, so the container cannot disagree with it. */
export function aspectClassFor(category?: string): string {
  return isFootwear(category) ? 'aspect-[4/3]' : 'aspect-[4/5]';
}

/**
 * Which position sliders actually do anything at this zoom.
 *
 * At zoom 1 the image is scaled to exactly cover the frame, so it overflows on
 * one axis and fits precisely on the other — and dragging the slider for the
 * axis that fits moves the image by zero pixels. The control looked broken
 * because it *was* inert, with nothing in the UI to say so.
 */
export function inertAxes(
  imageAspect: number,
  containerAspect: number,
  zoom: number,
): { x: boolean; y: boolean } {
  if (!Number.isFinite(imageAspect) || imageAspect <= 0 ||
      !Number.isFinite(containerAspect) || containerAspect <= 0) {
    return { x: true, y: true };
  }
  const wide = imageAspect > containerAspect;
  const relW = wide ? (imageAspect / containerAspect) * 100 * zoom : 100 * zoom;
  const relH = wide ? 100 * zoom : (containerAspect / imageAspect) * 100 * zoom;
  // Sub-pixel overflow is not draggable in any meaningful sense.
  return { x: relW - 100 < 0.5, y: relH - 100 < 0.5 };
}
