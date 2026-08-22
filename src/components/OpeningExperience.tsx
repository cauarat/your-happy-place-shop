import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { BackgroundMusicHandle } from "./BackgroundMusic";
import { useIsMobile } from "@/hooks/use-mobile";

interface OpeningExperienceProps {
  onComplete: () => void;
  musicControl: React.RefObject<BackgroundMusicHandle>;
}

const RealisticVinyl: React.FC<{ onClick: () => void, isStarting: boolean, isMobile: boolean }> = ({ onClick, isStarting, isMobile }) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)", transition: { duration: 1.2 } }}
      whileHover={!isStarting ? { scale: 1.02 } : {}}
      className="relative cursor-pointer group"
      onClick={!isStarting ? onClick : undefined}
    >
      {/* Vinyl Disc Container */}
      <motion.div
        className="relative w-64 h-64 md:w-80 md:h-80 rounded-full bg-[#050505] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_100px_rgba(255,255,255,0.02)] flex items-center justify-center overflow-hidden"
        style={{
          perspective: "1000px",
        }}
        initial={{ rotate: 0 }}
        animate={isStarting ? { 
          rotate: 360,
          x: [0, 0.5, -0.5, 0],
          y: [0, -0.5, 0.5, 0]
        } : { rotate: 0 }}
        transition={isStarting ? { 
          rotate: { duration: 8, repeat: Infinity, ease: "linear" },
          x: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
        } : { rotate: { duration: 2, ease: "easeOut" } }}
      >
        {/* Fine Grooves Texture */}
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{
            background: "repeating-radial-gradient(circle, transparent 0, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)",
          }}
        />
        
        {/* Dynamic Light Reflections - Multi-layered for realism */}
        <motion.div 
          className="absolute inset-0 opacity-60 mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={isStarting ? { opacity: 0.6, rotate: 360 } : { opacity: 0 }}
          transition={{ rotate: { duration: 10, repeat: Infinity, ease: "linear" }, opacity: { duration: 1 } }}
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.1) 10%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,0.1) 20%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.1) 80%, transparent 100%)",
          }}
        />
        {/* Counter-rotating light: skipped on mobile to reduce GPU composite layers. */}
        {!isMobile && (
        <motion.div 
          className="absolute inset-0 opacity-40 mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={isStarting ? { opacity: 0.4, rotate: -360 } : { opacity: 0 }}
          transition={{ rotate: { duration: 15, repeat: Infinity, ease: "linear" }, opacity: { duration: 1.5 } }}
          style={{
            background: "conic-gradient(from 0deg, transparent 10%, rgba(255,255,255,0.3) 30%, transparent 50%, transparent 70%, rgba(255,255,255,0.3) 90%, transparent 100%)",
          }}
        />
        )}

        {/* Inner Label */}
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#0A0A0A] border border-white/5 flex flex-col items-center justify-center shadow-inner relative z-10">
          <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-tighter text-white/60 mb-1">Villaoro</span>
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="text-[6px] md:text-[7px] uppercase tracking-[0.3em] text-white/20 mt-2 font-sans">{t('side_a')}</span>
        </div>
      </motion.div>

      {/* Static Tonearm - Moves to record when starting */}
      <motion.div 
        className="absolute -top-12 -right-8 md:-top-16 md:-right-12 w-32 h-48 md:w-40 md:h-60 pointer-events-none z-20"
        initial={{ rotate: 15 }}
        animate={isStarting ? { rotate: 0 } : { rotate: 15 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 100 150" fill="none" className="w-full h-full drop-shadow-2xl">
          <path d="M80 10v20c0 10-10 15-20 20L30 80" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 80l-5 10" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" />
          <rect x="20" y="85" width="10" height="15" rx="2" transform="rotate(25 25 92)" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" />
          <circle cx="80" cy="15" r="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
        </svg>
      </motion.div>

      {/* Enter Text Overlay */}
      <AnimatePresence>
        {!isStarting && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
              <span className="text-[10px] uppercase tracking-[0.6em] text-white/80">{t('enter_catalog')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const OpeningExperience: React.FC<OpeningExperienceProps> = ({ onComplete, musicControl }) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"initial" | "typing" | "complete">("initial");
  const brandName = "Villaoro";

  const startExperience = () => {
    setIsStarting(true);
    
    // Start music immediately but wait for spin animation to feel physical
    if (musicControl.current) {
      musicControl.current.start();
      fadeInAudio();
    }

    // Give it 1.5 seconds of physical "start-up" before showing logo
    setTimeout(() => {
      setHasInteracted(true);
      setTimeout(() => {
        setShowContent(true);
        setAnimationPhase("typing");
      }, 500);
    }, 1500);
  };

  const fadeInAudio = () => {
    let volume = 0;
    const interval = setInterval(() => {
      if (volume < 40) { // Limit max volume to 40% for ambient feel
        volume += 2;
        musicControl.current?.setVolume(volume);
      } else {
        clearInterval(interval);
      }
    }, 150);
  };

  const handleAnimationComplete = () => {
    setAnimationPhase("complete");
    setTimeout(() => {
      onComplete();
    }, 800); // Wait 800ms after full name is revealed for a refined, intentional transition
  };

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.0, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-[#0A0A0A] flex items-center justify-center overflow-hidden font-serif"
    >
      <AnimatePresence mode="wait">
        {!hasInteracted ? (
          <div className="flex flex-col items-center gap-12">
            <RealisticVinyl onClick={startExperience} isStarting={isStarting} isMobile={isMobile} />
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="text-[9px] uppercase tracking-[0.8em] text-white"
            >
              {t('click_to_begin')}
            </motion.p>
          </div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="flex">
                {brandName.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                    animate={showContent ? { 
                      opacity: 1, 
                      y: 0, 
                      filter: "blur(0px)",
                    } : {}}
                    transition={{
                      duration: 1.5,
                      delay: index * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onAnimationComplete={index === brandName.length - 1 ? handleAnimationComplete : undefined}
                    className="text-5xl md:text-8xl font-bold text-white tracking-tighter"
                    style={{ 
                      textShadow: "0 0 30px rgba(255,255,255,0.15)"
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.05 }}
                transition={{ duration: 3 }}
                className={`absolute inset-0 -z-10 pointer-events-none ${isMobile ? 'blur-xl' : 'blur-3xl'} scale-150`}
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 70%)"
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>
    </motion.div>
  );
};

export default OpeningExperience;
