import { describe, it, expect } from "vitest";
import { applyCropToProducts } from "@/lib/cropClipboard";
import type { Product } from "@/data/products";

const CROP = { x: 25, y: 75, zoom: 2 };

function product(id: string, images: string[], over: Partial<Product> = {}): Product {
  return {
    id, name: `P${id}`, category: "footwear", designer: "Vans",
    price: 1, createdAt: 1, rating: 5,
    image: images[0] ?? "", images,
    ...over,
  } as Product;
}

describe("applyCropToProducts", () => {
  it("writes the framing into the slot it was copied from", () => {
    const { updated, skipped } = applyCropToProducts(
      [product("1", ["a.jpg", "b.jpg"])], CROP, 1, false
    );
    expect(skipped).toBe(0);
    expect(updated[0].displayCrops).toEqual({ 1: CROP });
  });

  it("leaves the product's other framings alone", () => {
    const existing = product("1", ["a.jpg", "b.jpg"], {
      displayCrops: { 0: { x: 0, y: 0, zoom: 1 } },
    });
    const { updated } = applyCropToProducts([existing], CROP, 1, false);
    expect(updated[0].displayCrops).toEqual({
      0: { x: 0, y: 0, zoom: 1 },
      1: CROP,
    });
  });

  it("skips a product with no photo in that slot instead of writing a phantom crop", () => {
    // The framing came from photo #3; this product has two. Writing crops[2]
    // would sit invisible until someone added a third photo, then apply itself.
    const { updated, skipped } = applyCropToProducts(
      [product("1", ["a.jpg", "b.jpg"])], CROP, 2, false
    );
    expect(updated).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it("covers every photo when asked, replacing what was there", () => {
    const existing = product("1", ["a.jpg", "b.jpg", "c.jpg"], {
      displayCrops: { 0: { x: 99, y: 99, zoom: 3 } },
    });
    const { updated, skipped } = applyCropToProducts([existing], CROP, 0, true);
    expect(skipped).toBe(0);
    expect(updated[0].displayCrops).toEqual({ 0: CROP, 1: CROP, 2: CROP });
  });

  it("reaches a product whose only photo is the primary, with no images array", () => {
    const bare = { ...product("1", []), image: "only.jpg", images: undefined } as Product;
    const { updated, skipped } = applyCropToProducts([bare], CROP, 0, false);
    expect(skipped).toBe(0);
    expect(updated[0].displayCrops).toEqual({ 0: CROP });
  });

  it("skips a product with no photo at all", () => {
    const empty = { ...product("1", []), image: "", images: [] } as Product;
    const { updated, skipped } = applyCropToProducts([empty], CROP, 0, false);
    expect(updated).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it("copies the crop rather than sharing it between products", () => {
    const { updated } = applyCropToProducts(
      [product("1", ["a.jpg"]), product("2", ["b.jpg"])], CROP, 0, false
    );
    updated[0].displayCrops![0].zoom = 3;
    expect(updated[1].displayCrops![0].zoom).toBe(2);
    expect(CROP.zoom).toBe(2);
  });

  it("does not mutate the products handed to it", () => {
    const original = product("1", ["a.jpg"]);
    applyCropToProducts([original], CROP, 0, false);
    expect(original.displayCrops).toBeUndefined();
  });
});
