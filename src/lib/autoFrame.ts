/**
 * Where the frame should sit, read off the photograph itself.
 *
 * Framing by hand is three sliders and a guess, and the guess is the same one
 * every time: put the product in the middle and pull in until it fills the tile
 * without touching the edges. That is a measurement, not a judgement, so it is
 * made here.
 *
 * The subject's box comes from `garmentBox`, the same reading the cover
 * judgement uses — measuring it a second way is how a product ends up framed
 * against bounds nothing else in the catalogue agrees with. All this adds is the
 * arithmetic between that box and the three numbers `computeCropStyles` wants.
 *
 * Pure, over a decoded frame, so the geometry is tested without a browser. The
 * canvas work belongs to the caller.
 */
import { analyzeBackground } from "./imageStudio/analyze";
import { garmentBox, type Frame } from "./coverPhoto";
import { fitZoom, type CropData } from "./cropUtils";

/**
 * Clear space left around the subject, as a fraction of its own size.
 *
 * Small on purpose. The catalogue's tiles are already generous — the grid sets
 * the rhythm, not the photograph — and a product that stops short of its own
 * frame twice over reads as timid rather than considered.
 */
export const SUBJECT_MARGIN = 0.06;

/** The tightest the frame will pull in, matching the zoom slider's ceiling. */
export const MAX_AUTO_ZOOM = 3;

const clampPercent = (n: number): number => Math.min(100, Math.max(0, n));

/**
 * Position one axis so the subject's centre lands on the frame's centre.
 *
 * The image spans `[left, left + rel]` in frame-percent, and `computeCropStyles`
 * puts its left edge at `-(rel - 100) * x / 100`. Setting the subject's centre
 * equal to 50 and solving for `x` gives the line below, which needs no separate
 * case for a photograph smaller than its frame: there `rel - 100` is negative
 * and the same expression slides the letterboxed image instead of the window.
 */
function centreOn(rel: number, centre: number): number {
  // An axis that fits exactly cannot be moved, and the division would blow up.
  if (Math.abs(rel - 100) < 0.5) return 50;
  return clampPercent((100 * (centre * rel - 50)) / (rel - 100));
}

/**
 * Read a frame and return the crop that centres and fills with the product.
 *
 * `null` when nothing stands out from the background — a blown-out still, or a
 * pale product on a pale sweep. That is a different answer from "centred", and
 * the caller should fall back to showing the whole photograph rather than
 * inventing a crop around a subject it could not find.
 */
export function autoFrame(frame: Frame, containerAspect: number): CropData | null {
  const { width, height } = frame;
  if (!(width > 0) || !(height > 0) || !(containerAspect > 0)) return null;

  const background = analyzeBackground(frame.data, width, height);
  const box = garmentBox(frame, background.color);
  if (!box) return null;

  const imageAspect = width / height;
  const wide = imageAspect > containerAspect;

  // How large the image renders, per unit of zoom, as a percentage of the frame.
  const perZoomW = wide ? (imageAspect / containerAspect) * 100 : 100;
  const perZoomH = wide ? 100 : (containerAspect / imageAspect) * 100;

  const subjectW = (box.right - box.left + 1) / width;
  const subjectH = (box.bottom - box.top + 1) / height;

  // What fraction of the photograph must stay visible to hold the subject and
  // its margin. Capped at the whole photograph: a subject that already bleeds
  // off the frame cannot be given room that is not in the file.
  const needW = Math.min(1, subjectW * (1 + 2 * SUBJECT_MARGIN));
  const needH = Math.min(1, subjectH * (1 + 2 * SUBJECT_MARGIN));

  // At zoom z the frame shows `100 / (perZoom * z)` of the image on that axis.
  // The tightest zoom that still shows `need` on both is the smaller of the two.
  const zoom = Math.min(
    MAX_AUTO_ZOOM,
    Math.max(
      fitZoom(imageAspect, containerAspect),
      Math.min(100 / (needW * perZoomW), 100 / (needH * perZoomH)),
    ),
  );

  const centreX = (box.left + box.right + 1) / 2 / width;
  const centreY = (box.top + box.bottom + 1) / 2 / height;

  return {
    x: Math.round(centreOn(perZoomW * zoom, centreX)),
    y: Math.round(centreOn(perZoomH * zoom, centreY)),
    zoom: Math.round(zoom * 100) / 100,
  };
}
