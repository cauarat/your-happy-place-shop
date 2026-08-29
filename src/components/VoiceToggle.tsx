import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Turns the spoken assistant on and off.
 *
 * It sits in the top bar rather than behind the menu on purpose: the moment
 * someone wants to silence a voice is the moment it is talking, and a mute
 * that takes two taps and a panel is not a mute. Pressing it also happens to
 * be the user gesture the browser needs before it will play audio at all, so
 * for anyone who reaches for it to turn the voice *on*, it works first time.
 */
export const VoiceToggle = ({ className = "" }: { className?: string }) => {
  const { enabled, setEnabled, speaking } = useVoiceAssistant();
  const { t } = useLanguage();

  const label = enabled ? t("voice_mute") : t("voice_unmute");

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      className={`relative flex items-center justify-center p-0.5 hover:opacity-70 transition-opacity ${className}`}
    >
      {/* While a line is playing, a ring breathes out from the icon. The only
          other sign the assistant is speaking is the sound itself, which is no
          use to someone with the volume down or the tab muted. */}
      <AnimatePresence>
        {speaking && (
          <motion.span
            key="pulse"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0.35, 0, 0.35], scale: [0.8, 1.6, 0.8] }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-current pointer-events-none"
          />
        )}
      </AnimatePresence>

      {enabled ? (
        <Volume2 size={20} strokeWidth={1.5} className="relative sm:w-[22px] sm:h-[22px]" />
      ) : (
        <VolumeX
          size={20}
          strokeWidth={1.5}
          className="relative sm:w-[22px] sm:h-[22px] opacity-40"
        />
      )}
    </button>
  );
};

export default VoiceToggle;
