import type { Language } from "@/contexts/LanguageContext";
import type { CueSegment } from "@/lib/voiceLines";

/**
 * The voice already built into the browser.
 *
 * It is the least impressive of the three engines and the most important one.
 * It weighs nothing, needs no download and no permission, and is ready on the
 * very first line — which is what stops the site being mute in the minutes a
 * neural model spends arriving, and on any device where that model never
 * arrives at all.
 *
 * The voice differs by platform, so the assistant does not sound like one
 * person here the way it does on the recordings. That is the trade for never
 * being silent, and it only applies to lines the recordings do not cover.
 */

const LOCALES: Record<Language, string[]> = {
  PT: ["pt-BR", "pt_BR", "pt-PT", "pt"],
  ES: ["es-ES", "es-MX", "es-419", "es"],
  EN: ["en-US", "en-GB", "en"],
};

export const isSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * The voice list is populated asynchronously in Chrome — asking for it on the
 * first line returns an empty array, and the utterance comes out in whatever
 * the browser's default language is rather than the site's. This waits for the
 * list, once, with a ceiling so a browser that never fires the event does not
 * hold the first line forever.
 */
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) return resolve(existing);

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    window.setTimeout(done, 1500);
  });
  return voicesPromise;
};

/**
 * Picks the closest voice to the language on screen, preferring one that runs
 * on the device. A remote voice needs the network and can simply not arrive,
 * which for a fallback engine defeats the point of it.
 */
async function voiceFor(lang: Language): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  if (voices.length === 0) return null;

  for (const tag of LOCALES[lang] ?? LOCALES.EN) {
    const matches = voices.filter((v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith(tag.toLowerCase().replace("_", "-"))
    );
    if (matches.length > 0) return matches.find((v) => v.localService) ?? matches[0];
  }
  return null;
}

export function cancel(): void {
  if (isSupported()) window.speechSynthesis.cancel();
}

/**
 * Reads a cue's segments aloud, honouring the pauses between them.
 *
 * The pause is a real wait between two utterances rather than markup inside
 * one, which is the only way it can work here — `speechSynthesis` has no
 * concept of a break tag, and would read one out as words.
 *
 * `onStart` fires once, when sound actually begins, so the caller can duck the
 * music and light up the indicator at the same moment for every engine.
 * `shouldContinue` is checked between segments: a long script has to be
 * abandonable the instant the visitor moves on or hits mute.
 */
export async function speakSegments(
  segments: CueSegment[],
  lang: Language,
  {
    volume = 1,
    onStart,
    shouldContinue = () => true,
  }: {
    volume?: number;
    onStart?: () => void;
    shouldContinue?: () => boolean;
  } = {}
): Promise<boolean> {
  if (!isSupported()) return false;

  const voice = await voiceFor(lang);
  if (!shouldContinue()) return false;

  let started = false;
  let spokeAnything = false;

  for (const segment of segments) {
    if (!shouldContinue()) return spokeAnything;

    if (segment.text) {
      const ok = await new Promise<boolean>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(segment.text);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? (LOCALES[lang] ?? LOCALES.EN)[0];
        utterance.volume = volume;
        // A shade under natural pace. The default reads announcements faster
        // than someone would say them out loud.
        utterance.rate = 0.95;

        utterance.onstart = () => {
          if (!started) {
            started = true;
            onStart?.();
          }
        };
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        // Chrome refuses to start if a previous run left the queue paused.
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      });

      if (!ok) return spokeAnything;
      spokeAnything = true;
    }

    if (segment.pauseAfter > 0 && shouldContinue()) {
      await new Promise((r) => window.setTimeout(r, segment.pauseAfter * 1000));
    }
  }

  return spokeAnything;
}
