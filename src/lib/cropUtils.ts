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
