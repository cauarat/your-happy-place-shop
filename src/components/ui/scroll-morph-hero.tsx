"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { scrollPageTo } from "@/lib/motion";
import { ChevronDown } from "lucide-react";

export type ScrollMorphPhase = "entrance" | "resting";

export interface ScrollMorphIcon {
  id: number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  // Tailwind top/left/right/bottom arbitrary-percentage classes — the scattered
  // resting layout the icons fly into on load, and gather back out of as the
  // reveal content appears.
  className: string;
}

export interface ScrollMorphHeroProps {
  icons: ScrollMorphIcon[];
  // Copy shown centered while icons rest scattered across the screen, before
  // any scrolling.
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
  // Decorative layer behind the whole scene. Given as a square: the hero sizes
  // it and drives it with the scroll (see the globe choreography below), so
  // whatever is passed only has to fill the box it's handed.
  backdrop?: React.ReactNode;
}

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

// --- Entrance choreography ---
// The page holds blank for a beat, then the icons arrive one at a time from
// beyond the edges — each on its own ray out of the container's center, so
// they come from ten different angles rather than one shared direction — and
// settle onto their resting spots. Nothing overlaps at the start, which is
// what keeps it from reading as a burst.
const ENTRANCE_HOLD = 0.25; // blank beat before the first icon moves
const ENTRANCE_STAGGER = 0.08; // gap between consecutive icons
const ENTRANCE_TRAVEL = 0.9; // one icon's flight, from offscreen to settled
// Decisive deceleration, no overshoot: the icons glide to a stop rather than
// bouncing into place.
const ENTRANCE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// The scattered -> circle -> content-reveal sequence is driven by the page's
// own scroll position, not by a wheel/touch listener of our own. The hero is a
// tall runway with a sticky stage inside it: the stage holds still while the
// runway scrolls past underneath, and every value below is read off that
// progress. Nothing is captured, nothing is thresholded, nothing has to be
// unlocked — scrolling up unwinds exactly what scrolling down built, and
// carrying straight on takes you to whatever the page puts after the hero.
const MORPH_SCROLL = 800; // pixels of scroll the morph itself is spread over
const ICON_MORPH_END = 550; // icons finish gathering into the circle
const REVEAL_START = 320; // reveal content starts fading in (overlaps the
const REVEAL_END = 800; // icon morph's tail, so the two read as one motion)
// Extra runway after the morph completes: the stage stays put while this is
// scrolled through, so the finished state reads as a screen you're on rather
// than a single position you pass through.
const REST_SCROLL = 420;
const SCROLL_RANGE = MORPH_SCROLL + REST_SCROLL;

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
  backdrop,
}: ScrollMorphHeroProps) {
  // The runway is the tall element the page scrolls through; the stage is the
  // sticky screen inside it that everything is drawn on.
  const runwayRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [phase, setPhase] = React.useState<ScrollMorphPhase>("entrance");
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  // --- Track container size (so positions stay correct on resize) ---
  // Layout effect, not a plain one: the icons' resting spots are derived from
  // this, so measuring after the first paint would flash every icon stacked at
  // the container's center for a frame before they snapped outwards.
  React.useLayoutEffect(() => {
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

  const isMobile = containerSize.width > 0 && containerSize.width < 768;
  const iconSize = isMobile ? 64 : 80;

  // Someone who asked their OS for less motion gets the same sequence without
  // the flight: the icons simply resolve in place.
  const reduceMotion = useReducedMotion();
  const travelDuration = reduceMotion ? 0.35 : ENTRANCE_TRAVEL;

  // --- Entrance choreography (recomputed only when the layout changes) ---
  // Per icon: where it starts (just past the edge it's nearest, along the ray
  // from the center through its resting spot) and when it's released. The
  // release order runs clockwise from 12 o'clock rather than following the
  // array, so the eye is led around the screen instead of jumping about.
  const entrances = React.useMemo(() => {
    const halfW = containerSize.width / 2;
    const halfH = containerSize.height / 2;
    // Icons rest close to the edges, so simply "starting outside" would leave
    // the ones near a corner with almost no distance to cover. A floor on the
    // travel keeps every arrival substantial enough to read as a glide.
    const minTravel = Math.max(containerSize.width, containerSize.height) * 0.22;

    const geometry = icons.map((item) => {
      const rest = positionToCenterOffset(
        item.className,
        containerSize.width,
        containerSize.height,
        iconSize
      );
      const distance = Math.hypot(rest.x, rest.y) || 1;
      const dir = { x: rest.x / distance, y: rest.y / distance };

      // How far along that ray the icon has to sit to be clear of the viewport.
      // Whichever edge the ray crosses first is the one it flies in from.
      const toSideEdge =
        Math.abs(dir.x) > 1e-3 ? (halfW + iconSize - Math.abs(rest.x)) / Math.abs(dir.x) : Infinity;
      const toTopEdge =
        Math.abs(dir.y) > 1e-3 ? (halfH + iconSize - Math.abs(rest.y)) / Math.abs(dir.y) : Infinity;
      const travel = Math.max(Math.min(toSideEdge, toTopEdge) + 40, minTravel);

      return {
        offset: { x: dir.x * travel, y: dir.y * travel },
        // Angle measured clockwise from 12 o'clock.
        clockwise: (Math.atan2(rest.y, rest.x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2),
      };
    });

    const delays: number[] = [];
    geometry
      .map((g, index) => ({ index, clockwise: g.clockwise }))
      .sort((a, b) => a.clockwise - b.clockwise)
      .forEach((entry, position) => {
        delays[entry.index] = reduceMotion
          ? position * 0.04
          : ENTRANCE_HOLD + position * ENTRANCE_STAGGER;
      });

    return geometry.map((g, index) => ({
      offset: reduceMotion ? { x: 0, y: 0 } : g.offset,
      delay: delays[index],
    }));
  }, [icons, containerSize.width, containerSize.height, iconSize, reduceMotion]);

  // The flight itself is declarative, per icon (see the map below). This only
  // waits for the last one to land before handing the screen over to the
  // greeting and unlocking the scroll.
  React.useEffect(() => {
    if (!containerSize.width) return;
    const lastRelease = entrances.reduce((latest, e) => Math.max(latest, e.delay), 0);
    const timer = setTimeout(
      () => setPhase("resting"),
      (lastRelease + travelDuration) * 1000
    );
    return () => clearTimeout(timer);
  }, [entrances, containerSize.width, travelDuration]);

  // --- Page scroll drives everything ---
  // Progress runs 0 -> 1 across the runway: 0 with its top at the top of the
  // viewport, 1 with its bottom at the bottom, which is exactly the stretch
  // the sticky stage is held in place for. Because it's the document's own
  // scroll, momentum, rubber-banding, keyboard paging and the scrollbar all
  // work, and there's nothing to release when the sequence finishes.
  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end end"],
  });
  // A light spring only: enough to round off the discrete steps a mouse wheel
  // produces, not enough to lag behind a finger.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    mass: 0.3,
    restDelta: 0.0005,
  });
  const [scrollValue, setScrollValue] = React.useState(0);

  React.useEffect(() => {
    return smoothProgress.on("change", (p) => setScrollValue(p * SCROLL_RANGE));
  }, [smoothProgress]);

  // Clicking the scroll hint does exactly what scrolling would: carries the
  // page to the point where the morph has just completed, which is the start
  // of the rest stretch. Same guided scroll the page uses to reach whatever
  // follows the hero, so both gestures land the same way.
  const scrollToMorphEnd = () => {
    const runway = runwayRef.current;
    if (!runway) return;
    scrollPageTo(runway.getBoundingClientRect().top + window.scrollY + MORPH_SCROLL);
  };

  // Two overlapping progress values derived from the same scroll position —
  // the overlap (reveal starts before the morph finishes) is what makes the
  // hand-off read as one continuous motion instead of two separate beats.
  const iconMorph = Math.min(Math.max(scrollValue / ICON_MORPH_END, 0), 1);
  const revealProgress = Math.min(
    Math.max((scrollValue - REVEAL_START) / (REVEAL_END - REVEAL_START), 0),
    1
  );

  // The ring the icons gather into as the user scrolls, and the room it leaves
  // in its middle for the revealed content.
  const minDimension = Math.min(containerSize.width || 1, containerSize.height || 1);
  const circleRadius = Math.min(minDimension * 0.32, 300);
  // On a phone the ring is narrower than the CTA it would encircle, so the
  // buttons drop just below it rather than colliding with the icons.
  const tightRing = 2 * circleRadius - iconSize < 320;

  // --- The backdrop's choreography ---
  // At rest its center sits on the bottom edge of the stage, so only its top
  // half is in view: a horizon under the scattered icons, as wide as the
  // screen. The same scroll that gathers the icons lifts it to the middle of
  // the stage and shrinks it to the opening the ring closes around — the second
  // half of it arrives as the ring does, and the two land as one movement.

  // Tangent to the inner edge of the icons on the ring: they orbit it, and at
  // rest it is the thing they are scattered around.
  const backdropRingSize = Math.max(2 * circleRadius - iconSize, 0);
  const backdropRestSize = Math.max(
    Math.min(
      containerSize.width * 0.92,
      // Height matters as much as width: on a short laptop window a dome sized
      // off the width alone rises far enough to reach the greeting.
      containerSize.height * 0.85,
      1024
    ),
    // Never smaller than where it's headed, so the scale below only ever shrinks.
    backdropRingSize
  );
  // Rendered at its largest and scaled *down*, never up, so it stays crisp —
  // a canvas backdrop is rasterised once at the size of the box it's given.
  const backdropScale =
    backdropRestSize > 0 ? lerp(1, backdropRingSize / backdropRestSize, iconMorph) : 1;
  const backdropCenterY = lerp(
    // A touch above the very edge, so a phone's bottom browser chrome doesn't
    // eat the horizon.
    containerSize.height - 24,
    containerSize.height / 2,
    iconMorph
  );

  return (
    // Runway: pure scroll distance, nothing drawn on it. Its height is what
    // decides how much scrolling the sequence is spread across.
    <div
      ref={runwayRef}
      className={cn("relative w-full", className)}
      style={{ height: `calc(100vh + ${SCROLL_RANGE}px)` }}
    >
      {/* Stage: held against the top of the viewport for the length of the
          runway, so the sequence plays out in a screen that appears still
          while the page scrolls underneath it. */}
      <div
        ref={containerRef}
        className="sticky top-0 h-screen w-full overflow-hidden bg-background"
      >
        {/* Backdrop — first in the stage, so everything else paints over it.
            Held back until the container has been measured, for the same reason
            the icons are: its whole position is derived from that size.
            Deliberately inert to pointer events — the canvas it usually holds
            would otherwise claim the touch that is meant to scroll the page. */}
        {backdrop && containerSize.width > 0 && (
          <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute left-1/2"
              style={{
                width: backdropRestSize,
                height: backdropRestSize,
                top: backdropCenterY,
                transform: `translate(-50%, -50%) scale(${backdropScale})`,
                // Recedes a little as it comes fully into view, so the reveal
                // content that lands on top of it stays the thing you read.
                opacity: lerp(1, 0.8, iconMorph),
              }}
            >
              {backdrop}
            </div>
          </div>
        )}

        {/* Intro copy — visible while the icons rest scattered, fades as scrolling begins */}
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <motion.h1
            animate={
              phase === "resting"
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
                phase === "resting"
                  ? { opacity: Math.max(1 - iconMorph * 2.4, 0), scale: 1 }
                  : { opacity: 0, scale: 0.96 }
              }
              transition={{ duration: 0.4 }}
              style={{ pointerEvents: phase === "resting" && iconMorph < 0.4 ? "auto" : "none" }}
              className="mt-5 max-w-sm text-sm md:text-base text-muted-foreground"
            >
              {introSubtitle}
            </motion.div>
          )}
          <motion.div
            animate={
              phase === "resting" ? { opacity: Math.max(1 - iconMorph * 3.2, 0) * 0.5 } : { opacity: 0 }
            }
            transition={{ duration: 0.4 }}
            // Live only while it's actually legible; once the morph is under
            // way this is an invisible box sitting over the revealed content.
            style={{ pointerEvents: phase === "resting" && iconMorph < 0.4 ? "auto" : "none" }}
            className="mt-8"
          >
            <button
              type="button"
              onClick={scrollToMorphEnd}
              className="flex flex-col items-center gap-2 group"
            >
              <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase transition-colors group-hover:text-foreground">
                {scrollHint}
              </span>
              <motion.span
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>
          </motion.div>
        </div>

        {/* Reveal content — fades in, in the same spot, as the ring closes.
            Stays pointer-events-none at the wrapper level (it's a full-screen
            inset-0 box with an explicit z-index, so an "auto" here would sit
            above and swallow hover/clicks over the icons anywhere on screen);
            only the actual interactive piece (children, e.g. the language
            dropdown) opts back into pointer events. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
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
              className={
                tightRing
                  ? "absolute left-0 right-0 flex justify-center px-6"
                  : "mt-4"
              }
              style={{
                pointerEvents: revealProgress > 0.5 ? "auto" : "none",
                // Anchored by its top edge just past the ring's lowest icon, so
                // the CTA clears the circle whatever height it happens to be.
                ...(tightRing
                  ? { top: `calc(50% + ${Math.round(circleRadius + iconSize / 2 + 28)}px)` }
                  : {}),
              }}
            >
              {children}
            </div>
          )}
        </motion.div>

        {/* Icons — purely decorative, must not intercept clicks meant for the
            intro/reveal content sitting in the gap between them */}
        <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
          {/* Held back until the container has been measured — an icon mounted
              against a 0x0 container would compute its entrance from the wrong
              geometry and fly in from the center. */}
          {containerSize.width > 0 && icons.map((item, i) => {
            // Where this icon rests before any scrolling: its scattered spot,
            // spread across the whole screen.
            const scatteredPos = positionToCenterOffset(
              item.className,
              containerSize.width,
              containerSize.height,
              iconSize
            );
            // ...and where it ends up once the user has scrolled: a slot on the
            // ring that closes around the revealed content.
            const ringAngle = (i / icons.length) * Math.PI * 2;
            const circlePos = {
              x: Math.cos(ringAngle) * circleRadius,
              y: Math.sin(ringAngle) * circleRadius,
            };

            // Scroll gathers the scattered icons into the ring, and unwinds back
            // out again on the way up.
            const target = {
              x: lerp(scatteredPos.x, circlePos.x, iconMorph),
              y: lerp(scatteredPos.y, circlePos.y, iconMorph),
            };

            const entrance = entrances[i];

            return (
              // Outer div: the resting/ring position, driven by scroll.
              // `initial={false}` so the first paint lands on the resting spot —
              // the entrance is a separate offset on the div below, which keeps
              // the flight in and the later scroll morph from fighting over the
              // same transform.
              // Middle div: the one-time flight in from offscreen.
              // Inner div: idle "alive" float + hover response.
              <motion.div
                key={item.id}
                initial={false}
                animate={{ x: target.x, y: target.y }}
                transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.6 }}
                className="absolute pointer-events-auto"
              >
                <motion.div
                  initial={{
                    x: entrance.offset.x,
                    y: entrance.offset.y,
                    scale: 0.88,
                    rotate: i % 2 === 0 ? -4 : 4,
                    opacity: 0,
                  }}
                  animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                  transition={{
                    default: {
                      delay: entrance.delay,
                      duration: travelDuration,
                      ease: ENTRANCE_EASE,
                    },
                    // Fades in over the first stretch of the flight, so an icon is
                    // already visible while travelling rather than materialising
                    // at the end of it.
                    opacity: {
                      delay: entrance.delay,
                      duration: travelDuration * 0.45,
                      ease: "easeOut",
                    },
                  }}
                >
                  <motion.div
                    animate={
                      phase === "resting"
                        ? { y: [0, -7, 0], rotate: [0, i % 2 === 0 ? 2 : -2, 0] }
                        : { y: 0, rotate: 0 }
                    }
                    transition={
                      phase === "resting"
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
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
