/**
 * Hands an authenticated admin a short-lived URL to upload one image to R2.
 *
 * The bucket's write credentials used to sit in the browser bundle, because the
 * client read them through `import.meta.env.VITE_*` and that prefix is exactly
 * what publishes a value to the browser. Anyone who loaded the shop could pull
 * them out of the JavaScript and overwrite or delete every product photo.
 *
 * Now the secret only ever exists here. The browser asks this function for
 * permission, gets back a URL that works for five minutes and for one object
 * key that this function chose, and uploads straight to R2 — so the file never
 * makes the round trip through here, which matters when the image studio is
 * pushing hundreds of them.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Only formats that a browser will render as an image.
 *
 * The client does not get to name the file. Left to choose, it could ask for
 * `.html` or `.js` and get a script hosted on the bucket's public domain, and
 * anything served from there is trusted by whoever opens it.
 */
const ALLOWED: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
};

const URL_TTL_SECONDS = 300;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Who is asking? The token comes from the caller's own session, so this
    //    is Supabase verifying a signature, not us trusting a header.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not signed in." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Not signed in." }, 401);

    // 2. Are they allowed to write to the catalogue? Unset means nobody is:
    //    a misconfigured deploy has to fail shut, never open.
    const allowlist = (Deno.env.get("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (allowlist.length === 0) {
      return json(
        { error: "ADMIN_EMAILS is not set on this function, so no one can upload." },
        503
      );
    }
    if (!user.email || !allowlist.includes(user.email.toLowerCase())) {
      return json({ error: "This account cannot upload to the catalogue." }, 403);
    }

    // 3. What are they uploading? Extension only — the key is ours to choose.
    const { extension } = await req.json().catch(() => ({ extension: "" }));
    const ext = String(extension || "").toLowerCase().replace(/^\./, "");
    const contentType = ALLOWED[ext];
    if (!contentType) {
      return json(
        { error: `Cannot upload a .${ext || "?"} file. Allowed: ${Object.keys(ALLOWED).join(", ")}.` },
        400
      );
    }

    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucket = Deno.env.get("R2_BUCKET_NAME");
    const publicDomain = Deno.env.get("R2_PUBLIC_DOMAIN");
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicDomain) {
      return json({ error: "R2 is not configured on this function." }, 503);
    }

    // The key is generated here so a caller cannot aim at an existing object
    // and overwrite it, or climb out of the bucket with a path.
    const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const endpoint = new URL(
      `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`
    );
    endpoint.searchParams.set("X-Amz-Expires", String(URL_TTL_SECONDS));

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    });
    // Signing the content type as well as the URL pins what may be stored under
    // this key: the upload is refused unless it arrives as the type we allowed.
    const signed = await aws.sign(endpoint.toString(), {
      method: "PUT",
      headers: { "content-type": contentType },
      aws: { signQuery: true, allHeaders: true },
    });

    return json({
      uploadUrl: signed.url,
      contentType,
      key,
      publicUrl: `${publicDomain.replace(/\/$/, "")}/${key}`,
      expiresIn: URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error("r2-upload-url failed:", error);
    return json({ error: "Could not prepare the upload." }, 500);
  }
});
