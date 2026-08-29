import { describe, it, expect } from "vitest";
import { reframe, CANVAS_WIDTH, CANVAS_HEIGHT, SHOE_WIDTH, BOTTOM_MARGIN, MAX_SHOE_HEIGHT } from "@/lib/reframe";
import type { Frame } from "@/lib/coverPhoto";

/**
 * A landscape sweep with a solid block on it, in the proportions the Vans
 * photos actually have: 1080×720, the shoe across the middle 66% of the width
 * and 41% of the height.
 */
function photo({
  width = 1080,
  height = 720,
  left = 0.17,
  right = 0.83,
  top = 0.335,
  bottom = 0.744,
  sweep = 238,
} = {}): Frame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = sweep;
    data[i + 1] = sweep;
    data[i + 2] = sweep;
    data[i + 3] = 255;
  }
  for (let y = Math.round(top * height); y < Math.round(bottom * height); y++) {
    for (let x = Math.round(left * width); x < Math.round(right * width); x++) {
      const i = (y * width + x) * 4;
      data[i] = 20;
      data[i + 1] = 20;
      data[i + 2] = 20;
    }
  }
  return { data, width, height };
}

/** Where the subject sits in a frame, as fractions, measured back off the pixels. */
function boxOf(frame: Frame, sweep: number) {
  let top = -1, bottom = -1, left = frame.width, right = -1;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const i = (y * frame.width + x) * 4;
      if (Math.abs(frame.data[i] - sweep) < 40) continue;
      if (top === -1) top = y;
      bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  return {
    width: (right - left + 1) / frame.width,
    height: (bottom - top + 1) / frame.height,
    bottomMargin: (frame.height - 1 - bottom) / frame.height,
    centred: Math.abs((left + right) / 2 / frame.width - 0.5),
  };
}

describe("reframe", () => {
  it("turns a landscape photo into the catalogue's portrait frame", () => {
    const out = reframe(photo())!;
    expect(out.frame.width).toBe(CANVAS_WIDTH);
    expect(out.frame.height).toBe(CANVAS_HEIGHT);
    expect(out.frame.width / out.frame.height).toBeCloseTo(0.75, 3);
  });

  it("puts the shoe across the width and on the bottom, where Louis Vuitton's sits", () => {
    const out = reframe(photo())!;
    const box = boxOf(out.frame, 238);

    // LV measures 97.7% of the width with a 1% bottom margin.
    expect(box.width).toBeCloseTo(SHOE_WIDTH, 2);
    expect(box.bottomMargin).toBeCloseTo(BOTTOM_MARGIN, 2);
    expect(box.centred).toBeLessThan(0.01);
    // LV's shoe is 33.5% of its frame; a 2.45:1 last at full width lands near 30%.
    expect(box.height).toBeGreaterThan(0.25);
    expect(box.height).toBeLessThan(0.35);
  });

  it("paints the canvas in the photo's own sweep, not white", () => {
    const out = reframe(photo({ sweep: 238 }))!;
    // Top-left is clear of the shoe, which is bottom-anchored and inset.
    expect(out.frame.data[0]).toBe(238);
    expect(out.frame.data[1]).toBe(238);
    expect(out.frame.data[2]).toBe(238);
  });

  it("caps a tall subject by height rather than running it off the frame", () => {
    // A near-square subject: at full width it would be far taller than the cap.
    const out = reframe(photo({ left: 0.3, right: 0.7, top: 0.1, bottom: 0.9 }))!;
    expect(out.cappedByHeight).toBe(true);
    expect(out.shoeHeight).toBeLessThanOrEqual(MAX_SHOE_HEIGHT + 0.001);
    expect(out.shoeWidth).toBeLessThan(SHOE_WIDTH);
    expect(boxOf(out.frame, 238).bottomMargin).toBeCloseTo(BOTTOM_MARGIN, 2);
  });

  it("reports a frame with nothing in it rather than cropping noise", () => {
    const blank: Frame = {
      data: new Uint8ClampedArray(100 * 100 * 4).fill(255),
      width: 100,
      height: 100,
    };
    expect(reframe(blank)).toBeNull();
  });

  it("leaves an already-portrait photo in the same proportions", () => {
    // A Louis Vuitton-shaped source: 3:4, shoe full width on the bottom.
    const out = reframe(photo({ width: 773, height: 1031, left: 0.01, right: 0.99, top: 0.652, bottom: 0.988 }))!;
    const box = boxOf(out.frame, 238);
    expect(box.width).toBeCloseTo(SHOE_WIDTH, 2);
    expect(box.bottomMargin).toBeCloseTo(BOTTOM_MARGIN, 2);
  });
});
