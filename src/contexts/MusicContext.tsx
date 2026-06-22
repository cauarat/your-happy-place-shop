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
        height: "0",
        width: "0",
        videoId,
        playerVars: { autoplay: 0, controls: 0, showinfo: 0, modestbranding: 1, loop: 1, playlist: videoId },
        events: {
          onReady: (event: any) => { event.target.setVolume(50); },
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
      <div id="youtube-audio-global" className="hidden" />
      {children}
    </MusicContext.Provider>
  );
};
