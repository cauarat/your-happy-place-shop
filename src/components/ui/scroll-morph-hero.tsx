"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type ScrollMorphPhase = "entrance" | "circle";

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
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

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
  const [phase, setPhase] = React.useState<ScrollMorphPhase>("entrance");
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
  // A single continuous 0->1 tween, not discrete phase snaps — icon
  // positions below are derived from this same value every frame, so the
  // whole path (scatter -> line -> circle) reads as one fluid arc instead
  // of two separate re-target jumps.
  const entranceProgress = useMotionValue(0);
  const [entranceValue, setEntranceValue] = React.useState(0);

  React.useEffect(() => {
    return entranceProgress.on("change", setEntranceValue);
  }, [entranceProgress]);

  React.useEffect(() => {
    // Linear driver on purpose: the actual easing shape comes from
    // easeInOutCubic applied per-icon below. Stacking an eased driver under
    // an eased per-icon curve front-loads almost all the motion into the
    // first fraction of the duration, which looked instant, not fluid.
    const controls = animate(entranceProgress, 1, {
      duration: 2.6,
      ease: "linear",
      onComplete: () => setPhase("circle"),
    });
    return () => controls.stop();
  }, [entranceProgress]);

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
      if (phase === "entrance") return;
      e.preventDefault();
      advance(e.deltaY);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (phase === "entrance") return;
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

  // --- Per-icon entrance variation (computed once) ---
  // Small random offsets on how far out each icon starts, how much of an arc
  // it sweeps, and its initial tilt — enough to feel organic without breaking
  // the coordinated bloom into noise.
  const scatterPositions = React.useMemo(
    () =>
      icons.map(() => ({
        radiusFactor: 0.5 + Math.random() * 0.15,
        sweep: Math.PI * (0.45 + Math.random() * 0.3),
        rotation: (Math.random() - 0.5) * 90,
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
        <motion.div
          animate={
            phase === "circle" ? { opacity: Math.max(1 - iconMorph * 3.2, 0) * 0.5 } : { opacity: 0 }
          }
          transition={{ duration: 0.4 }}
          className="mt-8 flex flex-col items-center gap-2"
        >
          <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            {scrollHint}
          </span>
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-muted-foreground opacity-70"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </div>

      {/* Reveal content — fades in, in the same spot, as the icons settle.
          Stays pointer-events-none at the wrapper level (it's a full-screen
          inset-0 box with an explicit z-index, so an "auto" here would sit
          above and swallow hover/clicks over the icons anywhere on screen);
          only the actual interactive piece (children, e.g. the language
          dropdown) opts back into pointer events. */}
      <motion.div
        animate={{ opacity: revealProgress, y: (1 - revealProgress) * 16 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
      >
        {revealLogo && <div className="mb-6">{revealLogo}</div>}
        <div className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          {revealTitle}
        </div>
        {revealSubtitle && (
          <p className="mt-4 max-w-sm text-sm md:text-base text-muted-foreground">{revealSubtitle}</p>
        )}
        {children && (
          <div
            className="mt-8"
            style={{ pointerEvents: revealProgress > 0.5 ? "auto" : "none" }}
          >
            {children}
          </div>
        )}
      </motion.div>

      {/* Icons — purely decorative, must not intercept clicks meant for the
          intro/reveal content sitting in the gap between them */}
      <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
        {icons.map((item, i) => {
          let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

          if (phase === "entrance") {
            // Icons spiral inward: each starts far outside the viewport on its
            // own radial line, then sweeps in along a curved arc to its slot on
            // the circle. Interpolating in polar space (radius + angle) rather
            // than straight x/y is what makes the path curve continuously —
            // there's no waypoint to hit, so nothing ever reads as a corner.
            const stagger = icons.length > 1 ? 0.3 / (icons.length - 1) : 0;
            const localT = Math.min(
              Math.max((entranceValue - i * stagger) / (1 - i * stagger), 0),
              1
            );
            const eased = easeOutQuint(localT);
            const appearT = Math.min(localT / 0.25, 1);

            const minDimension = Math.min(containerSize.width || 1, containerSize.height || 1);
            const circleRadius = Math.min(minDimension * 0.32, 300);
            const finalAngle = (i / icons.length) * Math.PI * 2;

            const jitter = scatterPositions[i];
            const startRadius = Math.max(containerSize.width, containerSize.height) * jitter.radiusFactor;
            const startAngle = finalAngle - jitter.sweep;

            const radius = lerp(startRadius, circleRadius, eased);
            const angle = lerp(startAngle, finalAngle, eased);

            target = {
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
              rotation: lerp(jitter.rotation, 0, eased),
              scale: lerp(0.5, 1, appearT),
              opacity: appearT,
            };
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
            // Outer div: pure positioning, driven by scroll (unchanged logic).
            // Inner div: idle "alive" float + hover response, kept separate so
            // it never fights the scroll-driven x/y/scale animation above.
            <motion.div
              key={item.id}
              animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
              }}
              transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.6 }}
              className="absolute pointer-events-auto"
            >
              <motion.div
                animate={
                  phase === "circle"
                    ? { y: [0, -7, 0], rotate: [0, i % 2 === 0 ? 2 : -2, 0] }
                    : { y: 0, rotate: 0 }
                }
                transition={
                  phase === "circle"
                    ? {
                        duration: 3.2 + (i % 4) * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.18,
                      }
                    : { duration: 0.3 }
                }
                whileHover={{
                  scale: 1.14,
                  y: -10,
                  rotate: 0,
                  transition: { type: "spring", stiffness: 300, damping: 14 },
                }}
                className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 p-3 rounded-3xl shadow-xl bg-card/80 backdrop-blur-md border border-border/10 cursor-pointer"
              >
                <item.icon className="w-8 h-8 md:w-10 md:h-10 text-foreground" />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
