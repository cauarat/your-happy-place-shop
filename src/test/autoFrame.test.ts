import { describe, it, expect } from "vitest";
import { autoFrame, MAX_AUTO_ZOOM } from "@/lib/autoFrame";
import { fitZoom, computeCropStyles } from "@/lib/cropUtils";
import type { Frame } from "@/lib/coverPhoto";

/** A white frame with one dark rectangle in it, in inclusive pixel bounds. */
function frameWith(
  width: number,
  height: number,
  box?: { left: number; right: number; top: number; bottom: number },
): Frame {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  if (box) {
    for (let y = box.top; y <= box.bottom; y++) {
      for (let x = box.left; x <= box.right; x++) {
        const i = (y * width + x) * 4;
        data[i] = 20;
        data[i + 1] = 20;
        data[i + 2] = 20;
      }
    }
  }
  return { data, width, height };
}

const TILE = 4 / 5;

describe("fitZoom", () => {
  it("is 1 when the photo is already the frame's shape", () => {
    expect(fitZoom(TILE, TILE)).toBe(1);
  });

  it("is below 1 for a landscape photo in a portrait frame", () => {
    // A 3:2 still covers a 4:5 tile at 187% width, so the whole picture only
    // fits once it is scaled back to 0.8/1.5.
    expect(fitZoom(1.5, TILE)).toBeCloseTo(0.8 / 1.5, 6);
  });

  it("is below 1 for a portrait photo in a landscape frame", () => {
    expect(fitZoom(0.5, 4 / 3)).toBeCloseTo(0.5 / (4 / 3), 6);
  });

  it("never exceeds 1, so a tile that filled before still fills", () => {
    for (const a of [0.2, 0.5, 0.8, 1, 1.5, 3]) {
      expect(fitZoom(a, TILE)).toBeLessThanOrEqual(1);
    }
  });

  it("falls back to 1 on unmeasured input rather than collapsing the image", () => {
    expect(fitZoom(NaN, TILE)).toBe(1);
    expect(fitZoom(0, TILE)).toBe(1);
    expect(fitZoom(1.5, 0)).toBe(1);
  });
});

describe("computeCropStyles", () => {
  it("never stretches, whatever the crop", () => {
    // The one property a shopper would notice being wrong.
    for (const zoom of [0.4, 1, 2.5]) {
      const style = computeCropStyles(1.5, TILE, { x: 50, y: 50, zoom });
      expect(style.objectFit).not.toBe("fill");
    }
  });

  it("sizes the box to the image's own aspect, so contain is a no-op", () => {
    const style = computeCropStyles(1.5, TILE, { x: 50, y: 50, zoom: 1 });
    const w = parseFloat(String(style.width));
    const h = parseFloat(String(style.height));
    // width% of the frame's width over height% of the frame's height, where the
    // frame is itself `TILE` — this must come back as the image's aspect.
    expect((w / h) * TILE).toBeCloseTo(1.5, 6);
  });
});

describe("autoFrame", () => {
  it("centres a centred subject", () => {
    const frame = frameWith(200, 100, { left: 80, right: 119, top: 30, bottom: 69 });
    const crop = autoFrame(frame, TILE)!;
    expect(crop).not.toBeNull();
    expect(crop.x).toBe(50);
    expect(crop.y).toBe(50);
  });

  it("pulls the frame in to the subject", () => {
    const frame = frameWith(200, 100, { left: 80, right: 119, top: 30, bottom: 69 });
    const crop = autoFrame(frame, TILE)!;
    // Tighter than merely covering, because the subject is small in the frame.
    expect(crop.zoom).toBeGreaterThan(1);
    expect(crop.zoom).toBeLessThanOrEqual(MAX_AUTO_ZOOM);
  });

  it("follows a subject that sits off to one side", () => {
    const left = autoFrame(frameWith(200, 100, { left: 20, right: 59, top: 30, bottom: 69 }), TILE)!;
    const right = autoFrame(frameWith(200, 100, { left: 140, right: 179, top: 30, bottom: 69 }), TILE)!;
    expect(left.x).toBeLessThan(50);
    expect(right.x).toBeGreaterThan(50);
  });

  it("never zooms past the ceiling on a speck", () => {
    const crop = autoFrame(frameWith(200, 100, { left: 99, right: 101, top: 49, bottom: 51 }), TILE)!;
    expect(crop.zoom).toBe(MAX_AUTO_ZOOM);
  });

  it("never zooms below the fit, so it cannot leave the photo floating", () => {
    // A subject filling the whole frame still cannot be shown smaller than fit.
    const frame = frameWith(200, 100, { left: 0, right: 199, top: 0, bottom: 99 });
    const crop = autoFrame(frame, TILE);
    if (crop) expect(crop.zoom).toBeGreaterThanOrEqual(fitZoom(2, TILE) - 1e-9);
  });

  it("returns null when there is no subject to find", () => {
    expect(autoFrame(frameWith(200, 100), TILE)).toBeNull();
  });

  it("refuses a degenerate frame rather than dividing by zero", () => {
    expect(autoFrame({ data: new Uint8ClampedArray(0), width: 0, height: 0 }, TILE)).toBeNull();
  });
});
