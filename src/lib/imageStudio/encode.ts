/**
 * Loading images in, and writing cut-outs back out.
 *
 * Everything the studio produces keeps an alpha channel, so the encoder has to
 * be one that has one. WebP is the choice: a transparent WebP of a product shot
 * is a fraction of the same image as PNG, and every browser the shop supports
 * can display one. Encoding one is a newer trick than displaying one, though,
 * so the fallback matters.
 */

/** Nothing in the catalogue benefits from being larger than this. */
export const MAX_EDGE = 2000;

export interface LoadedImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** The decoded pixels, re-encoded as PNG, ready to hand to the segmenter. */
  blob: Blob;
}

let webpSupport: boolean | null = null;

/** Whether this browser can *write* a WebP, which Safari only learned in 16.4. */
export function canEncodeWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}

/**
 * Decode one source into an image element whose pixels are readable.
 *
 * The pixels have to be readable — a tainted canvas makes `getImageData` throw —
 * so the bytes are fetched and handed to the element as a blob URL rather than
 * pointing it at the remote URL directly. That is not a detour. `pub-*.r2.dev`
 * attaches `Access-Control-Allow-Origin` only to requests that carry an
 * `Origin`, and the reply it sends without one carries no `Vary: Origin` to mark
 * the two responses apart. So once a plain preview `<img>` has cached the
 * header-less copy, the browser is free to hand that same copy to a later
 * `crossOrigin` request, which then fails its CORS check for a reason no amount
 * of bucket configuration can repair. A blob URL is same-origin and sidesteps
 * the check entirely; the second pass with `reload` evicts an entry that was
 * already poisoned before any of this ran.
 */
async function decode(src: string): Promise<HTMLImageElement> {
  const draw = (url: string, cors: boolean) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      if (cors) el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Could not load ${src.slice(0, 80)}`));
      el.src = url;
    });

  // Already local: no request is made, so none of the above applies.
  if (src.startsWith("data:") || src.startsWith("blob:")) return draw(src, false);

  let failure: unknown;
  for (const cache of ["default", "reload"] as const) {
    let objectUrl: string | undefined;
    try {
      const response = await fetch(src, { mode: "cors", credentials: "omit", cache });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      objectUrl = URL.createObjectURL(await response.blob());
      // Awaited inside the `try` so the revoke below cannot run until the
      // element has finished decoding the blob it points at.
      return await draw(objectUrl, false);
    } catch (error) {
      failure = error;
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  // Both fetches failed. The element itself may still manage the load, so let it
  // try; if it cannot either, report why the fetch failed rather than the bare
  // `onerror`, which says nothing about status codes.
  return draw(src, true).catch(() => {
    const detail = failure instanceof Error ? `: ${failure.message}` : "";
    throw new Error(`Could not load ${src.slice(0, 80)}${detail}`);
  });
}

/** Decode a URL or data URL into raw pixels. */
export async function loadImage(src: string, maxEdge = MAX_EDGE): Promise<LoadedImage> {
  const image = await decode(src);

  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not open a canvas to decode the image.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const blob = await toBlob(canvas, "image/png", 1);
  return { data, width, height, blob };
}

/** Encode finished RGBA pixels as a transparent WebP, or PNG where it must. */
export async function encodeCutout(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  quality = 0.92
): Promise<{ blob: Blob; extension: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not open a canvas to encode the cut-out.");
  ctx.putImageData(new ImageData(data as unknown as ConstructorParameters<typeof ImageData>[0], width, height), 0, 0);

  if (canEncodeWebp()) {
    return { blob: await toBlob(canvas, "image/webp", quality), extension: "webp" };
  }
  return { blob: await toBlob(canvas, "image/png", 1), extension: "png" };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}.`))),
      type,
      quality
    );
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the encoded image."));
    reader.readAsDataURL(blob);
  });
}
