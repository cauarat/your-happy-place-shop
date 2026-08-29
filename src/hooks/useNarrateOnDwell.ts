import { useEffect, useRef } from "react";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import type { VOICE_CUES } from "@/lib/voiceLines";

/**
 * Reads a section out once the visitor has actually settled on it.
 *
 * The distinction matters, and it is the whole reason this is not just a
 * scroll position check. An earlier version spoke when the page crossed a
 * boundary a third of the way up the screen, which fires while someone is
 * still moving — the line arrives unattached to anything they did, and the
 * site comes across as talking to itself.
 *
 * Here a section has to be more than half on screen *and stay there* for a
 * beat before it says anything. Scrolling past it in either direction cancels
 * it before it starts. Stopping to look at something is a deliberate act, and
 * this only answers deliberate acts.
 */
export function useNarrateOnDwell(
  ref: React.RefObject<HTMLElement | null>,
  cueId: keyof typeof VOICE_CUES,
  {
    dwellMs = 1200,
    visible = 0.55,
    vars,
  }: { dwellMs?: number; visible?: number; vars?: Record<string, string> } = {}
) {
  const { speakCue } = useVoiceAssistant();
  const spokenRef = useRef(false);
  // Read through a ref so a changing value — a catalogue count that arrives
  // after the first render — does not tear down and rebuild the observer.
  const varsRef = useRef(vars);
  varsRef.current = vars;

  useEffect(() => {
    const el = ref.current;
    if (!el || spokenRef.current) return;

    let timer: number | null = null;
    const cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entry.intersectionRatio < visible) {
          cancel();
          return;
        }
        if (timer || spokenRef.current) return;
        timer = window.setTimeout(() => {
          timer = null;
          spokenRef.current = true;
          speakCue(cueId, varsRef.current);
          observer.disconnect();
        }, dwellMs);
      },
      // Several thresholds rather than one: a section taller than the window
      // never reaches a high ratio, and with a single threshold it would
      // simply never be announced.
      { threshold: [0, 0.25, visible, 0.75, 1] }
    );

    observer.observe(el);
    return () => {
      cancel();
      observer.disconnect();
    };
  }, [ref, cueId, speakCue, dwellMs, visible]);
}
