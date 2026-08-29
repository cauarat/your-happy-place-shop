import type { Language } from "@/contexts/LanguageContext";

/**
 * Neural speech generated on the visitor's own machine.
 *
 * Piper (via `@diffusionstudio/vits-web`, MIT) runs a VITS model through ONNX
 * in a worker. Nothing leaves the browser, there is no key, no account and no
 * quota — which is the whole reason it is here. The site had been mute for
 * every line that was not recorded ahead of time, because the hosted service
 * behind those had run out.
 *
 * The cost it does have is size: about 60MB for a language, downloaded once
 * and then kept in OPFS. That is why nothing in this module is imported until
 * it is genuinely needed — see `load` below.
 */

/**
 * The voice used per language.
 *
 * All three are `medium`, which is the grade Piper publishes for every one of
 * the site's languages; Portuguese has no lighter build to fall back on, so
 * choosing `low` elsewhere would only make the voices inconsistent without
 * saving the download that actually matters.
 */
const VOICES: Record<Language, string> = {
  PT: "pt_BR-faber-medium",
  ES: "es_ES-davefx-medium",
  EN: "en_US-amy-medium",
};

export const voiceFor = (lang: Language): string => VOICES[lang] ?? VOICES.EN;

/**
 * Loaded on first use, never at start-up.
 *
 * A static import would pull the library and its own copy of the ONNX runtime
 * into the initial bundle — megabytes of parsing before the catalogue has
 * painted, on a page that may never say a word the recordings do not already
 * cover. The promise is cached so concurrent callers share one load.
 */
let modulePromise: Promise<typeof import("@diffusionstudio/vits-web")> | null = null;

const load = () => {
  if (!modulePromise) modulePromise = import("@diffusionstudio/vits-web");
  return modulePromise;
};

/** Whether this browser can run Piper at all. OPFS is the part that varies. */
export const isSupported = (): boolean =>
  typeof navigator !== "undefined" &&
  typeof navigator.storage?.getDirectory === "function" &&
  typeof WebAssembly !== "undefined";

/** Languages whose model is already on disk, so speaking is immediate. */
export async function readyLanguages(): Promise<Language[]> {
  if (!isSupported()) return [];
  try {
    const { stored } = await load();
    const have = new Set(await stored());
    return (Object.keys(VOICES) as Language[]).filter((l) => have.has(voiceFor(l) as never));
  } catch {
    return [];
  }
}

export async function isReady(lang: Language): Promise<boolean> {
  return (await readyLanguages()).includes(lang);
}

/**
 * Fetches a language's model into OPFS.
 *
 * Only ever called in the background, well after first paint — a 60MB download
 * competing with the catalogue's own images would be a poor trade for a voice.
 * Resolves quietly if the model is already there.
 */
export async function ensureReady(
  lang: Language,
  onProgress?: (fraction: number) => void
): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    const { download, stored } = await load();
    const voice = voiceFor(lang);
    if ((await stored()).includes(voice as never)) return true;

    await download(voice as never, (p: { loaded: number; total: number }) => {
      if (onProgress && p.total > 0) onProgress(p.loaded / p.total);
    });
    return true;
  } catch (error) {
    console.warn("[voice] Piper model could not be fetched", error);
    return false;
  }
}

/**
 * Speaks one stretch of text, handing back a URL the ordinary audio element
 * can play.
 *
 * Returning a blob URL rather than raw samples is deliberate: it means Piper
 * plugs into exactly the same playback the recorded clips use — the same
 * element, the same autoplay unlocking, the same music ducking — instead of
 * needing a second path through all of it.
 *
 * The caller owns the URL and must revoke it once the clip has played.
 */
export async function synthesize(text: string, lang: Language): Promise<string | null> {
  if (!isSupported()) return null;
  try {
    const { predict } = await load();
    const blob = await predict({ text, voiceId: voiceFor(lang) as never });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn("[voice] Piper could not speak this line", error);
    return null;
  }
}

/** Removes every downloaded model. Used by the admin panel. */
export async function clearModels(): Promise<void> {
  if (!isSupported()) return;
  const { flush } = await load();
  await flush();
}
