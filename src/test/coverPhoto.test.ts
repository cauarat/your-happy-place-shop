import { describe, it, expect } from "vitest";
import { measureCover, judgeCover, scoreCover, pickCover, type Frame } from "@/lib/coverPhoto";

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 160;
const WIDTH = DEFAULT_WIDTH;
const HEIGHT = DEFAULT_HEIGHT;

interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/**
 * A frame with a dark subject on a sweep.
 *
 * The sweep is the light grey this supplier actually shoots on — measured at
 * roughly 26 from white on its real albums, not the pure white the shop's own
 * photography uses. Getting that difference wrong is what made the first
 * version of these thresholds reject every good photo in the catalogue.
 */
function frame(
  box: Box,
  sweep: [number, number, number] = [240, 240, 240],
  WIDTH = DEFAULT_WIDTH,
  HEIGHT = DEFAULT_HEIGHT
): Frame {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      const inside = y >= box.top && y <= box.bottom && x >= box.left && x <= box.right;
      const [r, g, b] = inside ? [40, 40, 40] : sweep;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { data, width: WIDTH, height: HEIGHT };
}

/** The piece laid flat: clear sweep all the way round it. */
const flatLay = frame({ top: 24, bottom: 132, left: 24, right: 96 });

/** A model wearing it: a wide body running out of the bottom of the frame. */
const onModel = frame({ top: 12, bottom: HEIGHT - 1, left: 10, right: 110 });

/**
 * A subject running out of the bottom of the frame, shaped like a body.
 *
 * Wide through the torso, narrow where it leaves the frame — which is both what
 * a standing figure looks like and the only shape that isolates this veto. A
 * uniformly narrow subject fails on size before the margin is ever checked, and
 * a uniformly wide one puts so much dark into the border ring that the sweep
 * test fires first. Drawn at 240px across because a real photo is nearer 1200,
 * where a leg crossing the bottom edge barely moves the ring at all.
 */
const touchingBottom = (() => {
  const image = frame({ top: 40, bottom: 240, left: 60, right: 180 }, [240, 240, 240], 240, 320);
  for (let y = 240; y < 320; y++) {
    for (let x = 112; x <= 128; x++) {
      const i = (y * 240 + x) * 4;
      image.data[i] = 40;
      image.data[i + 1] = 40;
      image.data[i + 2] = 40;
    }
  }
  return image;
})();

describe("scoreCover", () => {
  it("accepts a piece laid flat on the supplier's grey sweep", () => {
    const report = scoreCover(flatLay);
    expect(report.qualifies).toBe(true);
    expect(report.rejectedFor).toBeUndefined();
    expect(report.score).toBeGreaterThan(0);
  });

  it("refuses a model shot, because the ring cuts through the body", () => {
    const report = scoreCover(onModel);
    expect(report.qualifies).toBe(false);
    expect(report.rejectedFor).toMatch(/even sweep/);
  });

  it("refuses a subject running out of the bottom even when the sweep is clean", () => {
    const report = scoreCover(touchingBottom);
    expect(report.background.spread).toBeLessThan(12);
    expect(report.qualifies).toBe(false);
    expect(report.rejectedFor).toMatch(/top or bottom/);
  });

  it("refuses a subject that sits off-centre", () => {
    const report = scoreCover(frame({ top: 24, bottom: 132, left: 4, right: 52 }));
    expect(report.qualifies).toBe(false);
    expect(report.rejectedFor).toMatch(/off-centre/);
  });

  it("refuses a background too dark to read as white", () => {
    const report = scoreCover(frame({ top: 24, bottom: 132, left: 24, right: 96 }, [120, 130, 118]));
    expect(report.qualifies).toBe(false);
    expect(report.rejectedFor).toMatch(/too dark/);
  });

  it("refuses a frame with nothing in it", () => {
    const empty = frame({ top: -1, bottom: -1, left: -1, right: -1 });
    expect(scoreCover(empty).rejectedFor).toMatch(/nothing stands out/);
    expect(scoreCover(empty).unmeasurable).toBe(true);
  });

  it("calls a frame it cannot read unmeasurable, not bad", () => {
    // A pale garment on a pale sweep: the colour test finds almost nothing.
    const paleOnPale = frame({ top: 24, bottom: 132, left: 24, right: 96 }, [240, 240, 240]);
    for (let i = 0; i < paleOnPale.data.length; i += 4) {
      if (paleOnPale.data[i] < 100) {
        paleOnPale.data[i] = 250;
        paleOnPale.data[i + 1] = 250;
        paleOnPale.data[i + 2] = 250;
      }
    }
    const report = scoreCover(paleOnPale);
    expect(report.qualifies).toBe(false);
    expect(report.unmeasurable).toBe(true);
  });
});

describe("measureCover", () => {
  it("measures without judging, so a threshold can change its mind later", () => {
    const measurement = measureCover(flatLay);
    expect(measurement).not.toHaveProperty("qualifies");
    expect(measurement.margins.top).toBeCloseTo(24 / HEIGHT, 2);
    expect(measurement.margins.left).toBeCloseTo(24 / WIDTH, 2);
    expect(measurement.offCentre).toBeLessThan(0.02);
  });

  it("judges a measurement the same as measuring and judging together", () => {
    expect(judgeCover(measureCover(flatLay))).toEqual(scoreCover(flatLay));
  });
});

describe("pickCover", () => {
  it("takes the best of the photos that qualify", () => {
    const centred = { url: "centred.jpg", report: scoreCover(flatLay) };
    const drifted = {
      url: "drifted.jpg",
      report: scoreCover(frame({ top: 24, bottom: 132, left: 34, right: 106 })),
    };

    expect(pickCover([drifted, centred])?.url).toBe("centred.jpg");
  });

  it("leaves a cover that already works, rather than swapping it for a hair", () => {
    const current = { url: "current.jpg", report: scoreCover(flatLay) };
    const marginallyBetter = {
      url: "better.jpg",
      report: scoreCover(frame({ top: 26, bottom: 130, left: 25, right: 95 })),
    };

    expect(pickCover([current, marginallyBetter], { incumbent: "current.jpg" })?.url).toBe("current.jpg");
    // Without an incumbent to defend, the best score wins as before.
    expect(pickCover([current, marginallyBetter])?.url).toBe(
      marginallyBetter.report.score > current.report.score ? "better.jpg" : "current.jpg"
    );
  });

  it("keeps a cover it could not measure, rather than guessing against it", () => {
    const unreadable = { url: "pale.jpg", report: { ...scoreCover(flatLay), qualifies: false, unmeasurable: true } };
    const good = { url: "flat.jpg", report: scoreCover(flatLay) };

    expect(pickCover([unreadable, good], { incumbent: "pale.jpg" })?.url).toBe("pale.jpg");
  });

  it("replaces a cover that does not qualify, incumbent or not", () => {
    const broken = { url: "model.jpg", report: scoreCover(onModel) };
    const good = { url: "flat.jpg", report: scoreCover(flatLay) };

    expect(pickCover([broken, good], { incumbent: "model.jpg" })?.url).toBe("flat.jpg");
  });

  it("never promotes a photo that failed, whatever else is on offer", () => {
    expect(pickCover([{ url: "model.jpg", report: scoreCover(onModel) }])).toBeNull();
  });

  it("leaves an album of model shots alone", () => {
    const album = [onModel, onModel, onModel].map((image, index) => ({
      url: `model-${index}.jpg`,
      report: scoreCover(image),
    }));
    expect(pickCover(album)).toBeNull();
  });
});
