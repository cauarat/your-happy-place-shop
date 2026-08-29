import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { VoiceAssistantProvider, useVoiceAssistant } from "@/contexts/VoiceAssistantContext";

/**
 * These cover the one thing that decides whether anyone ever hears the
 * assistant: does a cue actually reach `play()` on the audio element.
 *
 * It is worth testing at this level rather than trusting the code to read
 * correctly, because every way this has failed so far has been invisible from
 * the outside — a line resolved, a URL chosen, a promise rejected somewhere,
 * and the page simply stayed quiet with nothing in the console.
 */

type PlayCall = { src: string };

let playCalls: PlayCall[];
let playBehaviour: "allow" | "refuse";
let currentAudio: FakeAudio | null;

class FakeAudio {
  src = "";
  volume = 1;
  preload = "";
  error = null;
  listeners: Record<string, (() => void)[]> = {};

  constructor() {
    currentAudio = this;
  }
  setAttribute() {}
  addEventListener(type: string, fn: () => void) {
    (this.listeners[type] ||= []).push(fn);
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
  }
  emit(type: string) {
    (this.listeners[type] || []).forEach((f) => f());
  }
  pause() {}
  play() {
    playCalls.push({ src: this.src });
    if (playBehaviour === "refuse") {
      const err = new Error("blocked");
      err.name = "NotAllowedError";
      return Promise.reject(err);
    }
    return Promise.resolve();
  }
}

const MANIFEST = {
  "PT/tour_1": {}, "EN/tour_1": {}, "ES/tour_1": {},
  "PT/greeting_morning": {}, "EN/greeting_morning": {}, "ES/greeting_morning": {},
};

const Harness = ({ onReady }: { onReady: (api: ReturnType<typeof useVoiceAssistant>) => void }) => {
  const api = useVoiceAssistant();
  React.useEffect(() => onReady(api), [api, onReady]);
  return null;
};

let root: Root | null = null;

const renderVoice = () => {
  let api: ReturnType<typeof useVoiceAssistant> | null = null;
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(
      <LanguageProvider>
        <MusicProvider>
          <VoiceAssistantProvider>
            <Harness onReady={(a) => { api = a; }} />
          </VoiceAssistantProvider>
        </MusicProvider>
      </LanguageProvider>
    );
  });
  return () => api!;
};

/** Lets every pending promise and effect settle. */
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** What the browser's own voice was asked to say. */
let spokenUtterances: string[];

/** Stands in for `speechSynthesis`, which jsdom does not implement. */
const installFakeSpeechSynthesis = () => {
  spokenUtterances = [];
  class FakeUtterance {
    text: string;
    voice: unknown = null;
    lang = "";
    volume = 1;
    rate = 1;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [{ lang: "en-US", name: "Fake", localService: true }],
    speak(u: FakeUtterance) {
      spokenUtterances.push(u.text);
      u.onstart?.();
      u.onend?.();
    },
    cancel() {},
    resume() {},
    addEventListener() {},
    removeEventListener() {},
  });
};

beforeEach(() => {
  playCalls = [];
  playBehaviour = "allow";
  currentAudio = null;
  localStorage.clear();
  installFakeSpeechSynthesis();
  // MusicProvider injects the YouTube API next to the first <script> on the
  // page, and jsdom starts without one.
  if (!document.querySelector("script")) {
    document.head.appendChild(document.createElement("script"));
  }
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("manifest.json")) {
        return { ok: true, json: async () => MANIFEST } as unknown as Response;
      }
      throw new Error(`unexpected fetch: ${url}`);
    })
  );
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  vi.unstubAllGlobals();
});

describe("the assistant actually plays", () => {
  it("plays a pre-recorded cue off disk once the manifest has landed", async () => {
    const get = renderVoice();
    await settle();
    expect(fetch).toHaveBeenCalled();

    act(() => get().speakCue("tour_1"));
    await settle();

    expect(playCalls).toHaveLength(1);
    expect(playCalls[0].src).toBe("/audio/assistant/EN/tour_1.mp3");
  });

  it("holds the line when the browser refuses, and releases it on the next tap", async () => {
    playBehaviour = "refuse";
    const get = renderVoice();
    await settle();

    act(() => get().speakCue("tour_1"));
    await settle();
    expect(playCalls).toHaveLength(1); // tried, was refused

    // The visitor taps somewhere. The held line must be tried again — this is
    // the whole autoplay recovery path.
    playBehaviour = "allow";
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    await settle();

    expect(playCalls.length).toBeGreaterThanOrEqual(2);
    expect(playCalls[playCalls.length - 1].src).toBe("/audio/assistant/EN/tour_1.mp3");
  });

  it("speaks a line in the language it was asked for, not the one on screen", async () => {
    // The onboarding picker demonstrates each option by speaking in it, while
    // the site itself is still set to something else. If this ever falls back
    // to the current language, tapping the three flags plays the same clip
    // three times and the picker stops meaning anything.
    const get = renderVoice();
    await settle();

    act(() => get().speakCue("greeting_morning", undefined, "ES"));
    await settle();

    expect(playCalls).toHaveLength(1);
    expect(playCalls[0].src).toBe("/audio/assistant/ES/greeting_morning.mp3");
  });

  it("falls back to the browser's voice when a line has no recording", async () => {
    // The guarantee this whole tiered design exists for. `login` is not in the
    // manifest and Piper needs OPFS, which jsdom has none of — so if the
    // browser's own voice does not pick this up, the site is mute, which is
    // exactly the state it spent this project stuck in.
    const get = renderVoice();
    await settle();

    act(() => get().speakCue("login"));
    await settle();
    await settle();

    expect(playCalls).toHaveLength(0); // no recording to play
    expect(spokenUtterances.join(" ")).toContain("Welcome back");
  });

  it("performs a cue's pauses as real waits, never as spoken markup", async () => {
    // The about section is a scripted piece with pauses written into it. Two
    // things have to be true: no break tag ever reaches the voice as words,
    // and the pause is genuinely time passing — which shows up here as the
    // second segment *not* having been spoken yet, because the test never
    // advanced the clock past the first pause.
    const get = renderVoice();
    await settle();

    act(() => get().speakCue("about", { count: "672" }));
    await settle();
    await settle();

    expect(spokenUtterances).toHaveLength(1);
    expect(spokenUtterances[0]).not.toContain("break");
    expect(spokenUtterances[0]).toBe("We choose the pieces.");
  });

  it("says nothing at all when muted", async () => {
    const get = renderVoice();
    await settle();

    act(() => get().setEnabled(false));
    act(() => get().speakCue("tour_1"));
    await settle();

    expect(playCalls).toHaveLength(0);
  });

  it("reports speaking once the element says it is playing", async () => {
    const get = renderVoice();
    await settle();

    act(() => get().speakCue("tour_1"));
    await settle();

    act(() => currentAudio!.emit("playing"));
    await settle();
    expect(get().speaking).toBe(true);

    act(() => currentAudio!.emit("ended"));
    await settle();
    expect(get().speaking).toBe(false);
  });
});
