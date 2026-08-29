import type { Product } from "@/data/products";

export interface CropValue { x: number; y: number; zoom: number }

export interface CropClipboard {
  crop: CropValue;
  /** Which slot it was copied from, so it lands on the matching photo. */
  index: number;
  /** For showing what is on the clipboard, not for applying it. */
  sourceName: string;
  sourceImage: string;
}

const KEY = "villaoro_crop_clipboard";

/**
 * The framing clipboard, kept in localStorage rather than in React state.
 *
 * Copying happens on one product's page and pasting on another's, and the
 * editor unmounts in between — so anything held in a component would be gone
 * by the time it was needed. It also means a copy survives a reload, which is
 * the difference between a usable tool and one that loses your place.
 */
export function readCropClipboard(): CropClipboard | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CropClipboard;
    return typeof parsed?.crop?.zoom === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCropClipboard(value: CropClipboard): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // A full quota must not cost the user the edit they were making.
  }
}

export function clearCropClipboard(): void {
  localStorage.removeItem(KEY);
}

export interface ApplyOutcome {
  updated: Product[];
  /** Products that have no photo in the slot the framing came from. */
  skipped: number;
}

/**
 * Put one framing onto many products.
 *
 * `displayCrops` is keyed by position in `images`, so a framing copied from the
 * third photo means nothing to a product with two. Those are skipped and
 * counted rather than silently written to a slot that does not exist, which
 * would leave a crop that only appears once someone adds a photo later.
 */
export function applyCropToProducts(
  products: Product[],
  crop: CropValue,
  index: number,
  everyImage: boolean,
): ApplyOutcome {
  const updated: Product[] = [];
  let skipped = 0;

  for (const product of products) {
    const count = product.images?.length ?? (product.image ? 1 : 0);
    if (count === 0) {
      skipped++;
      continue;
    }

    if (everyImage) {
      const crops: NonNullable<Product["displayCrops"]> = {};
      for (let i = 0; i < count; i++) crops[i] = { ...crop };
      updated.push({ ...product, displayCrops: crops });
      continue;
    }

    if (index >= count) {
      skipped++;
      continue;
    }
    updated.push({
      ...product,
      displayCrops: { ...(product.displayCrops || {}), [index]: { ...crop } },
    });
  }

  return { updated, skipped };
}
