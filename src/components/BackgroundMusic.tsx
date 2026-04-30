import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface BackgroundMusicHandle {
  start: () => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
}

const BackgroundMusic = forwardRef<BackgroundMusicHandle>((_, ref) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Load YouTube API if not already loaded
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

  const initPlayer = () => {
    playerRef.current = new window.YT.Player("youtube-audio-global", {
      height: "0",
      width: "0",
      videoId: "JM_ogr3hDso",
      playerVars: {
        autoplay: 0,
        controls: 0,
        showinfo: 0,
        modestbranding: 1,
        loop: 1,
        playlist: "JM_ogr3hDso",
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(0);
        },
      },
    });
  };

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

  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  return (
    <>
      <div id="youtube-audio-global" className="hidden"></div>
      
      <AnimatePresence>
        {isPlaying && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            onClick={toggleMute}
            className="fixed bottom-4 md:bottom-8 right-4 md:right-8 z-[200] p-2 rounded-full border border-border bg-white shadow-sm transition-all active:scale-95"
            title={isMuted ? "Unmute" : "Mute"}
          >
            <div className={`relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center transition-opacity duration-500 ${isMuted ? "opacity-30" : "opacity-100"}`}>
              {/* Scaled Realistic Vinyl */}
              <motion.div
                className="relative w-full h-full rounded-full bg-[#050505] shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.02)] flex items-center justify-center overflow-hidden"
                animate={isMuted ? { rotate: 0 } : { 
                  rotate: 360,
                  x: [0, 0.2, -0.2, 0],
                  y: [0, -0.2, 0.2, 0]
                }}
                transition={isMuted ? { duration: 0.8, ease: "easeOut" } : { 
                  rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                  x: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                {/* Grooves */}
                <div 
                  className="absolute inset-0 opacity-[0.12]" 
                  style={{ background: "repeating-radial-gradient(circle, transparent 0, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)" }}
                />
                
                {/* Multi-layered Realistic Reflections */}
                {!isMuted && (
                  <>
                    <motion.div 
                      className="absolute inset-0 opacity-40 mix-blend-screen"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      style={{ background: "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.1) 10%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,0.1) 20%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.1) 80%, transparent 100%)" }}
                    />
                    <motion.div 
                      className="absolute inset-0 opacity-30 mix-blend-screen"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      style={{ background: "conic-gradient(from 0deg, transparent 10%, rgba(255,255,255,0.3) 30%, transparent 50%, transparent 70%, rgba(255,255,255,0.3) 90%, transparent 100%)" }}
                    />
                  </>
                )}

                {/* Small Label */}
                <div className="w-1/3 h-1/3 rounded-full bg-[#0A0A0A] border border-white/5 relative z-10 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                </div>
              </motion.div>
              
              {/* Scaled Tonearm */}
              <motion.div 
                className="absolute -top-1 -right-1 w-full h-full pointer-events-none z-20"
                animate={isMuted ? { rotate: 15, x: 1 } : { rotate: 0, x: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <svg viewBox="0 0 40 60" fill="none" className="w-full h-full">
                  <path d="M32 5v10c0 5-5 8-10 10L12 40" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
                  <rect x="8" y="42" width="6" height="8" rx="1" transform="rotate(25 11 46)" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" />
                </svg>
              </motion.div>

              {isMuted && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-[1.5px] bg-white/40 rotate-45 rounded-full" />
                </div>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
});

export default BackgroundMusic;
