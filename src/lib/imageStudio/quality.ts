/**
 * Deciding whether a cut-out is safe to keep.
 *
 * The failure that matters is silent: a white sneaker photographed on a white
 * sweep is the hardest case there is, and when the model gets it wrong it does
 * not error — it returns a mask that erases half the shoe, and that gets saved
 * over a photo that was fine. Every result is scored before it can replace
 * anything, and anything doubtful stops for a human.
 */

export type Verdict = "ok" | "review" | "reject";

export interface QualityReport {
  verdict: Verdict;
  /** Share of the frame kept as product. */
  coverage: number;
  /** Share of the border ring the product bleeds into. */
  borderCoverage: number;
  /** Separate blobs left after pruning. A pair of shoes is legitimately two. */
  pieces: number;
  /** Plain-language reason, shown next to the preview in the admin. */
  reason: string;
}

const SOLID = 128;

export function scoreMask(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  pieces: number
): QualityReport {
  const count = width * height;
  let kept = 0;
  for (let p = 0; p < count; p++) if (alpha[p] > SOLID) kept++;
  const coverage = kept / count;

  let border = 0;
  let borderKept = 0;
  const touch = (p: number) => {
    border++;
    if (alpha[p] > SOLID) borderKept++;
  };
  for (let x = 0; x < width; x++) {
    touch(x);
    touch((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    touch(y * width);
    touch(y * width + width - 1);
  }
  const borderCoverage = border === 0 ? 0 : borderKept / border;

  const report = (verdict: Verdict, reason: string): QualityReport => ({
    verdict,
    coverage: Number(coverage.toFixed(4)),
    borderCoverage: Number(borderCoverage.toFixed(4)),
    pieces,
    reason,
  });

  if (coverage >= 0.97) {
    return report("reject", "Nothing was removed — no background was found.");
  }
  if (coverage <= 0.015) {
    return report("reject", "Almost everything was removed — the product was lost.");
  }
  if (pieces === 0) {
    return report("reject", "The mask came back empty.");
  }
  if (coverage >= 0.9) {
    return report("review", "Only a sliver was removed. Check the edges.");
  }
  if (coverage <= 0.05) {
    return report("review", "Very little was kept. Check the product survived.");
  }
  if (borderCoverage >= 0.5) {
    return report("review", "The product runs off the frame on most sides.");
  }
  if (pieces > 6) {
    return report("review", `Left in ${pieces} separate pieces — likely specks.`);
  }
  return report("ok", "Clean cut-out.");
}
