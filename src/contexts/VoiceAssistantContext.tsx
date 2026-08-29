import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLanguage, translations, type Language } from "@/contexts/LanguageContext";
import { useMusicPlayer } from "@/contexts/MusicContext";
import { getDesignSettings } from "@/lib/store";
import {
  PERSONALISED_CUES,
  VOICE_CUES,
  cueSegments,
  pregeneratedUrl,
  sanitizeForSpeech,
  type CueSegment,
} from "@/lib/voiceLines";
import * as piper from "@/lib/voiceEngines/piper";
import * as webSpeech from "@/lib/voiceEngines/webSpeech";

/**
 * A single thing for the assistant to say.
 *
 * `cueId` decides how it gets said. A cue with an id that isn't personalised
 * has an MP3 sitting in `public/audio/assistant/` — it plays from disk,
 * instantly, with its pauses already inside the audio. Everything else is
 * spoken on the spot by an engine that has no notion of markup, which is why
 * `segments` travels alongside the flat text: the pauses have to be performed
 * rather than described.
 */
export type SpeechCue = { lang?: Language; segments?: CueSegment[] } & (
  | { cueId: keyof typeof VOICE_CUES; text?: string }
  | { cueId?: undefined; text: string }
);

/** Which engine said the current line. Reported by the console helper. */
export type VoiceEngine = "recording" | "piper" | "browser" | null;

interface VoiceAssistantContextType {
  /** Whether the visitor wants to hear the assistant at all. */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  /** True while a line is actually coming out of the speakers. */
  speaking: boolean;
  /** True once the browser has actually let a line play. */
  unlocked: boolean;
  /** Say something. A new line cuts off whatever was being said. */
  speak: (cue: SpeechCue) => void;
  /** Say the title and description of one of the fixed cues. */
  speakCue: (
    cueId: keyof typeof VOICE_CUES,
    vars?: Record<string, string>,
    lang?: Language
  ) => void;
  stop: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType>({
  enabled: false,
  setEnabled: () => {},
  speaking: false,
  unlocked: false,
  speak: () => {},
  speakCue: () => {},
  stop: () => {},
});

export const useVoiceAssistant = () => useContext(VoiceAssistantContext);

const ENABLED_KEY = "villaoro_voice_enabled";

/**
 * Reads the visitor's own preference. Defaults to on: the assistant is part of
 * the experience, not an accessory, and the mute button is one tap away for
 * anyone who disagrees.
 */
const readEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(ENABLED_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
};

// ─── Which lines are on disk ───────────────────────────────────────────────
//
// The manifest `npm run voice:build` writes, keyed `{lang}/{cueId}`.
//
// It is fetched once, at start-up rather than on demand, and kept in a plain
// variable that can be read without awaiting. That synchronous read is what
// lets `speak` call `play()` in the same tick as the click that caused it —
// see the note on the autoplay policy in `speak` below, which is the whole
// reason this is not a lazy promise.
let manifestData: Record<string, unknown> | null = null;
let manifestPromise: Promise<void> | null = null;

const loadManifest = (): Promise<void> => {
  if (!manifestPromise) {
    manifestPromise = fetch("/audio/assistant/manifest.json")
      .then((r) => {
        // A missing file here does not arrive as a 404. This is a single-page
        // app: the dev server and every static host answer an unknown path
        // with index.html and a 200, so the status says nothing. What settles
        // it is whether the body parses as JSON — HTML does not, and lands in
        // the catch below as an empty manifest, which is the right answer.
        if (!r.ok) return {};
        return r.json();
      })
      .then((data: unknown) => {
        manifestData =
          data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      })
      .catch(() => {
        manifestData = {};
      });
  }
  return manifestPromise;
};

/**
 * The on-disk URL for a cue, or null if there isn't one — answered without
 * awaiting anything.
 *
 * Returns null until the manifest has arrived, which makes the first line of a
 * session take the slower path. That is the correct trade: guessing that a
 * file exists and being wrong points the player at an HTML page, and a browser
 * reports that as an event on the element long after the code that chose the
 * URL has finished, leaving the line silently dead.
 */
const pregeneratedSrcFor = (cueId: string | undefined, lang: string): string | null => {
  if (!cueId || PERSONALISED_CUES.has(cueId) || !manifestData) return null;
  return `${lang}/${cueId}` in manifestData ? pregeneratedUrl(cueId, lang) : null;
};

export const VoiceAssistantProvider = ({ children }: { children: React.ReactNode }) => {
  const { language, t } = useLanguage();
  const { duck, unduck } = useMusicPlayer();

  const [enabled, setEnabledState] = useState(readEnabled);
  const [speaking, setSpeaking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // One audio element for the life of the app. This is not a tidiness
  // preference: a browser grants playback to the *element* the visitor's
  // gesture reached, so a fresh `new Audio()` per line would be blocked every
  // time on iOS no matter how many times they had tapped.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const enabledRef = useRef(enabled);
  // A line the browser refused to start. Held so the next tap does not just
  // unlock silence — it releases the sentence that should have been heard.
  const pendingRef = useRef<SpeechCue | null>(null);
  // Guards against a slow generation landing after the visitor has moved on
  // and something else is being said.
  const requestSeqRef = useRef(0);
  // Kept for the console helper at the bottom of this file.
  const lastErrorRef = useRef<string | null>(null);
  const engineRef = useRef<VoiceEngine>(null);
  const piperStateRef = useRef<"idle" | "downloading" | "ready" | "unavailable">("idle");

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    void loadManifest();
  }, []);

  /**
   * Fetches the neural voice for the current language, in the background.
   *
   * Held back until a visitor has interacted and the assistant is switched on,
   * and then run at idle. The model is around 60MB — an order of magnitude
   * more than everything else this site loads — and starting it during the
   * first paint would take bandwidth from the catalogue images someone is
   * actually looking at, to improve a voice they may never turn on.
   *
   * Once fetched it lives in OPFS and no visit pays for it again.
   */
  const primePiper = useCallback((lang: Language) => {
    if (piperStateRef.current !== "idle") return;
    if (!piper.isSupported()) {
      piperStateRef.current = "unavailable";
      return;
    }
    piperStateRef.current = "downloading";

    const run = () => {
      void piper.ensureReady(lang).then((ok) => {
        piperStateRef.current = ok ? "ready" : "unavailable";
      });
    };
    const idle = (window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (idle) idle(run, { timeout: 8000 });
    else window.setTimeout(run, 4000);
  }, []);

  // The music comes back on a short delay rather than the instant a clip ends.
  // Stepping through a tour pauses one line and starts the next within a frame
  // or two, and lifting the volume in between would make the music surge under
  // every press of "next" — the ramp would be halfway up before the following
  // line pushed it back down.
  const unduckTimerRef = useRef<number | null>(null);

  const duckNow = useCallback(() => {
    if (unduckTimerRef.current) {
      clearTimeout(unduckTimerRef.current);
      unduckTimerRef.current = null;
    }
    duck();
  }, [duck]);

  const unduckSoon = useCallback(() => {
    if (unduckTimerRef.current) clearTimeout(unduckTimerRef.current);
    unduckTimerRef.current = window.setTimeout(() => {
      unduckTimerRef.current = null;
      unduck();
    }, 450);
  }, [unduck]);

  useEffect(
    () => () => {
      if (unduckTimerRef.current) clearTimeout(unduckTimerRef.current);
    },
    []
  );

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "auto";
      // Without this iOS opens the native full-screen player for the clip.
      el.setAttribute("playsinline", "true");
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const stop = useCallback(() => {
    requestSeqRef.current += 1;
    pendingRef.current = null;
    webSpeech.cancel();
    const el = audioRef.current;
    if (el) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        // Throws if the element has no source loaded yet. Nothing to rewind.
      }
    }
    setSpeaking(false);
    unduckSoon();
  }, [unduckSoon]);

  /**
   * Points the element at a URL and starts it. Resolves true if the browser
   * actually let it play.
   *
   * Deliberately not async before the `play()` call: everything up to it has
   * to run in the caller's tick, or a play started from a click stops counting
   * as user-initiated.
   */
  const playSrc = useCallback(
    (src: string, seq: number): Promise<boolean> => {
      if (seq !== requestSeqRef.current) return Promise.resolve(false);

      const el = getAudio();
      el.volume = getDesignSettings().assistantVolume ?? 1;
      el.src = src;

      const started = el.play();
      // Older browsers return undefined instead of a promise.
      if (!started) return Promise.resolve(true);

      return started.then(
        () => {
          lastErrorRef.current = null;
          unlockedRef.current = true;
          setUnlocked(true);
          return true;
        },
        (error: DOMException) => {
          lastErrorRef.current = error?.name || String(error);
          return false;
        }
      );
    },
    [getAudio]
  );

  /** Plays a URL and resolves when the clip has finished, not when it starts. */
  const playToEnd = useCallback(
    async (src: string, seq: number): Promise<boolean> => {
      const started = await playSrc(src, seq);
      if (!started) return false;

      const el = getAudio();
      await new Promise<void>((resolve) => {
        const done = () => {
          el.removeEventListener("ended", done);
          el.removeEventListener("error", done);
          el.removeEventListener("pause", done);
          resolve();
        };
        el.addEventListener("ended", done);
        el.addEventListener("error", done);
        el.addEventListener("pause", done);
      });
      return true;
    },
    [playSrc, getAudio]
  );

  /**
   * Speaks a cue with Piper, one segment at a time.
   *
   * Segment by segment rather than all at once because that is the only way
   * the script's pauses survive: the model produces a clip for a stretch of
   * words, and the silence between stretches is this loop waiting. Each clip
   * is revoked once played — they are blobs, and a script left running for a
   * session would otherwise hold every one of them in memory.
   */
  const speakWithPiper = useCallback(
    async (segments: CueSegment[], lang: Language, seq: number): Promise<boolean> => {
      let spoke = false;
      for (const segment of segments) {
        if (seq !== requestSeqRef.current) return spoke;

        if (segment.text) {
          const src = await piper.synthesize(segment.text, lang);
          if (!src) return spoke;
          if (seq !== requestSeqRef.current) {
            URL.revokeObjectURL(src);
            return spoke;
          }
          const ok = await playToEnd(src, seq);
          URL.revokeObjectURL(src);
          if (!ok) return spoke;
          spoke = true;
        }

        if (segment.pauseAfter > 0 && seq === requestSeqRef.current) {
          await new Promise((r) => window.setTimeout(r, segment.pauseAfter * 1000));
        }
      }
      return spoke;
    },
    [playToEnd]
  );

  /**
   * Starts a cue on the best engine available to it right now.
   *
   * The order is the point:
   *
   *   1. A recording, if this line has one. Instant, best sounding, and — the
   *      part that matters most — playable in the same tick as the click that
   *      asked for it, which is the only reliable way past a browser's
   *      autoplay policy.
   *   2. Piper, once its model is on disk. Neural, free, unlimited, and the
   *      only one of the three that can say a sentence nobody recorded.
   *   3. The browser's own voice. Plainer, and different on every device, but
   *      available immediately and everywhere — it is what keeps the site from
   *      being mute while the model downloads, or on a device it never will.
   *
   * Whichever engine is not used still leaves the download running: a visitor
   * who hears the browser voice today should hear Piper on their next line.
   */
  const start = useCallback(
    (cue: SpeechCue, text: string, seq: number) => {
      // A cue can name its own language: the picker speaks Spanish while the
      // site is still in Portuguese, which is the whole point of a preview.
      const lang = cue.lang ?? language;

      const direct = pregeneratedSrcFor(cue.cueId, lang);
      if (direct) {
        engineRef.current = "recording";
        void playSrc(direct, seq).then((ok) => {
          if (!ok) pendingRef.current = cue;
        });
        return;
      }

      const segments: CueSegment[] =
        cue.segments && cue.segments.length > 0
          ? cue.segments
          : [{ text: sanitizeForSpeech(text), pauseAfter: 0 }];

      void (async () => {
        // The manifest may simply not have landed yet on the very first line.
        // Waiting for it is worth a moment: a recording beats anything below.
        if (!manifestData) {
          await loadManifest();
          const late = pregeneratedSrcFor(cue.cueId, lang);
          if (late) {
            engineRef.current = "recording";
            const ok = await playSrc(late, seq);
            if (!ok) pendingRef.current = cue;
            return;
          }
        }
        if (seq !== requestSeqRef.current) return;

        if (await piper.isReady(lang)) {
          engineRef.current = "piper";
          if (await speakWithPiper(segments, lang, seq)) return;
        }

        if (seq !== requestSeqRef.current) return;
        engineRef.current = "browser";
        const spoke = await webSpeech.speakSegments(segments, lang, {
          volume: getDesignSettings().assistantVolume ?? 1,
          onStart: () => {
            unlockedRef.current = true;
            setUnlocked(true);
            setSpeaking(true);
            duckNow();
          },
          shouldContinue: () => seq === requestSeqRef.current && enabledRef.current,
        });
        setSpeaking(false);
        unduckSoon();

        // Nothing could say it. Hold it for the next gesture — the usual cause
        // is a browser that has not been given one yet.
        if (!spoke) pendingRef.current = cue;
      })();
    },
    [language, playSrc, speakWithPiper, duckNow, unduckSoon]
  );

  const speak = useCallback(
    (cue: SpeechCue) => {
      if (!enabledRef.current) return;

      // Not truncated here. The character limit is a cost control for the
      // Edge Function, and a line that plays off disk costs nothing however
      // long it is — the about section is a five-part script with pauses, far
      // past the limit and correctly so. The cap is applied where the money
      // is actually spent, in resolveGenerated.
      const text = (cue.text ?? "").trim();
      if (!text) return;

      // Cut whatever is being said. Pressing "next" through a tour should feel
      // like interrupting someone, not like queueing behind them. Both engines
      // have to be cut: whichever one is mid-sentence is the one to silence.
      requestSeqRef.current += 1;
      const seq = requestSeqRef.current;
      const el = audioRef.current;
      if (el) el.pause();
      webSpeech.cancel();

      const resolved: SpeechCue = cue.cueId
        ? { cueId: cue.cueId, text, lang: cue.lang, segments: cue.segments }
        : { text, lang: cue.lang, segments: cue.segments };
      start(resolved, text, seq);
    },
    [start]
  );

  const speakCue = useCallback(
    (cueId: keyof typeof VOICE_CUES, vars?: Record<string, string>, lang?: Language) => {
      // `t` only ever answers in the language the site is currently set to.
      // When a line is asked for in another one — the picker previewing an
      // option before it is chosen — the table is read directly instead.
      const dict = lang ? translations[lang] : null;
      const lookup = (key: string) => (dict ? dict[key] ?? key : t(key));

      // The segments carry the pauses for the live engines; the flat text is
      // what a recording is matched and logged by. Both come from one call, so
      // they can't describe different lines.
      const segments = cueSegments(VOICE_CUES[cueId], lookup, vars);
      const text = segments.map((s) => s.text).filter(Boolean).join(" ");

      speak({ cueId, text, segments, lang });
    },
    [speak, t]
  );

  // ── Playback state, mirrored from the element ────────────────────────────
  //
  // `speaking` and the music ducking are driven by what the element is
  // actually doing rather than set alongside the calls that ask it to play.
  // A line can fail to start, or be cut off by the next one before it does,
  // and a flag set by hand at the call site would be wrong in both cases —
  // leaving the music quietly ducked under a voice that never arrived.
  useEffect(() => {
    const el = getAudio();
    const onStart = () => {
      setSpeaking(true);
      duckNow();
    };
    const onStop = () => {
      setSpeaking(false);
      unduckSoon();
    };
    el.addEventListener("playing", onStart);
    el.addEventListener("ended", onStop);
    el.addEventListener("error", onStop);
    el.addEventListener("pause", onStop);
    return () => {
      el.removeEventListener("playing", onStart);
      el.removeEventListener("ended", onStop);
      el.removeEventListener("error", onStop);
      el.removeEventListener("pause", onStop);
    };
  }, [getAudio, duckNow, unduckSoon]);

  // ── Retrying whatever the browser refused ────────────────────────────────
  //
  // Nothing is played to "unlock" the element — no silent frame, no priming.
  // The line the visitor was meant to hear is simply started again, from
  // inside the gesture handler, where the browser will allow it.
  //
  // These listeners stay for the life of the app rather than being removed
  // after the first success: a tab can go back to refusing (a new document, a
  // muted tab, a policy change), and a one-shot unlock has no answer to that.
  //
  // `scroll` is deliberately absent. It counts as a gesture on desktop but not
  // on iOS, and a rule that works on one platform and silently fails on the
  // other is worse than one that waits for a tap on both.
  useEffect(() => {
    const onGesture = () => {
      // The first interaction is also the earliest point at which fetching a
      // 60MB model is defensible: someone is here, and using the site.
      if (enabledRef.current) primePiper(language);

      const pending = pendingRef.current;
      if (!pending || !enabledRef.current) return;
      pendingRef.current = null;
      requestSeqRef.current += 1;
      start(pending, pending.text ?? "", requestSeqRef.current);
    };

    const events = ["pointerdown", "touchend", "keydown", "click"] as const;
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onGesture));
  }, [start, primePiper, language]);

  const setEnabled = useCallback(
    (on: boolean) => {
      setEnabledState(on);
      enabledRef.current = on;
      try {
        localStorage.setItem(ENABLED_KEY, String(on));
      } catch {
        // Private browsing, or storage full. The choice still holds for this
        // session; it just won't be remembered for the next one.
      }
      if (!on) stop();
    },
    [stop]
  );

  // The admin can switch the assistant off for everyone. Checked here rather
  // than at each call site so there is one answer to "is it on".
  const [adminEnabled, setAdminEnabled] = useState(
    () => getDesignSettings().assistantEnabled !== false
  );
  useEffect(() => {
    const sync = () => setAdminEnabled(getDesignSettings().assistantEnabled !== false);
    window.addEventListener("design-settings-updated", sync);
    return () => window.removeEventListener("design-settings-updated", sync);
  }, []);

  const effectiveEnabled = enabled && adminEnabled;
  useEffect(() => {
    enabledRef.current = effectiveEnabled;
    if (!effectiveEnabled) stop();
  }, [effectiveEnabled, stop]);

  // ── A way to ask the page what is wrong ──────────────────────────────────
  //
  // Everything that decides whether a line is heard is a ref or a module
  // variable, none of which a person can see from the console. When the
  // assistant is silent the question is always the same — is it switched off,
  // did the audio never arrive, or did the browser refuse to start it — and
  // this answers it in one line: `__voice()`.
  useEffect(() => {
    (window as unknown as { __voice: () => unknown }).__voice = () => ({
      enabled: enabledRef.current,
      adminEnabled,
      unlocked: unlockedRef.current,
      speaking,
      language,
      // Which of the three tiers said the last line, and why the other two
      // did not — the first question whenever the voice sounds wrong rather
      // than absent.
      engine: engineRef.current,
      piper: {
        state: piperStateRef.current,
        supported: piper.isSupported(),
        voice: piper.voiceFor(language),
      },
      browserVoice: webSpeech.isSupported(),
      manifestLoaded: manifestData !== null,
      manifestEntries: manifestData ? Object.keys(manifestData).length : 0,
      pending: pendingRef.current?.text?.slice(0, 60) ?? null,
      lastError: lastErrorRef.current,
      audioSrc: audioRef.current?.src ?? null,
      audioError: audioRef.current?.error?.code ?? null,
    });
  }, [adminEnabled, speaking, language]);

  const value = useMemo(
    () => ({
      enabled: effectiveEnabled,
      setEnabled,
      speaking,
      unlocked,
      speak,
      speakCue,
      stop,
    }),
    [effectiveEnabled, setEnabled, speaking, unlocked, speak, speakCue, stop]
  );

  return (
    <VoiceAssistantContext.Provider value={value}>{children}</VoiceAssistantContext.Provider>
  );
};
