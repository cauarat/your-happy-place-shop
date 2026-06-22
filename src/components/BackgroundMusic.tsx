import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDesignSettings } from "@/lib/store";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface BackgroundMusicHandle {
  start: () => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
}

export type { BackgroundMusicHandle as MusicHandle };

// Shared vinyl button rendering that can be used inline or floating
export const VinylButton = ({ isPlaying, isVisible, onToggle }: { isPlaying: boolean; isVisible: boolean; onToggle: () => void }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={onToggle}
        className="p-0.5 rounded-full border border-border bg-white shadow-md transition-all active:scale-95 shrink-0"
        title={isPlaying ? "Pause music" : "Play music"}
      >
        <div className="relative w-8 h-8 flex items-center justify-center">
          <motion.div
            className="relative w-full h-full rounded-full bg-[#050505] shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden"
            animate={!isPlaying ? { rotate: 0 } : { rotate: 360 }}
            transition={!isPlaying ? { duration: 0.8, ease: "easeOut" } : { rotate: { duration: 4, repeat: Infinity, ease: "linear" } }}
          >
            <div 
              className="absolute inset-0 opacity-[0.12]" 
              style={{ background: "repeating-radial-gradient(circle, transparent 0, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)" }}
            />
            {isPlaying && (
              <motion.div 
                className="absolute inset-0 opacity-40 mix-blend-screen"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                style={{ background: "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.1) 10%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,0.1) 20%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.1) 80%, transparent 100%)" }}
              />
            )}
            <div className="w-1/3 h-1/3 rounded-full bg-white border border-white/5 relative z-10 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#111]" />
            </div>
          </motion.div>
          <motion.div 
            className="absolute -top-0.5 -right-0.5 w-full h-full pointer-events-none z-20"
            animate={!isPlaying ? { rotate: 15, x: 1 } : { rotate: 0, x: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 40 60" fill="none" className="w-full h-full">
              <path d="M32 5v10c0 5-5 8-10 10L12 40" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
              <rect x="8" y="42" width="6" height="8" rx="1" transform="rotate(25 11 46)" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" />
            </svg>
          </motion.div>
          {!isPlaying && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-[1.5px] bg-white/50 rotate-45 rounded-full" />
            </div>
          )}
        </div>
      </motion.button>
    )}
  </AnimatePresence>
);

const BackgroundMusic = forwardRef<BackgroundMusicHandle>((_, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const playerRef = useRef<any>(null);

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const settings = getDesignSettings();
    if (!settings.musicUrl) return;
    
    const videoId = extractYoutubeId(settings.musicUrl);
    if (!videoId) return;

    setIsVisible(true);

    const initPlayer = () => {
      playerRef.current = new window.YT.Player("youtube-audio-global", {
        height: "0",
        width: "0",
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(50);
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted && playerRef.current && playerRef.current.playVideo) {
        playerRef.current.playVideo();
        setIsPlaying(true);
        setHasInteracted(true);
      }
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("scroll", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [hasInteracted]);

  useImperativeHandle(ref, () => ({
    start: () => {
      if (playerRef.current && playerRef.current.playVideo) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    },
    setVolume: (volume: number) => {
      if (playerRef.current && playerRef.current.setVolume) {
        playerRef.current.setVolume(volume);
      }
    },
    getVolume: () => {
      return playerRef.current ? playerRef.current.getVolume() : 0;
    }
  }));

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
        setHasInteracted(true);
      }
    }
  };

  return (
    <div id="youtube-audio-global" className="hidden"></div>
  );
});

export default BackgroundMusic;
