/**
 * The neural segmenter, and everything it needs to behave.
 *
 * The library is loaded through a dynamic `import()` so that neither it nor the
 * ONNX runtime it carries lands in the chunk a shopper downloads. Only the
 * admin ever reaches this file.
 */

import type { Config } from "@imgly/background-removal";

type Library = typeof import("@imgly/background-removal");

let libraryPromise: Promise<Library> | null = null;
function library(): Promise<Library> {
  libraryPromise ??= import("@imgly/background-removal");
  return libraryPromise;
}

export type Progress = (stage: string, current: number, total: number) => void;

/**
 * The defaults are the weak ones, and the old call passed no config at all.
 *
 * - `isnet` is the full-precision model rather than the `isnet_fp16` default.
 *   The admin runs this a few hundred times against a permanent catalogue; the
 *   extra download buys accuracy on exactly the shots that fail today.
 * - `device` is decided per machine by `pickDevice` below.
 *
 * `proxyToWorker` is deliberately off, and must stay off. It reads like the
 * setting that keeps the admin responsive, and it was set here for that reason,
 * but in this version of the library it does not start a worker at all — it is
 * ANDed with the WebGPU check and its only effect is to flip `env.wasm.proxy`,
 * a single mutable global inside the ONNX runtime. That global is re-read at
 * runtime init, at execution-provider init, and again at session creation. So
 * when the GPU attempt below failed and retried on CPU, the runtime had already
 * initialised its WebAssembly inside the proxy worker while the main thread
 * still believed it had none: the retry skipped init as "already done", then
 * threw `WebAssembly is not initialized yet.` The runtime caches that failure,
 * which is why the tool stayed broken until the page was reloaded.
 */
function baseConfig(device: "cpu" | "gpu", progress?: Progress): Config {
  return {
    model: "isnet",
    device,
    proxyToWorker: false,
    output: { format: "image/png", quality: 1 },
    progress,
  } as Config;
}

let devicePromise: Promise<"cpu" | "gpu"> | null = null;

/**
 * WebGPU where it exists, CPU everywhere else.
 *
 * On a catalogue-sized run the difference is between minutes and most of an
 * hour, but WebGPU is still absent or broken on plenty of browsers, so the
 * choice is made once by asking for an adapter rather than by sniffing.
 *
 * The answer is memoised as the *promise*, not as the resolved value. The
 * previous version wrote `"cpu"` before awaiting the adapter, so two callers
 * that started together got two different answers — one racing ahead on CPU
 * while the other still expected a GPU — and both configured the same runtime.
 */
function pickDevice(): Promise<"cpu" | "gpu"> {
  devicePromise ??= (async () => {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return gpu && (await gpu.requestAdapter()) ? "gpu" : "cpu";
    } catch {
      return "cpu";
    }
  })();
  return devicePromise;
}

/** Pin CPU for the rest of the session, once a GPU attempt has proved it cannot. */
function demoteToCpu(): void {
  devicePromise = Promise.resolve("cpu");
}

/** Download the model ahead of a batch so the first item is not the slow one. */
export async function preload(progress?: Progress): Promise<void> {
  const lib = await library();
  await lib.preload(baseConfig(await pickDevice(), progress));
}

/**
 * The raw mask, as one byte per pixel at the source resolution.
 *
 * `segmentForeground` is used rather than `removeBackground` because we want
 * the mask on its own: `removeBackground` bakes it into the alpha channel and
 * throws away the chance to clean the edges, which is the whole problem being
 * fixed here.
 */
export async function neuralMask(
  source: Blob,
  width: number,
  height: number,
  progress?: Progress
): Promise<Uint8ClampedArray> {
  const lib = await library();
  const chosen = await pickDevice();

  let masked: Blob;
  try {
    masked = await lib.segmentForeground(source, baseConfig(chosen, progress));
  } catch (error) {
    // A WebGPU adapter can exist and still fail to compile the graph. Fall back
    // once, permanently, rather than failing every image in a batch. This retry
    // is only safe because `proxyToWorker` is off: with it on, the two attempts
    // disagreed about which thread owned the WebAssembly instance and left the
    // runtime wedged for the life of the page.
    if (chosen === "gpu") {
      demoteToCpu();
      masked = await lib.segmentForeground(source, baseConfig("cpu", progress));
    } else {
      throw error;
    }
  }

  const bitmap = await createImageBitmap(masked);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not read the mask back from a canvas.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    const alpha = new Uint8ClampedArray(width * height);
    for (let p = 0; p < alpha.length; p++) alpha[p] = data[p * 4 + 3];
    return alpha;
  } finally {
    bitmap.close();
  }
}
