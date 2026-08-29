/**
 * Turning a mask into a clean cut-out.
 *
 * This is where the grey halo dies. `removeBackground()` from the library
 * writes the mask straight into the alpha channel and stops there — but every
 * partly-transparent pixel along an edge still holds a blend of the product and
 * the studio grey it was shot against. Put that on the white tile and the grey
 * comes with it, drawn as a soft outline around the piece.
 */

import { BG_THRESHOLD, FG_THRESHOLD } from "./mask";

/**
 * How far apart the product and the background must be, in RGB, before colour
 * can say anything about coverage. Below this the two are the same shade and
 * any answer would be noise.
 */
const MIN_SEPARATION = 20;

/**
 * Sharpen the uncertain band by unmixing it, using the product colour found
 * next to each pixel.
 *
 * An edge pixel is a mix of two colours: the background, which is known, and
 * whatever part of the product it touches. Reading off how far along that line
 * the pixel sits gives its coverage directly — `dot(C-B, F-B) / |F-B|²` is the
 * projection, which is the least-squares answer to `C = a*F + (1-a)*B`.
 *
 * `F` is read from the nearest solid pixel rather than averaged over the photo.
 * An earlier version used one image-wide average, and measuring it against
 * known coverage showed why that fails: a shoe has a white toe and a black
 * sole, and a single number for "how far the product sits from the background"
 * is wrong at both ends — it ate the edge wherever the product was closer to
 * the backdrop than average, and spilled wherever it was further.
 *
 * Where the product genuinely matches the background, no colour can separate
 * them, so the incoming mask is left to stand.
 *
 * `solid` says which pixels count as product when looking for that colour. Pass
 * the mask from before the edge was opened up; without it, anything narrower
 * than the band has no confident pixel left anywhere near it.
 */
export function refineEdge(
  rgba: Uint8ClampedArray,
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  background: [number, number, number],
  strength = 1,
  radius = 4,
  solid?: Uint8ClampedArray
): Uint8ClampedArray {
  const [br, bg, bb] = background;
  const out = new Uint8ClampedArray(alpha);
  // Where to look for product colour. It has to be separate from the mask being
  // refined: opening a band around the edge wipes out every confident pixel on
  // a strand of hair thinner than the band, leaving nothing to sample and the
  // whole strand stuck at its undecided value.
  const reference = solid ?? alpha;

  for (let p = 0; p < alpha.length; p++) {
    const a = alpha[p];
    if (a <= BG_THRESHOLD || a >= FG_THRESHOLD) continue;

    const x = p % width;
    const y = (p / width) | 0;

    // The nearest solid pixel, not the average of the ones nearby. Averaging
    // ruins hair: a window over fine strands takes in as much of the gaps
    // between them as the strands themselves, so the "foreground colour" comes
    // out halfway to the backdrop, every strand reads as half covered, and the
    // edge is combed away. The pixel closest to this one is on a strand.
    let nearest = -1;
    let nearestDistance = Infinity;
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    const x0 = Math.max(0, x - radius);
    const x1 = Math.min(width - 1, x + radius);
    for (let yy = y0; yy <= y1; yy++) {
      const dy = yy - y;
      for (let xx = x0; xx <= x1; xx++) {
        const q = yy * width + xx;
        if (reference[q] < FG_THRESHOLD) continue;
        const dx = xx - x;
        const d = dx * dx + dy * dy;
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = q;
        }
      }
    }
    if (nearest === -1) continue;

    const f = nearest * 4;
    const dr = rgba[f] - br;
    const dg = rgba[f + 1] - bg;
    const db = rgba[f + 2] - bb;
    const denom = dr * dr + dg * dg + db * db;
    if (denom < MIN_SEPARATION * MIN_SEPARATION) continue;

    const i = p * 4;
    const t =
      ((rgba[i] - br) * dr + (rgba[i + 1] - bg) * dg + (rgba[i + 2] - bb) * db) / denom;
    const byColour = t <= 0 ? 0 : t >= 1 ? 255 : t * 255;
    out[p] = a + (byColour - a) * strength;
  }
  return out;
}

/**
 * Recover the product's own colour from a pixel the background bled into.
 *
 * An edge pixel is a mix: `C = a*F + (1-a)*B`, where `B` is the background it
 * was shot on. Solving for `F` gives back what the product looked like there,
 * so the pixel carries no trace of the old backdrop and composites cleanly onto
 * anything. Mutates `rgba` in place — these arrays are megabytes and there is
 * no reason to copy one.
 */
export function decontaminate(
  rgba: Uint8ClampedArray,
  alpha: Uint8ClampedArray,
  background: [number, number, number]
): void {
  const [br, bg, bb] = background;
  for (let p = 0; p < alpha.length; p++) {
    const a = alpha[p];
    if (a <= BG_THRESHOLD || a >= 255) continue;
    const f = a / 255;
    const i = p * 4;
    // Below roughly 10% coverage the division amplifies noise into confetti,
    // and the pixel is nearly invisible anyway — leave it as it is.
    if (f < 0.1) continue;
    rgba[i] = (rgba[i] - (1 - f) * br) / f;
    rgba[i + 1] = (rgba[i + 1] - (1 - f) * bg) / f;
    rgba[i + 2] = (rgba[i + 2] - (1 - f) * bb) / f;
  }
}

/** Write the finished mask into the image's alpha channel. */
export function applyAlpha(
  rgba: Uint8ClampedArray,
  alpha: Uint8ClampedArray
): void {
  for (let p = 0; p < alpha.length; p++) {
    rgba[p * 4 + 3] = alpha[p];
  }
}
