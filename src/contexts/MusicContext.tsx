import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { getDesignSettings } from "@/lib/store";

interface MusicContextType {
  isPlaying: boolean;
  isVisible: boolean;
  togglePlay: () => void;
}

const MusicContext = createContext<MusicContextType>({
  isPlaying: false,
  isVisible: false,
  togglePlay: () => {},
});

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
    const settings = getDesignSettings();
    if (!settings.musicUrl) return;

    const videoId = extractYoutubeId(settings.musicUrl);
    if (!videoId) return;

    setIsVisible(true);

    const initPlayer = () => {
      if (playerRef.current) return; // prevent double init
      playerRef.current = new (window as any).YT.Player("youtube-audio-global", {
        height: "1",
        width: "1",
        videoId,
        playerVars: { autoplay: 0, controls: 0, showinfo: 0, modestbranding: 1, loop: 1, playlist: videoId },
        events: {
          onReady: (event: any) => { event.target.setVolume(50); },
          onStateChange: (event: any) => {
            // 0 = ENDED, 1 = PLAYING
            if (event.data === 0) {
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
                    // Seek back to 0 just before it ends (0.2s)
                    if (duration > 0 && current > 0 && (duration - current) < 0.2) {
                      player.seekTo(0);
                    }
                  }
                } catch (e) {
                  // ignore
                }
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

    return () => {
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
    <MusicContext.Provider value={{ isPlaying, isVisible, togglePlay }}>
      <div className="fixed top-0 left-0 w-[1px] h-[1px] opacity-0 pointer-events-none -z-50 overflow-hidden">
        <div id="youtube-audio-global" />
      </div>
      {children}
    </MusicContext.Provider>
  );
};
