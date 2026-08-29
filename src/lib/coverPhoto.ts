/**
 * Which photo of a product belongs on the tile.
 *
 * A supplier's album is ordered for the warehouse, not for a shop window: the
 * first photo is as likely to be a model wearing the piece, cropped at the
 * forehead, as it is the piece laid flat. On a grid those two sit side by side
 * and the catalogue stops reading as one catalogue.
 *
 * The tell is not the background colour — a studio sweep and a model shoot are
 * photographed against the same light grey. It is whether the garment touches
 * the frame. A flat lay leaves the border ring as pure sweep and keeps a margin
 * on all four sides; a model bleeds off the bottom of the frame, and often the
 * sides, which puts fabric and skin into the ring that `analyzeBackground`
 * reads.
 *
 * So the ring analysis already in the image studio does most of the work here,
 * and this adds the second half: where the garment actually sits in the frame.
 */
import { analyzeBackground, type BackgroundReport } from "./imageStudio/analyze";

/**
 * How far a pixel must sit from the background colour to count as garment.
 *
 * Generous on purpose: a washed black tee against a light sweep clears this by
 * a mile, and the number only has to survive JPEG noise in the sweep itself.
 */
const GARMENT_THRESHOLD = 28;

/**
 * How uneven the border ring may be and still be a sweep.
 *
 * The strongest signal there is, and the reason the whiteness test alone was
 * never going to work: measured on this supplier's albums, a flat lay reads
 * essentially zero and a photograph of someone wearing the piece reads in the
 * tens, because the ring cuts through fabric and skin.
 */
const MAX_SPREAD = 12;

/**
 * How far the sweep may sit from white.
 *
 * Deliberately not the image studio's `WHITE_TOLERANCE` of 20, which was
 * calibrated against the shop's own photography. This supplier lights its
 * stills on a light grey seamless that measures 26 to 30 — a wall, not a fault
 * — while a model shot in a room measures past 60. The line goes between them.
 */
const MAX_DISTANCE_FROM_WHITE = 45;

/** Clear frame above and below a subject that is not being worn. */
const MIN_VERTICAL_MARGIN = 0.04;

/** Product photography crops close at the sides, so this asks for very little. */
const MIN_HORIZONTAL_MARGIN = 0.005;

/** How far the garment may sit off the frame's vertical centre line. */
const MAX_OFF_CENTRE = 0.12;

/** Below this the garment is a speck; above it, it fills the frame. */
const MIN_COVERAGE = 0.08;
const MAX_COVERAGE = 0.92;

export interface Frame {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * What a photo measures, before anything is decided about it.
 *
 * Kept apart from the verdict on purpose: measuring 891 photos means
 * downloading and decoding 891 photos, and the thresholds below were always
 * going to need a second look once the real numbers turned up. Separated this
 * way, changing a threshold re-judges the catalogue in milliseconds.
 */
export interface CoverMeasurement {
  background: BackgroundReport;
  /** Clear frame on each side, as a fraction of the frame. */
  margins: { top: number; right: number; bottom: number; left: number };
  /** Horizontal drift of the garment's centre, as a fraction of the width. */
  offCentre: number;
  /** Garment box area over frame area. */
  coverage: number;
  /** No subject stood out from the background at all. */
  empty?: boolean;
}

export interface CoverReport extends CoverMeasurement {
  /** Passed every rule, so it may be a cover at all. */
  qualifies: boolean;
  /** Why it did not, in words fit for the report. */
  rejectedFor?: string;
  /**
   * Nothing could be found in the frame to judge.
   *
   * A different thing from failing, and the distinction matters: a pale garment
   * on a pale sweep is invisible to a colour-distance test, and reading "I
   * cannot see it" as "it is a bad photo" is what once swapped three white
   * pieces for their black colourways.
   */
  unmeasurable?: boolean;
  /** Higher is a better cover. Meaningless unless `qualifies`. */
  score: number;
}

/** Inclusive pixel bounds of the subject within a frame. */
export interface GarmentBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * The box the garment occupies, measured against the background colour.
 *
 * Scans rows and columns rather than every pixel's neighbours: the question is
 * only where the subject starts and stops, and a row that contains no pixel
 * unlike the sweep contains no garment.
 *
 * Exported because re-framing a photo needs the same box the cover judgement
 * needs — `scripts/reframe-images.ts` crops to it. Measuring it twice, by two
 * slightly different thresholds, is how a shoe ends up trimmed in the tile but
 * not in the report that approved it.
 */
export function garmentBox(frame: Frame, background: [number, number, number]): GarmentBox | null {
  const { data, width, height } = frame;
  const [br, bg, bb] = background;

  let top = -1;
  let bottom = -1;
  let left = width;
  let right = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Manhattan distance: a third of the cost of a Euclidean one over a
      // million pixels, and the threshold is empirical either way.
      const distance = Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb);
      if (distance <= GARMENT_THRESHOLD * 3) continue;

      if (top === -1) top = y;
      bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }

  if (top === -1) return null; // nothing but sweep — an empty or blown-out frame
  return { top, bottom, left, right };
}

/** Everything measurable about a photo, with nothing decided yet. */
export function measureCover(frame: Frame): CoverMeasurement {
  const background = analyzeBackground(frame.data, frame.width, frame.height);
  const box = garmentBox(frame, background.color);

  if (!box) {
    return {
      background,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      offCentre: 1,
      coverage: 0,
      empty: true,
    };
  }

  const margins = {
    top: box.top / frame.height,
    bottom: (frame.height - 1 - box.bottom) / frame.height,
    left: box.left / frame.width,
    right: (frame.width - 1 - box.right) / frame.width,
  };
  const coverage = ((box.right - box.left + 1) * (box.bottom - box.top + 1)) / (frame.width * frame.height);
  const offCentre = Math.abs((box.left + box.right) / 2 / frame.width - 0.5);

  return { background, margins, offCentre, coverage };
}

/**
 * The verdict on a measured photo.
 *
 * Every rule is a veto rather than a penalty. A model shot that scores well on
 * everything else is still a model shot, and letting a high score outvote a
 * garment running off the bottom of the frame is exactly how a grid ends up
 * mixed again.
 */
export function judgeCover(measurement: CoverMeasurement): CoverReport {
  const { background, margins, offCentre, coverage } = measurement;
  const report: CoverReport = { ...measurement, qualifies: false, score: 0 };

  // Whether the garment can be seen at all comes first. Asking "is the
  // background white enough" about a frame whose subject was never found
  // answers a question about the wrong thing — and answering it was what
  // condemned three perfectly good photographs of white garments.
  if (measurement.empty) {
    return { ...report, unmeasurable: true, rejectedFor: "nothing stands out from the background" };
  }
  if (coverage < MIN_COVERAGE) {
    // Too little found to be a garment at all — far more likely a pale piece
    // the colour test cannot separate from a pale sweep than a real photo of
    // something tiny.
    return { ...report, unmeasurable: true, rejectedFor: "too little stands out to measure" };
  }

  // The sweep has to be even before anything else is asked of it. This is the
  // measurement that actually separates a studio still from a model shoot: a
  // sweep reads near zero, a photograph of a person in a room reads tens.
  if (background.spread > MAX_SPREAD) {
    return { ...report, rejectedFor: "the background is not an even sweep" };
  }
  if (background.distanceFromWhite > MAX_DISTANCE_FROM_WHITE) {
    return { ...report, rejectedFor: "the background is too dark to read as white" };
  }
  // Vertical margins are where a worn garment gives itself away — a body runs
  // out of the bottom of the frame. Horizontal ones are loose because product
  // photography crops tight to the sides on purpose.
  if (Math.min(margins.top, margins.bottom) < MIN_VERTICAL_MARGIN) {
    return { ...report, rejectedFor: "the subject runs off the top or bottom of the frame" };
  }
  if (Math.min(margins.left, margins.right) < MIN_HORIZONTAL_MARGIN) {
    return { ...report, rejectedFor: "the subject runs off the side of the frame" };
  }
  if (offCentre > MAX_OFF_CENTRE) return { ...report, rejectedFor: "the subject sits off-centre" };
  if (coverage > MAX_COVERAGE) return { ...report, rejectedFor: "the subject fills the whole frame" };

  // Among photos that all qualify, prefer the evenest sweep, then the most
  // centred subject, then the one that fills the tile best — a garment shot at
  // roughly two thirds of the frame reads as a product, not as a swatch.
  const evenness = 1 - Math.min(1, background.spread / MAX_SPREAD);
  const centring = 1 - offCentre / MAX_OFF_CENTRE;
  const framing = 1 - Math.abs(coverage - 0.62) / 0.62;

  return {
    ...report,
    qualifies: true,
    score: evenness * 0.4 + centring * 0.35 + Math.max(0, framing) * 0.25,
  };
}

/** Measure and judge in one go, which is what a test wants. */
export const scoreCover = (frame: Frame): CoverReport => judgeCover(measureCover(frame));

export interface Candidate {
  url: string;
  report: CoverReport;
}

export interface PickOptions {
  /** The photo leading today. A cover that already works is left alone. */
  incumbent?: string;
}

/**
 * The photo that should lead, or null to leave the product alone.
 *
 * Three ways of returning null, and all three are real answers.
 *
 * Some albums are model shots end to end, and promoting one of those over
 * another buys nothing. A cover that already qualifies stays, because the
 * scores of two good flat lays differ by hundredths and letting the higher one
 * win swaps a black tee's tile for the blue colourway on a rounding error. And
 * a cover that could not be measured stays too: not being able to see the
 * garment is not evidence against the photograph, and acting on it replaces
 * good covers for no reason anybody could explain to a shopper.
 */
export function pickCover(candidates: Candidate[], options: PickOptions = {}): Candidate | null {
  const current = candidates.find((candidate) => candidate.url === options.incumbent);
  if (current?.report.qualifies || current?.report.unmeasurable) return current;

  const qualifying = candidates.filter((candidate) => candidate.report.qualifies);
  if (qualifying.length === 0) return null;

  return qualifying.reduce((best, candidate) => (candidate.report.score > best.report.score ? candidate : best));
}
