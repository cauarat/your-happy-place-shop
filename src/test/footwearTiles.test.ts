import { describe, it, expect } from "vitest";
import { computeCropStyles, FOOTWEAR_TILE_CROP } from "@/lib/cropUtils";
import catalogue from "@/data/catalog.json";

/** The grid tile, which is 4/5 for every category — see ProductCard.tsx. */
const TILE = 4 / 5;

interface Row {
  designer?: string;
  category?: string;
  image?: string | null;
  displayCrops?: Record<string, { x: number; y: number; zoom: number }>;
}

const products = catalogue as Row[];
const footwear = products.filter((p) => p.category === "Footwear");

describe("the catalogue's footwear tiles", () => {
  it("gives every footwear product with a photo the same display crop", () => {
    // The bug this guards: 72 Vans arrived with no crop at all, so ProductCard
    // fell through to object-contain and letterboxed them next to the Louis
    // Vuitton shoes, which were cropped and filled their tiles.
    const withPhoto = footwear.filter((p) => p.image);
    const uncropped = withPhoto.filter((p) => !p.displayCrops?.["0"]);
    expect(uncropped).toEqual([]);

    const values = new Set(withPhoto.map((p) => JSON.stringify(p.displayCrops!["0"])));
    expect([...values]).toEqual([JSON.stringify(FOOTWEAR_TILE_CROP)]);
  });

  it("has Vans and Louis Vuitton reaching the tile by the same arithmetic", () => {
    // Both suppliers' covers are 3:4 now, so the same crop produces the same
    // box. Before the re-frame the Vans photos were 3:2 and this crop would
    // have taken 44% off each side — the toe and the heel.
    const lv = computeCropStyles(773 / 1031, TILE, FOOTWEAR_TILE_CROP);
    const vans = computeCropStyles(1080 / 1440, TILE, FOOTWEAR_TILE_CROP);

    // Not byte-identical: Louis Vuitton's scans are 773×1031, which is 0.7497
    // rather than a clean 0.75. The point is that they land in the same place.
    expect(vans.width).toBe(lv.width);
    expect(vans.left).toBe(lv.left);
    expect(parseFloat(String(vans.height))).toBeCloseTo(parseFloat(String(lv.height)), 1);
    expect(parseFloat(String(vans.top))).toBeCloseTo(parseFloat(String(lv.top)), 1);
  });

  it("covers the tile completely and anchors the shoe to its bottom", () => {
    const styles = computeCropStyles(1080 / 1440, TILE, FOOTWEAR_TILE_CROP);
    expect(parseFloat(String(styles.width))).toBeGreaterThanOrEqual(100);
    expect(parseFloat(String(styles.height))).toBeGreaterThanOrEqual(100);
    // y = 100 puts the overflow above the frame, so the bottom edge is flush.
    expect(parseFloat(String(styles.top))).toBeLessThanOrEqual(0);
    expect(parseFloat(String(styles.top))).toBeCloseTo(100 - parseFloat(String(styles.height)), 5);
  });

  it("would have cropped the shoe had the photos been left landscape", () => {
    // Kept as the reason the re-frame exists rather than a crop-only fix.
    const landscape = computeCropStyles(1080 / 720, TILE, FOOTWEAR_TILE_CROP);
    expect(parseFloat(String(landscape.width))).toBeCloseTo(187.5, 1);
    // 87.5% of the frame's width falls outside the tile, 43.75% off each side.
    expect(parseFloat(String(landscape.left))).toBeCloseTo(-43.75, 1);
  });

  it("leaves the shopper's name free of the supplier's price and Chinese", () => {
    const vans = products.filter((p) => p.designer === "Vans") as unknown as { name: string }[];
    expect(vans.length).toBeGreaterThan(0);
    for (const product of vans) {
      expect(product.name).not.toMatch(/[￥¥]/);
      expect(product.name).not.toMatch(/[一-鿿]/);
    }
  });
});
