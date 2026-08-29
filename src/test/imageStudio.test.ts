import { describe, it, expect } from "vitest";
import {
  analyzeBackground,
  WHITE_TOLERANCE,
  UNIFORM_TOLERANCE,
} from "@/lib/imageStudio/analyze";
import {
  floodKey,
  levelAlpha,
  erode,
  dilate,
  pruneSpecks,
  fillHoles,
} from "@/lib/imageStudio/mask";
import { refineEdge, decontaminate, applyAlpha } from "@/lib/imageStudio/matte";
import { scoreMask } from "@/lib/imageStudio/quality";

/** A solid field of one colour, with an optional rectangle painted on top. */
function makeImage(
  width: number,
  height: number,
  background: [number, number, number],
  shape?: { x: number; y: number; w: number; h: number; color: [number, number, number] }
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    data[i] = background[0];
    data[i + 1] = background[1];
    data[i + 2] = background[2];
    data[i + 3] = 255;
  }
  if (shape) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        const i = (y * width + x) * 4;
        data[i] = shape.color[0];
        data[i + 1] = shape.color[1];
        data[i + 2] = shape.color[2];
      }
    }
  }
  return data;
}

describe("analyzeBackground", () => {
  it("reads the studio grey the catalogue is full of", () => {
    // rgb(153,154,156) is a real measurement from an ARTIEMASTER product.
    const data = makeImage(40, 40, [153, 154, 156]);
    const report = analyzeBackground(data, 40, 40);
    expect(report.color).toEqual([153, 154, 156]);
    expect(report.spread).toBe(0);
    expect(report.uniform).toBe(true);
    expect(report.alreadyWhite).toBe(false);
    expect(report.distanceFromWhite).toBeGreaterThan(WHITE_TOLERANCE);
  });

  it("calls a white sweep already white", () => {
    const report = analyzeBackground(makeImage(40, 40, [255, 255, 255]), 40, 40);
    expect(report.alreadyWhite).toBe(true);
    expect(report.distanceFromWhite).toBe(0);
  });

  // The product sits in the middle of the frame, so it must not drag the
  // reading of the background around it.
  it("ignores what is in the middle of the frame", () => {
    const data = makeImage(40, 40, [153, 154, 156], {
      x: 10,
      y: 10,
      w: 20,
      h: 20,
      color: [255, 0, 0],
    });
    const report = analyzeBackground(data, 40, 40);
    expect(report.color).toEqual([153, 154, 156]);
    expect(report.uniform).toBe(true);
  });

  it("reports a scene photo as not uniform, so the model is used instead", () => {
    const width = 40;
    const height = 40;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        // A steep gradient — the flood fill would leak straight through this.
        const v = (x / width) * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    const report = analyzeBackground(data, width, height);
    expect(report.spread).toBeGreaterThan(UNIFORM_TOLERANCE);
    expect(report.uniform).toBe(false);
  });
});

describe("floodKey", () => {
  it("removes the sweep and keeps the product", () => {
    const data = makeImage(20, 20, [153, 154, 156], {
      x: 6,
      y: 6,
      w: 8,
      h: 8,
      color: [200, 30, 40],
    });
    const alpha = floodKey(data, 20, 20, [153, 154, 156]);
    expect(alpha[0]).toBe(0); // corner: background
    expect(alpha[10 * 20 + 10]).toBe(255); // middle: product
  });

  // The failure this whole design is built to avoid: a white piece on a white
  // sweep. Seeding from the border means the fill cannot reach the middle.
  it("keeps a white product on a white background", () => {
    const data = makeImage(20, 20, [255, 255, 255], {
      x: 6,
      y: 6,
      w: 8,
      h: 8,
      color: [252, 252, 252],
    });
    // The shape is within tolerance of the background in colour, but it is not
    // connected to the edge, so it survives.
    const alpha = floodKey(data, 20, 20, [255, 255, 255], 1);
    expect(alpha[0]).toBe(0);
    expect(alpha[10 * 20 + 10]).toBe(255);
  });
});

describe("levelAlpha", () => {
  it("pushes a soft mask towards a decision without hard-edging it", () => {
    const alpha = levelAlpha(new Uint8ClampedArray([0, 40, 128, 215, 255]), 40, 215);
    expect(alpha[0]).toBe(0);
    expect(alpha[1]).toBe(0);
    expect(alpha[4]).toBe(255);
    // The middle keeps a ramp, so edges stay anti-aliased.
    expect(alpha[2]).toBeGreaterThan(0);
    expect(alpha[2]).toBeLessThan(255);
  });
});

describe("erode and dilate", () => {
  const solidSquare = () => {
    const alpha = new Uint8ClampedArray(9 * 9);
    for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) alpha[y * 9 + x] = 255;
    return alpha;
  };

  it("erode pulls the mask in by a pixel", () => {
    const out = erode(solidSquare(), 9, 9, 1);
    expect(out[2 * 9 + 2]).toBe(0); // was the corner of the square
    expect(out[4 * 9 + 4]).toBe(255); // centre survives
  });

  it("dilate is its inverse at the boundary", () => {
    const out = dilate(solidSquare(), 9, 9, 1);
    expect(out[1 * 9 + 1]).toBe(255);
  });
});

describe("pruneSpecks", () => {
  it("drops a speck and keeps both shoes of a pair", () => {
    const width = 30;
    const height = 10;
    const alpha = new Uint8ClampedArray(width * height);
    const box = (x0: number, y0: number, w: number, h: number) => {
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) alpha[y * width + x] = 255;
    };
    box(1, 1, 8, 8); // one shoe
    box(12, 1, 8, 8); // the other shoe
    box(26, 8, 1, 1); // a speck of caught shadow

    const { alpha: out, pieces } = pruneSpecks(alpha, width, height, 0.05);
    expect(pieces).toBe(2);
    expect(out[5 * width + 5]).toBe(255);
    expect(out[5 * width + 15]).toBe(255);
    expect(out[8 * width + 26]).toBe(0);
  });

  it("reports nothing rather than throwing on an empty mask", () => {
    const { alpha, pieces } = pruneSpecks(new Uint8ClampedArray(100), 10, 10);
    expect(pieces).toBe(0);
    expect(Array.from(alpha).every((v) => v === 0)).toBe(true);
  });
});

describe("fillHoles", () => {
  it("closes a hole punched through the middle of a product", () => {
    const width = 11;
    const height = 11;
    const alpha = new Uint8ClampedArray(width * height);
    for (let y = 2; y < 9; y++) for (let x = 2; x < 9; x++) alpha[y * width + x] = 255;
    alpha[5 * width + 5] = 0; // the hole

    const out = fillHoles(alpha, width, height);
    expect(out[5 * width + 5]).toBe(255);
    expect(out[0]).toBe(0); // the real background is untouched
  });
});

describe("decontaminate", () => {
  // This is the halo, in one pixel. An edge pixel that is half product and half
  // studio grey reads as a muddy mix; composited onto white it shows as a grey
  // outline. Solving C = a*F + (1-a)*B gives the product's own colour back.
  it("recovers the product colour from a half-covered edge pixel", () => {
    const background: [number, number, number] = [153, 154, 156];
    const product: [number, number, number] = [200, 30, 40];
    const observed = product.map((f, i) => 0.5 * f + 0.5 * background[i]);

    const rgba = new Uint8ClampedArray([...observed, 128]);
    const alpha = new Uint8ClampedArray([128]);
    decontaminate(rgba, alpha, background);

    expect(rgba[0]).toBeGreaterThan(product[0] - 4);
    expect(rgba[0]).toBeLessThan(product[0] + 4);
    expect(rgba[1]).toBeLessThan(product[1] + 4);
    expect(rgba[2]).toBeLessThan(product[2] + 4);
  });

  it("leaves solid pixels exactly as they were", () => {
    const rgba = new Uint8ClampedArray([200, 30, 40, 255]);
    decontaminate(rgba, new Uint8ClampedArray([255]), [153, 154, 156]);
    expect(Array.from(rgba)).toEqual([200, 30, 40, 255]);
  });
});

describe("refineEdge", () => {
  const background: [number, number, number] = [153, 154, 156];

  it("rebuilds a sharp edge the model returned soft", () => {
    // Three pixels in a row: background, an edge pixel that is nearly all
    // product but which the model was only 50% sure of, and solid product.
    const rgba = new Uint8ClampedArray([
      153, 154, 156, 255,
      198, 34, 44, 255,
      200, 30, 40, 255,
    ]);
    const alpha = new Uint8ClampedArray([0, 128, 255]);
    const out = refineEdge(rgba, alpha, 3, 1, background, 1);
    // Colour says this pixel is almost entirely product, so it is promoted
    // well past the model's hesitant 128.
    expect(out[1]).toBeGreaterThan(200);
    expect(out[0]).toBe(0);
    expect(out[2]).toBe(255);
  });

  it("reads coverage from the product beside it, not the average of the photo", () => {
    // The failure a single image-wide average produced, in one row: a pale part
    // of the product next to the backdrop. Averaged against a photo full of
    // dark pixels, a half-covered pale edge looks like background and the edge
    // gets eaten. Measured against the pale pixel actually next to it, it reads
    // as half — which is what it is.
    const pale: [number, number, number] = [204, 205, 206];
    const half = pale.map((f, i) => (f + background[i]) / 2) as [number, number, number];
    const rgba = new Uint8ClampedArray([
      ...background, 255,
      ...half, 255,
      ...pale, 255,
    ]);
    const out = refineEdge(rgba, new Uint8ClampedArray([0, 128, 255]), 3, 1, background, 1);
    expect(out[1]).toBeGreaterThan(100);
    expect(out[1]).toBeLessThan(160);
  });

  it("still finds the product colour behind a strand thinner than the band", () => {
    // A single-pixel strand of dark hair against the sweep. Opening a band
    // around the edge marks the strand itself undecided, so there is no
    // confident pixel left anywhere near it to read a colour from. Passing the
    // mask from before the band was opened is what keeps the strand: without
    // it, the whole strand sat at its undecided value and combed away.
    const strand: [number, number, number] = [60, 40, 35];
    const rgba = new Uint8ClampedArray([
      ...background, 255,
      ...strand, 255,
      ...background, 255,
    ]);
    const opened = new Uint8ClampedArray([0, 128, 0]);
    const beforeOpening = new Uint8ClampedArray([0, 255, 0]);

    const blind = refineEdge(rgba, opened, 3, 1, background, 1);
    expect(blind[1]).toBe(128); // nothing to sample: the guess is not improved

    const withReference = refineEdge(rgba, opened, 3, 1, background, 1, 4, beforeOpening);
    expect(withReference[1]).toBe(255); // reads as fully covered, which it is
  });

  it("leaves the mask alone where the product matches the backdrop", () => {
    // No colour can separate a grey product from a grey sweep. Guessing here is
    // worse than deferring to the mask that came in.
    const rgba = new Uint8ClampedArray([
      153, 154, 156, 255,
      154, 155, 157, 255,
      155, 156, 158, 255,
    ]);
    const out = refineEdge(rgba, new Uint8ClampedArray([0, 128, 255]), 3, 1, background, 1);
    expect(out[1]).toBe(128);
  });
});

describe("applyAlpha", () => {
  it("writes the mask into the alpha channel", () => {
    const rgba = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]);
    applyAlpha(rgba, new Uint8ClampedArray([0, 128]));
    expect(rgba[3]).toBe(0);
    expect(rgba[7]).toBe(128);
  });
});

describe("scoreMask", () => {
  const full = (w: number, h: number, fill: number) =>
    new Uint8ClampedArray(w * h).fill(fill);

  // The silent failure the score exists to catch: the model finds no background
  // at all and hands back a mask that changes nothing.
  it("rejects a mask that removed nothing", () => {
    expect(scoreMask(full(20, 20, 255), 20, 20, 1).verdict).toBe("reject");
  });

  it("rejects a mask that removed the product", () => {
    expect(scoreMask(full(20, 20, 0), 20, 20, 0).verdict).toBe("reject");
  });

  it("accepts a product sitting in the middle of the frame", () => {
    const width = 40;
    const height = 40;
    const alpha = new Uint8ClampedArray(width * height);
    for (let y = 8; y < 32; y++) for (let x = 8; x < 32; x++) alpha[y * width + x] = 255;
    const report = scoreMask(alpha, width, height, 1);
    expect(report.verdict).toBe("ok");
    expect(report.borderCoverage).toBe(0);
    expect(report.coverage).toBeCloseTo(0.36, 2);
  });

  it("asks for review when the mask shattered into specks", () => {
    const width = 40;
    const height = 40;
    const alpha = new Uint8ClampedArray(width * height);
    for (let y = 8; y < 32; y++) for (let x = 8; x < 32; x++) alpha[y * width + x] = 255;
    expect(scoreMask(alpha, width, height, 9).verdict).toBe("review");
  });
});
