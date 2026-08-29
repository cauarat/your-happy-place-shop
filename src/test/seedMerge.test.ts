import { describe, it, expect } from "vitest";
import { mergeSeed } from "@/lib/store";
import type { Product } from "@/data/products";

/** A seed row, as `catalog.json` carries it: no admin-owned fields at all. */
function seedRow(id: string, over: Partial<Product> = {}): Product {
  return {
    id,
    name: `Product ${id}`,
    category: "footwear",
    designer: "Vans",
    price: 100,
    createdAt: 1,
    rating: 5,
    image: `https://cdn/${id}.jpg`,
    ...over,
  } as Product;
}

const raw = (rows: Product[]) => JSON.stringify(rows);
const parse = (s: string) => JSON.parse(s) as Product[];
const byId = (rows: Product[], id: string) => rows.find((p) => p.id === id)!;

describe("mergeSeed", () => {
  it("returns the seed untouched when nothing is stored yet", () => {
    const seed = raw([seedRow("1")]);
    expect(mergeSeed(seed, null, new Set())).toBe(seed);
  });

  it("keeps the admin's cut-out, 16:9 and crops when the seed moves on", () => {
    const stored = raw([
      seedRow("1", {
        image: "https://r2/cutout.webp",
        originalImage: "https://cdn/1.jpg",
        removeBackground: true,
        detailImage: "https://r2/wide.jpg",
        displayCrops: { 0: { x: 10, y: 20, zoom: 2 } },
        video: "https://r2/clip.mp4",
      }),
    ]);
    // The new seed has a new price and knows nothing about any of that.
    const seed = raw([seedRow("1", { price: 250, name: "Renamed" })]);

    const out = byId(parse(mergeSeed(seed, stored, new Set(["1"]))), "1");

    expect(out.image).toBe("https://r2/cutout.webp");
    expect(out.detailImage).toBe("https://r2/wide.jpg");
    expect(out.displayCrops).toEqual({ 0: { x: 10, y: 20, zoom: 2 } });
    expect(out.removeBackground).toBe(true);
    expect(out.video).toBe("https://r2/clip.mp4");
    // ...while catalogue-owned fields DO move forward.
    expect(out.price).toBe(250);
    expect(out.name).toBe("Renamed");
  });

  it("keeps a product the admin created, which no seed has ever contained", () => {
    const stored = raw([seedRow("1"), seedRow("local-1")]);
    const seed = raw([seedRow("1")]);
    const out = parse(mergeSeed(seed, stored, new Set(["1"])));
    expect(out.map((p) => p.id)).toContain("local-1");
  });

  it("lets go of a product the catalogue deliberately dropped", () => {
    const stored = raw([seedRow("1"), seedRow("2")]);
    const seed = raw([seedRow("1")]);
    // "2" was in the previous seed, so its absence now is a real removal.
    const out = parse(mergeSeed(seed, stored, new Set(["1", "2"])));
    expect(out.map((p) => p.id)).toEqual(["1"]);
  });

  it("adds products the new seed introduces", () => {
    const stored = raw([seedRow("1")]);
    const seed = raw([seedRow("1"), seedRow("2")]);
    const out = parse(mergeSeed(seed, stored, new Set(["1"])));
    expect(out.map((p) => p.id).sort()).toEqual(["1", "2"]);
  });

  it("falls back to the seed rather than throwing on unreadable storage", () => {
    const seed = raw([seedRow("1")]);
    expect(mergeSeed(seed, "{ not json", new Set())).toBe(seed);
  });

  it("does not resurrect anything on the first merge, when no ledger exists", () => {
    // Before this change there was no seed-id ledger, so an empty one must be
    // read as "unknown", never as "the previous seed was empty".
    const stored = raw([seedRow("1"), seedRow("old")]);
    const seed = raw([seedRow("1")]);
    const out = parse(mergeSeed(seed, stored, new Set()));
    expect(out.map((p) => p.id)).toContain("old");
  });
});
