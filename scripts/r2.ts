/**
 * The Cloudflare R2 bucket, for the scripts that put images in it.
 *
 * Split out of `import-crawl.ts` once a second script needed to upload: the
 * importer re-hosts what it crawls, and `reframe-images.ts` uploads a photo it
 * has recomposed. Two copies of the credential reading and the key shape would
 * drift, and a bucket with two key shapes in it is one nobody can clean up.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ROOT, fail } from "./catalog-file";

/**
 * Reads the R2 credentials out of `.env.local` (then `.env`) by hand.
 *
 * Same approach as `scripts/generate-voice.ts`: the env files are git-ignored,
 * and a five-line reader beats a dependency for two files nobody else reads.
 * The `VITE_` prefix is theirs already — the browser uploader in
 * `src/utils/cloudflareUpload.ts` reads the very same variables.
 */
export function readEnv(keys: string[]): Record<string, string> {
  const found: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const key of keys) {
      if (found[key]) continue;
      const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, "m"));
      if (match) found[key] = match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  for (const key of keys) {
    if (!found[key] && process.env[key]) found[key] = process.env[key] as string;
  }
  return found;
}

export interface R2 {
  client: S3Client;
  bucket: string;
  publicDomain: string;
}

const R2_KEYS = [
  "VITE_CLOUDFLARE_ACCOUNT_ID",
  "VITE_R2_ACCESS_KEY_ID",
  "VITE_R2_SECRET_ACCESS_KEY",
  "VITE_R2_BUCKET_NAME",
  "VITE_R2_PUBLIC_DOMAIN",
];

/**
 * @param onMissing what to tell the reader they can do instead. The importer can
 *   fall back to crawled URLs; the re-framer has no fallback at all.
 */
export function connectR2(onMissing = "  Run with --no-images to import with the crawled URLs instead."): R2 {
  const env = readEnv(R2_KEYS);

  const missing = R2_KEYS.filter((key) => !env[key]);

  if (missing.length > 0) {
    // Deliberately fatal. The browser uploader falls back to base64 when R2 is
    // missing, which is right for one image and catastrophic for a few hundred:
    // base64 in localStorage blows the quota and takes the whole catalogue with
    // it. An import must never produce one.
    fail(
      "Cloudflare R2 is not configured, so images cannot be re-hosted.\n" +
        `  Missing in .env.local: ${missing.join(", ")}\n` +
        onMissing
    );
  }

  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.VITE_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.VITE_R2_ACCESS_KEY_ID,
        secretAccessKey: env.VITE_R2_SECRET_ACCESS_KEY,
      },
    }),
    bucket: env.VITE_R2_BUCKET_NAME,
    publicDomain: env.VITE_R2_PUBLIC_DOMAIN.replace(/\/$/, ""),
  };
}

export const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/**
 * Puts bytes in the bucket and returns the public URL.
 *
 * The key shape is the one the browser uploader uses, so the bucket stays
 * uniform however a file arrived in it.
 */
export async function uploadBytes(bytes: Uint8Array, contentType: string, r2: R2): Promise<string> {
  const extension = EXTENSION_BY_TYPE[contentType] ?? "jpeg";
  const key = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

  await r2.client.send(
    new PutObjectCommand({ Bucket: r2.bucket, Key: key, Body: bytes, ContentType: contentType })
  );

  return `${r2.publicDomain}/${key}`;
}
