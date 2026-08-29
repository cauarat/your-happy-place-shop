import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { getDesignSettings } from "@/lib/store";

interface MusicContextType {
  isPlaying: boolean;
  isVisible: boolean;
  togglePlay: () => void;
  /** Drop the music under a voice line, and bring it back after. */
  duck: () => void;
  unduck: () => void;
}

const MusicContext = createContext<MusicContextType>({
  isPlaying: false,
  isVisible: false,
  togglePlay: () => {},
  duck: () => {},
  unduck: () => {},
});

/** The music's own level, and the level it drops to while the assistant talks. */
const MUSIC_VOLUME = 50;
const DUCKED_VOLUME = 10;

export const useMusicPlayer = () => useContext(MusicContext);

export const MusicProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const playerRef = useRef<any>(null);

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    let currentVideoId: string | null = null;

    const initOrUpdatePlayer = () => {
      const settings = getDesignSettings();
      const newVideoId = extractYoutubeId(settings.musicUrl || "");
      
      if (!newVideoId) {
        setIsVisible(false);
        if (playerRef.current && playerRef.current.stopVideo) {
          playerRef.current.stopVideo();
        }
        return;
      }

      setIsVisible(true);

      if (playerRef.current && playerRef.current.loadVideoById) {
        if (currentVideoId !== newVideoId) {
          currentVideoId = newVideoId;
          playerRef.current.loadVideoById(newVideoId);
        }
        return;
      }

      currentVideoId = newVideoId;
      const initPlayer = () => {
        if (playerRef.current) return;
        playerRef.current = new (window as any).YT.Player("youtube-audio-global", {
          height: "10",
          width: "10",
          videoId: currentVideoId,
          playerVars: { 
            autoplay: 1, 
            controls: 0, 
            showinfo: 0, 
            modestbranding: 1, 
            loop: 1, 
            playlist: currentVideoId,
            origin: window.location.origin,
            playsinline: 1
          },
          events: {
            onReady: (event: any) => { 
              event.target.setVolume(MUSIC_VOLUME);
              // Tenta dar play automaticamente
              try {
                event.target.playVideo();
              } catch (e) {}
            },
            onStateChange: (event: any) => {
              if (event.data === 1) { // 1 = playing
                setIsPlaying(true);
                setHasInteracted(true);
              }
              if (event.data === 0) { // 0 = ended
                event.target.seekTo(0);
                event.target.playVideo();
              }
              if (event.data === 1) {
                if ((window as any).ytSeamlessLoop) clearInterval((window as any).ytSeamlessLoop);
                (window as any).ytSeamlessLoop = setInterval(() => {
                  try {
                    const player = event.target;
                    if (player && typeof player.getDuration === 'function') {
                      const duration = player.getDuration();
                      const current = player.getCurrentTime();
                      if (duration > 0 && current > 0 && (duration - current) < 0.2) {
                        player.seekTo(0);
                      }
                    }
                  } catch (e) {}
                }, 50);
              } else {
                if ((window as any).ytSeamlessLoop) clearInterval((window as any).ytSeamlessLoop);
              }
            }
          },
        });
      };

      if (!(window as any).YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.getElementsByTagName("script")[0].parentNode?.insertBefore(tag, document.getElementsByTagName("script")[0]);
        (window as any).onYouTubeIframeAPIReady = initPlayer;
      } else {
        initPlayer();
      }
    };

    initOrUpdatePlayer();

    const handleSettingsUpdate = () => {
      initOrUpdatePlayer();
    };

    window.addEventListener('design-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('design-settings-updated', handleSettingsUpdate);
      if ((window as any).ytSeamlessLoop) clearInterval((window as any).ytSeamlessLoop);
      if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted && playerRef.current?.playVideo) {
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

  // The music doesn't cut to the ducked level, it slides. A hard volume step
  // under a voice reads as a glitch; a short ramp reads as the room making
  // space for someone to speak.
  const rampFrameRef = useRef<number | null>(null);

  const rampVolume = useCallback((to: number) => {
    const player = playerRef.current;
    if (!player?.setVolume || !player?.getVolume) return;
    if (rampFrameRef.current) cancelAnimationFrame(rampFrameRef.current);

    let from: number;
    try {
      from = player.getVolume();
    } catch {
      return;
    }

    const startedAt = performance.now();
    const RAMP_MS = 260;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / RAMP_MS);
      try {
        player.setVolume(from + (to - from) * progress);
      } catch {}
      rampFrameRef.current = progress < 1 ? requestAnimationFrame(step) : null;
    };
    rampFrameRef.current = requestAnimationFrame(step);
  }, []);

  const duck = useCallback(() => rampVolume(DUCKED_VOLUME), [rampVolume]);
  const unduck = useCallback(() => rampVolume(MUSIC_VOLUME), [rampVolume]);

  useEffect(() => () => {
    if (rampFrameRef.current) cancelAnimationFrame(rampFrameRef.current);
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      setHasInteracted(true);
    }
  };

  return (
    <MusicContext.Provider value={{ isPlaying, isVisible, togglePlay, duck, unduck }}>
      <div className="fixed top-0 left-0 w-[1px] h-[1px] opacity-0 pointer-events-none -z-50 overflow-hidden">
        <div id="youtube-audio-global" />
      </div>
      {children}
    </MusicContext.Provider>
  );
};
