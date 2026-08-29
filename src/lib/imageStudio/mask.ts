/**
 * Building and cleaning the alpha mask.
 *
 * Everything here works on a plain `Uint8ClampedArray` of one byte per pixel,
 * so it runs and is tested without a canvas. The two ways of producing a mask
 * live side by side because they fail in opposite directions: a colour key is
 * exact on a flat sweep and leaks badly on a gradient, and the neural model
 * handles any scene but returns a soft, low-resolution guess.
 */

/** A pixel is treated as solid foreground above this, solid background below. */
export const FG_THRESHOLD = 240;
export const BG_THRESHOLD = 15;

/**
 * Flood fill inward from the border, keeping every pixel within `tolerance` of
 * the background colour.
 *
 * Seeding from the border rather than keying the whole frame is what makes this
 * safe for the white pieces in the catalogue: a white shirt on a white sweep
 * keeps its own white, because the fill can only reach pixels connected to the
 * edge. A global colour key would erase the shirt.
 */
export function floodKey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  background: [number, number, number],
  tolerance = 32
): Uint8ClampedArray {
  const count = width * height;
  const alpha = new Uint8ClampedArray(count).fill(255);
  const visited = new Uint8Array(count);
  const stack = new Int32Array(count);
  let top = 0;

  const [br, bg, bb] = background;
  const tol2 = tolerance * tolerance;
  const isBackground = (p: number) => {
    const i = p * 4;
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= tol2;
  };

  const seed = (p: number) => {
    if (visited[p] || !isBackground(p)) return;
    visited[p] = 1;
    stack[top++] = p;
  };

  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  while (top > 0) {
    const p = stack[--top];
    alpha[p] = 0;
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) seed(p - 1);
    if (x < width - 1) seed(p + 1);
    if (y > 0) seed(p - width);
    if (y < height - 1) seed(p + width);
  }

  return alpha;
}

/**
 * Push a soft mask towards a decision.
 *
 * The model's output is a probability, and the bilinear stretch back up from
 * 1024 smears it further. Everything below `lo` is background, everything above
 * `hi` is foreground, and the narrow band between them keeps a ramp so the edge
 * stays anti-aliased instead of turning into stair-steps.
 */
export function levelAlpha(
  alpha: Uint8ClampedArray,
  lo = 40,
  hi = 215
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(alpha.length);
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < alpha.length; i++) {
    out[i] = ((alpha[i] - lo) / span) * 255;
  }
  return out;
}

/** Shrink the mask by `radius` pixels. */
export function erode(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius = 1
): Uint8ClampedArray {
  return morph(alpha, width, height, radius, Math.min, 255);
}

/** Grow the mask by `radius` pixels. */
export function dilate(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius = 1
): Uint8ClampedArray {
  return morph(alpha, width, height, radius, Math.max, 0);
}

/** Separable min/max filter — two 1-D passes instead of a square window. */
function morph(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  pick: (a: number, b: number) => number,
  seed: number
): Uint8ClampedArray {
  if (radius <= 0) return new Uint8ClampedArray(alpha);
  const pass1 = new Uint8ClampedArray(alpha.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let v = seed;
      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);
      for (let k = from; k <= to; k++) v = pick(v, alpha[row + k]);
      pass1[row + x] = v;
    }
  }
  const out = new Uint8ClampedArray(alpha.length);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let v = seed;
      const from = Math.max(0, y - radius);
      const to = Math.min(height - 1, y + radius);
      for (let k = from; k <= to; k++) v = pick(v, pass1[k * width + x]);
      out[y * width + x] = v;
    }
  }
  return out;
}

/**
 * Drop specks the model hallucinated — a caught shadow, a reflection on the
 * floor, a scrap of the backdrop.
 *
 * It keeps every blob at least `minFraction` of the largest one rather than
 * keeping only the largest, because plenty of products are legitimately in more
 * than one piece: a pair of shoes, a pair of earrings, a belt and its buckle.
 *
 * Reports how many blobs survived, which the quality score reads as a hint that
 * the mask shattered.
 */
export function pruneSpecks(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  minFraction = 0.05
): { alpha: Uint8ClampedArray; pieces: number } {
  const count = width * height;
  const labels = new Int32Array(count).fill(-1);
  const sizes: number[] = [];
  const stack = new Int32Array(count);

  for (let start = 0; start < count; start++) {
    if (labels[start] !== -1 || alpha[start] <= BG_THRESHOLD) continue;
    const label = sizes.length;
    let size = 0;
    let top = 0;
    stack[top++] = start;
    labels[start] = label;
    while (top > 0) {
      const p = stack[--top];
      size++;
      const x = p % width;
      const y = (p / width) | 0;
      const visit = (q: number) => {
        if (labels[q] === -1 && alpha[q] > BG_THRESHOLD) {
          labels[q] = label;
          stack[top++] = q;
        }
      };
      if (x > 0) visit(p - 1);
      if (x < width - 1) visit(p + 1);
      if (y > 0) visit(p - width);
      if (y < height - 1) visit(p + width);
    }
    sizes.push(size);
  }

  if (sizes.length === 0) return { alpha: new Uint8ClampedArray(alpha), pieces: 0 };

  // `Math.max(...sizes)` spreads one argument per blob, which overflows the
  // call stack on a shattered mask. A shredded mask is exactly the case this
  // guards against, so it cannot be the case that crashes.
  let largest = 0;
  for (const size of sizes) if (size > largest) largest = size;

  const cutoff = largest * minFraction;
  const out = new Uint8ClampedArray(alpha);
  let pieces = 0;
  for (const size of sizes) if (size >= cutoff) pieces++;
  for (let p = 0; p < count; p++) {
    const label = labels[p];
    if (label !== -1 && sizes[label] < cutoff) out[p] = 0;
  }
  return { alpha: out, pieces };
}

/**
 * Re-open the boundary of a hard mask so the edge can be rebuilt from colour.
 *
 * A flood fill answers yes or no, which leaves a stair-stepped outline and — a
 * worse problem — no partly-covered pixels at all. `refineEdge` and
 * `decontaminate` both work only on partial coverage, so against a binary mask
 * they do nothing, and the real edge of the product either keeps a fully opaque
 * ring of the old background or loses a pixel of itself.
 *
 * Marking the pixels either side of the boundary as undecided hands them to
 * `refineEdge`, which settles them by how close they are to the background
 * colour, at full resolution.
 */
export function softenBoundary(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius = 1
): Uint8ClampedArray {
  const inner = erode(alpha, width, height, radius);
  const outer = dilate(alpha, width, height, radius);
  const out = new Uint8ClampedArray(alpha);
  for (let p = 0; p < alpha.length; p++) {
    // Inside the shape but within `radius` of the edge, or outside it but
    // within `radius` — either way, undecided.
    if (inner[p] !== outer[p]) out[p] = 128;
  }
  return out;
}

/** Fill enclosed holes the model punched through the middle of a product. */
export function fillHoles(
  alpha: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const count = width * height;
  const reachable = new Uint8Array(count);
  const stack = new Int32Array(count);
  let top = 0;

  const seed = (p: number) => {
    if (!reachable[p] && alpha[p] <= BG_THRESHOLD) {
      reachable[p] = 1;
      stack[top++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (top > 0) {
    const p = stack[--top];
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) seed(p - 1);
    if (x < width - 1) seed(p + 1);
    if (y > 0) seed(p - width);
    if (y < height - 1) seed(p + width);
  }

  const out = new Uint8ClampedArray(alpha);
  for (let p = 0; p < count; p++) {
    if (alpha[p] <= BG_THRESHOLD && !reachable[p]) out[p] = 255;
  }
  return out;
}
