import { useEffect } from "react";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import type { VOICE_CUES } from "@/lib/voiceLines";

/**
 * Reads a tour's pop-up out loud as the visitor moves through it.
 *
 * The four tours are near-identical copies of one another, so this is the one
 * place the narration lives: each of them passes its own list of cue ids and
 * gets the behaviour without a fifth copy of it.
 *
 * The line is re-spoken when the language changes, because at that point the
 * pop-up on screen is saying something the voice already said in another
 * language.
 */
export function useTourNarration(
  cueIds: readonly (keyof typeof VOICE_CUES)[],
  currentStep: number,
  isVisible: boolean
) {
  const { speakCue, stop } = useVoiceAssistant();

  useEffect(() => {
    if (!isVisible) return;
    const cueId = cueIds[currentStep];
    if (!cueId) return;
    speakCue(cueId);
  }, [cueIds, currentStep, isVisible, speakCue]);

  // Closing the tour — finishing it, skipping it, or navigating away — stops
  // the voice. Being talked at by a pop-up that is no longer on screen is the
  // one thing that would make this feel broken.
  useEffect(() => stop, [stop]);
}
