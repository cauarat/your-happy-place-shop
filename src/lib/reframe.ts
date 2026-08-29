/**
 * Recomposing a landscape product photo onto the catalogue's portrait frame.
 *
 * The tiles are portrait and every supplier but one shoots portrait: a shoe at
 * 3:4, filling the width, sitting on the bottom of the frame. `boostmasterlin`
 * shoots 3:2 landscape with the shoe small in the middle, and a landscape photo
 * in a portrait tile is the one case the display crop cannot rescue —
 * `computeCropStyles` covers the tile by slicing 44% off each side, taking the
 * toe and the heel with it.
 *
 * So the fix is to the photograph rather than to the crop, and it is here
 * rather than in the script that calls it because it is arithmetic: given a
 * decoded frame it is fully determined, and it can be checked against a
 * synthetic frame instead of against the supplier's live CDN.
 */
import { analyzeBackground } from "./imageStudio/analyze";
import { garmentBox, type Frame } from "./coverPhoto";

/**
 * The shape every other supplier's photos already are, and the shape the
 * portrait tile wants. Width is the supplier's own 1080, so the shoe is never
 * enlarged past the detail it actually has.
 */
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1440; // 3:4

/**
 * Where the shoe sits on that canvas, measured off the Louis Vuitton photos the
 * catalogue is being matched to: 97.7% of the width, 1% clear of the bottom.
 */
export const SHOE_WIDTH = 0.98;
export const BOTTOM_MARGIN = 0.01;

/**
 * A ceiling on how tall the shoe may end up.
 *
 * Scaling every shoe to the full width works because these are all side-on
 * lasts of roughly the same proportion. A high-top, or a photo whose box caught
 * a reflection, is proportionally taller, and at full width it would run up the
 * frame and out of the tile. The LV shoes occupy 33.5% of their frame; this
 * leaves room above that and then stops.
 */
export const MAX_SHOE_HEIGHT = 0.45;

/**
 * Bilinear resample of a sub-rectangle of `frame` into `width` × `height`.
 *
 * Bilinear rather than the box average `pick-covers.ts` uses, because this
 * enlarges: the shoe's box is about 715px wide and it is going onto a 1058px
 * canvas. A box filter is the right answer when shrinking and does nothing at
 * all when growing, which would leave the shoe visibly blocky.
 */
export function resample(
  frame: Frame,
  box: { left: number; top: number; width: number; height: number },
  width: number,
  height: number
): Frame {
  const data = new Uint8ClampedArray(width * height * 4);
  const scaleX = box.width / width;
  const scaleY = box.height / height;

  for (let y = 0; y < height; y++) {
    const sy = Math.min(box.top + box.height - 1, box.top + (y + 0.5) * scaleY - 0.5);
    const y0 = Math.max(box.top, Math.floor(sy));
    const y1 = Math.min(box.top + box.height - 1, y0 + 1);
    const fy = sy - y0;

    for (let x = 0; x < width; x++) {
      const sx = Math.min(box.left + box.width - 1, box.left + (x + 0.5) * scaleX - 0.5);
      const x0 = Math.max(box.left, Math.floor(sx));
      const x1 = Math.min(box.left + box.width - 1, x0 + 1);
      const fx = sx - x0;

      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const p00 = frame.data[(y0 * frame.width + x0) * 4 + c];
        const p10 = frame.data[(y0 * frame.width + x1) * 4 + c];
        const p01 = frame.data[(y1 * frame.width + x0) * 4 + c];
        const p11 = frame.data[(y1 * frame.width + x1) * 4 + c];
        const top = p00 + (p10 - p00) * fx;
        const bottom = p01 + (p11 - p01) * fx;
        data[i + c] = top + (bottom - top) * fy;
      }
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

export interface Reframed {
  frame: Frame;
  /** Where the shoe ended up, as fractions of the canvas — for the report. */
  shoeWidth: number;
  shoeHeight: number;
  /** The full-width scale would have run it off the top, so it was scaled down. */
  cappedByHeight: boolean;
}

/**
 * Trim the sweep away and recompose the subject onto the portrait canvas.
 *
 * Returns null when the frame holds nothing but sweep — an empty or blown-out
 * photo, which is a thing to report rather than a thing to crop.
 */
export function reframe(frame: Frame): Reframed | null {
  const background = analyzeBackground(frame.data, frame.width, frame.height);
  const box = garmentBox(frame, background.color);
  if (!box) return null;

  const boxWidth = box.right - box.left + 1;
  const boxHeight = box.bottom - box.top + 1;

  // Full width unless that would make the shoe too tall for the frame.
  let targetWidth = Math.round(CANVAS_WIDTH * SHOE_WIDTH);
  let targetHeight = Math.round((targetWidth * boxHeight) / boxWidth);
  const cappedByHeight = targetHeight > CANVAS_HEIGHT * MAX_SHOE_HEIGHT;
  if (cappedByHeight) {
    targetHeight = Math.round(CANVAS_HEIGHT * MAX_SHOE_HEIGHT);
    targetWidth = Math.round((targetHeight * boxWidth) / boxHeight);
  }

  const shoe = resample(
    frame,
    { left: box.left, top: box.top, width: boxWidth, height: boxHeight },
    targetWidth,
    targetHeight
  );

  // The canvas is painted in the photo's own sweep colour rather than white, so
  // the recomposed frame has no seam where the crop used to be. These are lit
  // on a light grey that measures about 238, not on paper white.
  const [br, bg, bb] = background.color;
  const data = new Uint8ClampedArray(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = br;
    data[i + 1] = bg;
    data[i + 2] = bb;
    data[i + 3] = 255;
  }

  const offsetX = Math.round((CANVAS_WIDTH - targetWidth) / 2);
  const offsetY = CANVAS_HEIGHT - Math.round(CANVAS_HEIGHT * BOTTOM_MARGIN) - targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const canvasY = offsetY + y;
    if (canvasY < 0 || canvasY >= CANVAS_HEIGHT) continue;
    for (let x = 0; x < targetWidth; x++) {
      const canvasX = offsetX + x;
      if (canvasX < 0 || canvasX >= CANVAS_WIDTH) continue;
      const from = (y * targetWidth + x) * 4;
      const to = (canvasY * CANVAS_WIDTH + canvasX) * 4;
      data[to] = shoe.data[from];
      data[to + 1] = shoe.data[from + 1];
      data[to + 2] = shoe.data[from + 2];
      data[to + 3] = 255;
    }
  }

  return {
    frame: { data, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    shoeWidth: targetWidth / CANVAS_WIDTH,
    shoeHeight: targetHeight / CANVAS_HEIGHT,
    cappedByHeight,
  };
}
