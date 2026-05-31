/**
 * enhanceImage.ts
 *
 * Browser-native HD photo enhancement pipeline.
 * Applied automatically to every product photo on upload.
 *
 * Pipeline:
 *   1. Step-up 2× upscale   – better quality than single-step resize
 *   2. JPEG artifact soften  – light blur isolates compression noise, blended out
 *   3. Unsharp mask          – recovers fine-grain detail (fabric, edges, material)
 *   4. Auto levels           – expands dynamic range / natural contrast boost
 */

/* ─── Helpers ─────────────────────────────────────────────────── */

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

/** Render src into a new canvas at the given dimensions with high-quality smoothing. */
const renderInto = (
  src: CanvasImageSource,
  w: number,
  h: number
): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return c;
};

/** Returns a blurred copy via CSS filter (GPU-accelerated in most browsers). */
const blurCanvas = (src: HTMLCanvasElement, radius: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(src, 0, 0);
  return c;
};

/* ─── Step 1: Step-up 2× upscale ──────────────────────────────── */

/**
 * Upscale in two steps (×1.5 → ×2) instead of one jump.
 * Minimises the interpolation artefacts a single-step resize introduces.
 */
const stepUpscale2x = (
  src: HTMLImageElement | HTMLCanvasElement
): HTMLCanvasElement => {
  const srcW = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
  const srcH = src instanceof HTMLImageElement ? src.naturalHeight : src.height;

  // Step A: ×1.5
  const mid = renderInto(src, Math.round(srcW * 1.5), Math.round(srcH * 1.5));

  // Step B: full ×2
  return renderInto(mid, srcW * 2, srcH * 2);
};

/* ─── Step 2: JPEG artifact soften ────────────────────────────── */

/**
 * Very light Gaussian-blend to dissolve compression block artefacts,
 * without destroying real texture (blend kept at 15%).
 */
const softenArtifacts = (canvas: HTMLCanvasElement): void => {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  const blurred = blurCanvas(canvas, 0.6);

  const orig = ctx.getImageData(0, 0, w, h);
  const blur = blurred.getContext('2d')!.getImageData(0, 0, w, h);

  const od = orig.data;
  const bd = blur.data;
  const alpha = 0.15; // 15% blend — just enough to kill block artefacts

  for (let i = 0; i < od.length; i += 4) {
    od[i]     = Math.round(od[i]     * (1 - alpha) + bd[i]     * alpha);
    od[i + 1] = Math.round(od[i + 1] * (1 - alpha) + bd[i + 1] * alpha);
    od[i + 2] = Math.round(od[i + 2] * (1 - alpha) + bd[i + 2] * alpha);
    // alpha channel unchanged
  }

  ctx.putImageData(orig, 0, 0);
};

/* ─── Step 3: Unsharp mask ─────────────────────────────────────── */

/**
 * Classic photographic unsharp mask.
 * output = clamp(original + amount × (original − blurred))
 *
 * amount  – strength of sharpening (0 = none, 1 = full edge pop)
 * radius  – blur radius defining the "detail scale" to enhance
 */
const applyUnsharpMask = (
  canvas: HTMLCanvasElement,
  amount = 0.6,
  radius = 1.1
): void => {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  const origData = ctx.getImageData(0, 0, w, h);
  const blurData = blurCanvas(canvas, radius)
    .getContext('2d')!
    .getImageData(0, 0, w, h);

  const od = origData.data;
  const bd = blurData.data;
  const out = new Uint8ClampedArray(od.length);

  for (let i = 0; i < od.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const o = od[i + c];
      const b = bd[i + c];
      // Unsharp: sharpen = orig + amount×(orig − blurred)
      out[i + c] = Math.max(0, Math.min(255, Math.round(o + amount * (o - b))));
    }
    out[i + 3] = od[i + 3]; // preserve alpha
  }

  ctx.putImageData(new ImageData(out, w, h), 0, 0);
};

/* ─── Step 4: Auto levels ──────────────────────────────────────── */

/**
 * Per-channel histogram stretch with 0.4% clip at each tail.
 * Naturally expands dynamic range without introducing colour casts.
 */
const applyAutoLevels = (canvas: HTMLCanvasElement): void => {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // Build per-channel histograms
  const hists = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let i = 0; i < d.length; i += 4) {
    hists[0][d[i]]++;
    hists[1][d[i + 1]]++;
    hists[2][d[i + 2]]++;
  }

  const clip = Math.round(w * h * 0.004); // 0.4% clip

  const findRange = (hist: Uint32Array) => {
    let lo = 0, count = 0;
    for (let v = 0; v <= 255; v++) { count += hist[v]; if (count >= clip) { lo = v; break; } }
    let hi = 255; count = 0;
    for (let v = 255; v >= 0; v--) { count += hist[v]; if (count >= clip) { hi = v; break; } }
    return { lo, hi: Math.max(hi, lo + 1) };
  };

  const luts = hists.map((hist) => {
    const { lo, hi } = findRange(hist);
    const range = hi - lo;
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      lut[v] = Math.max(0, Math.min(255, Math.round(((v - lo) / range) * 255)));
    }
    return lut;
  });

  for (let i = 0; i < d.length; i += 4) {
    d[i]     = luts[0][d[i]];
    d[i + 1] = luts[1][d[i + 1]];
    d[i + 2] = luts[2][d[i + 2]];
  }

  ctx.putImageData(img, 0, 0);
};

/* ─── Public API ───────────────────────────────────────────────── */

/**
 * Apply the full HD enhancement pipeline to a base64 image.
 *
 * Returns a base64 JPEG at 2× the original pixel dimensions,
 * with sharpened detail, expanded dynamic range, and clean edges.
 */
export const enhanceImage = async (base64: string): Promise<string> => {
  const img = await loadImage(base64);

  // 1. Step-up 2× upscale
  const canvas = stepUpscale2x(img);

  // 2. Soften JPEG block artefacts before sharpening
  softenArtifacts(canvas);

  // 3. Unsharp mask — recover fine-grain detail
  applyUnsharpMask(canvas, 0.6, 1.1);

  // 4. Auto levels — expand tonal range naturally
  applyAutoLevels(canvas);

  // Output at near-lossless quality to preserve all recovered detail
  return canvas.toDataURL('image/jpeg', 0.98);
};
