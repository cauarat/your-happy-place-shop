import { supabase } from "@/integrations/supabase/client";

/**
 * Uploading a product image.
 *
 * There are no credentials in this file, and there must never be again. The
 * previous version built an S3 client here from `import.meta.env.VITE_*`, and
 * that prefix is precisely what inlines a value into the JavaScript every
 * visitor downloads — the bucket's access key and secret shipped in a public
 * chunk, readable by anyone who opened the shop.
 *
 * Instead the `r2-upload-url` Edge Function checks who is asking, picks the
 * object key itself, and returns a URL that is good for five minutes. The file
 * then goes straight from the browser to R2, which keeps a few hundred images
 * from making a pointless round trip through the function.
 */

export interface UploadOptions {
  /**
   * Throw instead of returning a base64 data URL when the upload cannot happen.
   *
   * The fallback is right for a single upload — better a working image than a
   * lost edit. It is ruinous in bulk: a few hundred base64 images go into
   * localStorage as megabytes of text each and blow the quota, taking the
   * catalogue with them. Anything processing more than one image must pass this.
   */
  strict?: boolean;
}

export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type: mime});
};

interface Ticket {
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
}

/** Ask the server for permission to write one object. */
async function requestTicket(extension: string): Promise<Ticket> {
  const { data, error } = await supabase.functions.invoke("r2-upload-url", {
    body: { extension },
  });

  if (error) {
    // The function answers non-2xx with a readable reason — "not signed in",
    // "this account cannot upload", "ADMIN_EMAILS is not set". Surfacing that
    // beats a generic failure, because every one of them is a different fix.
    const detail =
      (data as { error?: string } | null)?.error ??
      (await readFunctionError(error)) ??
      error.message;
    throw new Error(detail);
  }
  if (!data?.uploadUrl || !data?.publicUrl) {
    throw new Error("The upload service returned an unusable response.");
  }
  return data as Ticket;
}

/** Supabase wraps a non-2xx body in the error; dig the message back out. */
async function readFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response }).context;
  if (!context || typeof context.json !== "function") return null;
  try {
    const body = await context.json();
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

/** Whether this signed-in account may upload, asked without uploading. */
export const checkUploadAccess = async (): Promise<{ ok: boolean; reason?: string }> => {
  try {
    await requestTicket("webp");
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Unavailable." };
  }
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

/**
 * Uploads a file or base64 string to Cloudflare R2 and returns its public URL.
 * Falls back to a base64 data URL if the upload cannot happen, unless `strict`.
 */
export const uploadToR2 = async (
  fileOrBase64: File | string,
  customExtension?: string,
  options: UploadOptions = {}
): Promise<string> => {
  let file: File;
  let base64String = "";

  if (typeof fileOrBase64 === 'string') {
    base64String = fileOrBase64;
    const mimeMatch = fileOrBase64.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = customExtension || (mime.split('/')[1] || 'jpg');
    file = base64ToFile(fileOrBase64, `upload.${ext}`);
  } else {
    file = fileOrBase64;
  }

  const extension = customExtension || file.name.split('.').pop() || 'jpg';
  const isVideo = file.type.startsWith('video/');
  const timeoutMs = isVideo ? 45000 : 20000;

  try {
    const ticket = await requestTicket(extension);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(ticket.uploadUrl, {
        method: "PUT",
        // Must match what the function signed, or R2 rejects the signature.
        headers: { "Content-Type": ticket.contentType },
        body: file,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`R2 refused the upload (${response.status}).`);
      }
    } finally {
      clearTimeout(timer);
    }

    return ticket.publicUrl;
  } catch (error) {
    if (options.strict) throw error;
    console.error("Upload failed, falling back to base64:", error);
    return base64String || (await fileToDataUrl(file));
  }
};
