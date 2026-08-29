/**
 * What the photo's background actually is.
 *
 * The old `detectImageBackground` read four corner pixels. Four pixels cannot
 * tell a flat studio sweep apart from a room with a window in it, and a single
 * JPEG artefact in a corner moves the answer by more than the difference
 * between "white" and "not white". This reads the whole border ring instead,
 * and reports how much the ring disagrees with itself — which is the signal
 * that decides whether a colour key will work or the neural model is needed.
 */

export interface BackgroundReport {
  /** Mean colour of the border ring. */
  color: [number, number, number];
  /**
   * Mean distance of each ring pixel from that mean. Low means a flat sweep;
   * high means a gradient, a shadow, or a scene photo.
   */
  spread: number;
  /** Euclidean RGB distance from pure white. */
  distanceFromWhite: number;
  /** Flat enough that a border-seeded flood fill will beat the model. */
  uniform: boolean;
  /** Close enough to `#FFFFFF` that the photo needs no work at all. */
  alreadyWhite: boolean;
}

/**
 * Measured against a stratified sample of 59 catalogue products: 14% of the
 * catalogue sits under 6, 19% between 6 and 20, and 68% above 20 — the grey
 * studio shots. 20 is where a background stops reading as "white" on the tile.
 */
export const WHITE_TOLERANCE = 20;

/**
 * Only ~15% of the catalogue is this flat. Above it, a flood fill leaks into
 * shadows and the model has to do the work.
 */
export const UNIFORM_TOLERANCE = 10;

/** How many pixels deep the sampled ring is. */
const RING_DEPTH = 2;

export function analyzeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number
): BackgroundReport {
  if (width < RING_DEPTH * 2 + 1 || height < RING_DEPTH * 2 + 1) {
    return {
      color: [255, 255, 255],
      spread: 0,
      distanceFromWhite: 0,
      uniform: true,
      alreadyWhite: true,
    };
  }

  const offsets: number[] = [];
  const push = (x: number, y: number) => offsets.push((y * width + x) * 4);

  for (let x = 0; x < width; x++) {
    for (let d = 0; d < RING_DEPTH; d++) {
      push(x, d);
      push(x, height - 1 - d);
    }
  }
  for (let y = RING_DEPTH; y < height - RING_DEPTH; y++) {
    for (let d = 0; d < RING_DEPTH; d++) {
      push(d, y);
      push(width - 1 - d, y);
    }
  }

  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (const i of offsets) {
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
  }
  const n = offsets.length;
  const color: [number, number, number] = [sr / n, sg / n, sb / n];

  let spreadSum = 0;
  for (const i of offsets) {
    spreadSum += Math.hypot(
      data[i] - color[0],
      data[i + 1] - color[1],
      data[i + 2] - color[2]
    );
  }
  const spread = spreadSum / n;

  const distanceFromWhite = Math.hypot(
    255 - color[0],
    255 - color[1],
    255 - color[2]
  );

  return {
    color: [Math.round(color[0]), Math.round(color[1]), Math.round(color[2])],
    spread: Number(spread.toFixed(2)),
    distanceFromWhite: Number(distanceFromWhite.toFixed(2)),
    uniform: spread <= UNIFORM_TOLERANCE,
    alreadyWhite: distanceFromWhite <= WHITE_TOLERANCE,
  };
}
