"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export type ScrollMorphPhase = "scatter" | "line" | "circle";

export interface ScrollMorphIcon {
  id: number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  // Tailwind top/left/right/bottom arbitrary-percentage classes — the exact
  // destination layout the icons morph into as the reveal content appears.
  className: string;
}

export interface ScrollMorphHeroProps {
  icons: ScrollMorphIcon[];
  // Copy shown centered while icons rest in the circle, before any scrolling.
  introTitle: React.ReactNode;
  introSubtitle?: React.ReactNode;
  scrollHint?: string;
  // Content that fades in, in the same spot, as the user keeps scrolling —
  // this is what used to be a separate "page two". Revealed once the icons
  // have (mostly) landed in their final layout.
  revealLogo?: React.ReactNode;
  revealTitle: React.ReactNode;
  revealSubtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

// The whole circle -> final-layout -> content-reveal sequence lives on one
// continuous scroll axis, so scrolling up at any point unwinds exactly what
// scrolling down built up — nothing is a one-way, auto-triggered jump.
const MAX_SCROLL = 800;
const ICON_MORPH_END = 550; // icons finish spreading into their final layout
const REVEAL_START = 320; // reveal content starts fading in (overlaps the
const REVEAL_END = 800; // icon morph's tail, so the two read as one motion)

// Converts a `top-[x%] left-[x%]` (or bottom/right) className into a pixel
// offset from the container's center, i.e. what an absolutely-positioned
// element with those classes would resolve to. Lets us animate an icon onto
// exactly the spot another layout would place it.
function positionToCenterOffset(
  className: string,
  containerW: number,
  containerH: number,
  iconSize: number
) {
  const top = className.match(/top-\[(\d+(?:\.\d+)?)%\]/);
  const bottom = className.match(/bottom-\[(\d+(?:\.\d+)?)%\]/);
  const left = className.match(/left-\[(\d+(?:\.\d+)?)%\]/);
  const right = className.match(/right-\[(\d+(?:\.\d+)?)%\]/);

  const iconLeft = left
    ? (parseFloat(left[1]) / 100) * containerW
    : right
    ? containerW - (parseFloat(right[1]) / 100) * containerW - iconSize
    : containerW / 2 - iconSize / 2;

  const iconTop = top
    ? (parseFloat(top[1]) / 100) * containerH
    : bottom
    ? containerH - (parseFloat(bottom[1]) / 100) * containerH - iconSize
    : containerH / 2 - iconSize / 2;

  return {
    x: iconLeft + iconSize / 2 - containerW / 2,
    y: iconTop + iconSize / 2 - containerH / 2,
  };
}

export function ScrollMorphHero({
  icons,
  introTitle,
  introSubtitle,
  scrollHint = "SCROLL TO EXPLORE",
  revealLogo,
  revealTitle,
  revealSubtitle,
  children,
  className,
}: ScrollMorphHeroProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [phase, setPhase] = React.useState<ScrollMorphPhase>("scatter");
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  // --- Track container size (so positions stay correct on resize) ---
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    setContainerSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => observer.disconnect();
  }, []);

  // --- One-time entrance: scatter -> line -> circle (resting state) ---
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase("line"), 500);
    const t2 = setTimeout(() => setPhase("circle"), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // --- Virtual scroll (wheel + touch), fully bidirectional ---
  const virtualScroll = useMotionValue(0);
  const scrollRef = React.useRef(0);
  const smoothScroll = useSpring(virtualScroll, { stiffness: 45, damping: 20 });
  const [scrollValue, setScrollValue] = React.useState(0);

  React.useEffect(() => {
    return smoothScroll.on("change", setScrollValue);
  }, [smoothScroll]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const advance = (delta: number) => {
      const next = Math.min(Math.max(scrollRef.current + delta, 0), MAX_SCROLL);
      scrollRef.current = next;
      virtualScroll.set(next);
    };

    const handleWheel = (e: WheelEvent) => {
      if (phase === "scatter" || phase === "line") return;
      e.preventDefault();
      advance(e.deltaY);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (phase === "scatter" || phase === "line") return;
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      advance(touchStartY - touchY);
      touchStartY = touchY;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [phase, virtualScroll]);

  // Two overlapping progress values derived from the same scroll position —
  // the overlap (reveal starts before the morph finishes) is what makes the
  // hand-off read as one continuous motion instead of two separate beats.
  const iconMorph = Math.min(Math.max(scrollValue / ICON_MORPH_END, 0), 1);
  const revealProgress = Math.min(
    Math.max((scrollValue - REVEAL_START) / (REVEAL_END - REVEAL_START), 0),
    1
  );

  // --- Randomized scatter start positions (computed once) ---
  const scatterPositions = React.useMemo(
    () =>
      icons.map(() => ({
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.5) * 700,
        rotation: (Math.random() - 0.5) * 180,
        scale: 0.6,
        opacity: 0,
      })),
    [icons]
  );

  const isMobile = containerSize.width > 0 && containerSize.width < 768;
  const iconSize = isMobile ? 64 : 80;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-screen min-h-[700px] bg-background overflow-hidden touch-none", className)}
    >
      {/* Intro copy — visible while resting in the circle, fades as scrolling begins */}
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
        <motion.h1
          animate={
            phase === "circle"
              ? { opacity: Math.max(1 - iconMorph * 1.8, 0), y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 12, filter: "blur(8px)" }
          }
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground"
        >
          {introTitle}
        </motion.h1>
        {introSubtitle && (
          <motion.div
            animate={
              phase === "circle"
                ? { opacity: Math.max(1 - iconMorph * 2.4, 0), scale: 1 }
                : { opacity: 0, scale: 0.96 }
            }
            transition={{ duration: 0.4 }}
            style={{ pointerEvents: phase === "circle" && iconMorph < 0.4 ? "auto" : "none" }}
            className="mt-5 max-w-sm text-sm md:text-base text-muted-foreground"
          >
            {introSubtitle}
          </motion.div>
        )}
        <motion.p
          animate={
            phase === "circle" ? { opacity: Math.max(1 - iconMorph * 3.2, 0) * 0.5 } : { opacity: 0 }
          }
          transition={{ duration: 0.4 }}
          className="mt-8 text-xs font-bold tracking-[0.2em] text-muted-foreground"
        >
          {scrollHint}
        </motion.p>
      </div>

      {/* Reveal content — fades in, in the same spot, as the icons settle */}
      <motion.div
        animate={{ opacity: revealProgress, y: (1 - revealProgress) * 16 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: revealProgress > 0.5 ? "auto" : "none" }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6"
      >
        {revealLogo && <div className="mb-6">{revealLogo}</div>}
        <div className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
          {revealTitle}
        </div>
        {revealSubtitle && (
          <p className="mt-4 max-w-sm text-sm md:text-base text-muted-foreground">{revealSubtitle}</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </motion.div>

      {/* Icons — purely decorative, must not intercept clicks meant for the
          intro/reveal content sitting in the gap between them */}
      <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
        {icons.map((item, i) => {
          let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

          if (phase === "scatter") {
            target = scatterPositions[i];
          } else if (phase === "line") {
            const spacing = iconSize + 14;
            const totalWidth = icons.length * spacing;
            target = { x: i * spacing - totalWidth / 2, y: 0, rotation: 0, scale: 1, opacity: 1 };
          } else {
            const minDimension = Math.min(containerSize.width || 1, containerSize.height || 1);
            const circleRadius = Math.min(minDimension * 0.32, 300);
            const angle = (i / icons.length) * 360;
            const rad = (angle * Math.PI) / 180;
            const circlePos = {
              x: Math.cos(rad) * circleRadius,
              y: Math.sin(rad) * circleRadius,
            };

            const finalPos = positionToCenterOffset(
              item.className,
              containerSize.width,
              containerSize.height,
              iconSize
            );

            target = {
              x: lerp(circlePos.x, finalPos.x, iconMorph),
              y: lerp(circlePos.y, finalPos.y, iconMorph),
              rotation: 0,
              scale: 1,
              opacity: 1,
            };
          }

          return (
            <motion.div
              key={item.id}
              animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
              }}
              transition={{
                type: "spring",
                stiffness: 45,
                damping: 16,
                delay: phase === "scatter" ? i * 0.05 : 0,
              }}
              className="absolute flex items-center justify-center w-16 h-16 md:w-20 md:h-20 p-3 rounded-3xl shadow-xl bg-card/80 backdrop-blur-md border border-border/10"
            >
              <item.icon className="w-8 h-8 md:w-10 md:h-10 text-foreground" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
