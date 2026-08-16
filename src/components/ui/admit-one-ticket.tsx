import * as React from "react";
import { motion, type Transition } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * A cinema-style "admit one" ticket, drawn rather than imported: the die-cut
 * silhouette (concave corners, a notch either side of the perforation) is a
 * single SVG path, the paper is a gradient with a light bloom and a grain
 * filter over it, and the type sits on top in HTML.
 *
 * Everything scales from one number — the element's own width — via container
 * query units, so the ticket is the same drawing at 320px and at 900px and
 * nothing needs a breakpoint.
 */

/** The ticket's drawing space. Its aspect ratio is fixed; only the scale changes. */
const W = 1600;
const H = 980;
/** Radius of the concave bite taken out of each corner. */
const CORNER = 44;
/** Radius of the half-circle notch at each end of the perforation. */
const NOTCH = 34;
/** Where the stub is torn off, in drawing units. */
const PERFORATION = 1168;

const ticketPath = [
  `M ${CORNER} 0`,
  `H ${PERFORATION - NOTCH}`,
  `A ${NOTCH} ${NOTCH} 0 0 0 ${PERFORATION + NOTCH} 0`,
  `H ${W - CORNER}`,
  `A ${CORNER} ${CORNER} 0 0 0 ${W} ${CORNER}`,
  `V ${H - CORNER}`,
  `A ${CORNER} ${CORNER} 0 0 0 ${W - CORNER} ${H}`,
  `H ${PERFORATION + NOTCH}`,
  `A ${NOTCH} ${NOTCH} 0 0 0 ${PERFORATION - NOTCH} ${H}`,
  `H ${CORNER}`,
  `A ${CORNER} ${CORNER} 0 0 0 0 ${H - CORNER}`,
  `V ${CORNER}`,
  `A ${CORNER} ${CORNER} 0 0 0 ${CORNER} 0`,
  "Z",
].join(" ");

export interface AdmitOneTicketProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small line above the name, e.g. "VILLAORO PRESENTS". */
  eyebrow?: string;
  /** Second small line, e.g. "MEMBER ACCESS 2026". */
  subEyebrow?: string;
  /** The headline: the member's name. Wraps to a second line on a space. */
  name: string;
  /** The line along the bottom edge, e.g. "PRIVATE CATALOG · 16 AUG 2026". */
  footnote?: string;
  /** Rotated label down the stub. */
  admitLabel?: string;
  /** Oversized ghost numerals behind the stub label. */
  year?: string;
  /** Paper colour, the deeper tone it falls to, and the tone the flare washes it with. */
  paperColor?: string;
  paperShade?: string;
  paperHighlight?: string;
  /** Colour of the printed type. */
  inkColor?: string;
}

export const AdmitOneTicket = React.forwardRef<HTMLDivElement, AdmitOneTicketProps>(
  function AdmitOneTicket(
    {
      eyebrow,
      subEyebrow,
      name,
      footnote,
      admitLabel = "ADMIT ONE",
      year,
      paperColor = "#E8622A",
      paperShade = "#DC5320",
      paperHighlight = "#F8C39C",
      inkColor = "#3B2114",
      className,
      style,
      ...divProps
    },
    ref
  ) {
    // Two instances on one page would otherwise share gradient/filter ids and
    // the second would silently take the first's paint.
    const uid = React.useId().replace(/:/g, "");

    return (
      <div
        ref={ref}
        className={cn("relative w-full select-none", className)}
        style={{
          aspectRatio: `${W} / ${H}`,
          containerType: "inline-size",
          color: inkColor,
          // On the shape rather than the box: the paper is die-cut, so its
          // shadow has to be too.
          filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.20))",
          ...style,
        }}
        {...divProps}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <clipPath id={`${uid}-shape`}>
              <path d={ticketPath} />
            </clipPath>
            {/* Every stop is opaque: a translucent one would let the paper's
                own drop shadow show through and grey the stock out. */}
            <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor={paperColor} />
              <stop offset="60%" stopColor={paperColor} />
              <stop offset="100%" stopColor={paperShade} />
            </linearGradient>
            <radialGradient id={`${uid}-bloom`}>
              <stop offset="0%" stopColor={paperHighlight} stopOpacity="0.95" />
              <stop offset="100%" stopColor={paperHighlight} stopOpacity="0" />
            </radialGradient>
            {/* Print grain: monochrome noise laid over the paper. */}
            <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="3"
                stitchTiles="stitch"
                result="noise"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>

          {/* isolation keeps the grain's blend inside the ticket: without it,
              overlay would reach the page behind and halo the die-cut edges. */}
          <g clipPath={`url(#${uid}-shape)`} style={{ isolation: "isolate" }}>
            <rect width={W} height={H} fill={`url(#${uid}-paper)`} />
            {/* The light streak running off the top edge of the stock. */}
            <ellipse
              cx={W * 0.44}
              cy={-H * 0.05}
              rx={W * 0.1}
              ry={H * 0.44}
              fill={`url(#${uid}-bloom)`}
              opacity="0.62"
              transform={`rotate(-34 ${W * 0.44} ${-H * 0.05})`}
            />
            <ellipse
              cx={W * 0.74}
              cy={H * 1.12}
              rx={W * 0.2}
              ry={H * 0.3}
              fill={`url(#${uid}-bloom)`}
              opacity="0.38"
            />
            <rect
              width={W}
              height={H}
              filter={`url(#${uid}-grain)`}
              opacity="0.3"
              style={{ mixBlendMode: "overlay" }}
            />
            {/* Perforation. */}
            <line
              x1={PERFORATION}
              y1={NOTCH + 8}
              x2={PERFORATION}
              y2={H - NOTCH - 8}
              stroke={inkColor}
              strokeOpacity="0.4"
              strokeWidth="3"
              strokeDasharray="14 16"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* Type sits in HTML so it can reflow around a long name. */}
        <div className="absolute inset-0 flex">
          <div
            className="flex flex-col justify-between py-[7.5cqw] pl-[8.5cqw] pr-[3cqw]"
            style={{ width: `${(PERFORATION / W) * 100}%` }}
          >
            <div className="text-[2.45cqw] font-semibold uppercase leading-[1.5] tracking-[0.1em]">
              {eyebrow && <div>{eyebrow}</div>}
              {subEyebrow && <div>{subEyebrow}</div>}
            </div>

            <h2 className="text-[8.4cqw] font-medium uppercase leading-[0.96] tracking-[-0.02em] break-words">
              {name}
            </h2>

            {footnote && (
              <div className="text-[2.55cqw] font-semibold uppercase tracking-[0.055em]">
                {footnote}
              </div>
            )}
          </div>

          {/* Stub: rotated label over ghost numerals. */}
          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{ width: `${((W - PERFORATION) / W) * 100}%` }}
          >
            {year && (
              <span
                className="absolute font-semibold leading-none tracking-[-0.03em]"
                style={{
                  fontSize: "15cqw",
                  color: paperHighlight,
                  opacity: 0.45,
                  writingMode: "vertical-rl",
                }}
              >
                {year}
              </span>
            )}
            <span
              className="relative font-semibold leading-none tracking-[0.01em]"
              style={{ fontSize: "6.2cqw", writingMode: "vertical-rl" }}
            >
              {admitLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export interface TicketPrinterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The ticket (or anything else) being fed out of the slot. */
  children: React.ReactNode;
  /** Seconds the sheet takes to clear the slot. */
  duration?: number;
  /** Skip the feed entirely and present the ticket already printed. */
  reduceMotion?: boolean;
  /** Called once the sheet is fully out. */
  onPrinted?: () => void;
  /** Wordmark on the printer's face, next to its ready light. */
  label?: string;
}

/**
 * The device the ticket comes out of: a dark body with a slot, and beneath it
 * a window the sheet is fed through. The sheet is a rigid card sliding
 * straight down, so its leading (bottom) edge clears the slot first and the
 * headline is the last thing to appear — the way a real ticket arrives.
 *
 * It advances in bursts with micro-pauses between them rather than gliding,
 * because a continuous slide reads as an animation and a stepped one reads as
 * a machine.
 */
export const TicketPrinter = React.forwardRef<HTMLDivElement, TicketPrinterProps>(
  function TicketPrinter(
    { children, duration = 3.1, reduceMotion = false, onPrinted, label, className, ...divProps },
    ref
  ) {
    // Four feed bursts, each followed by a beat where the sheet holds still.
    const strokes = ["-100%", "-74%", "-72%", "-46%", "-44%", "-20%", "-18%", "0%"];
    const feed: Transition = reduceMotion
      ? { duration: 0.4, ease: "easeOut" }
      : {
          duration,
          ease: "linear",
          times: [0, 0.2, 0.28, 0.48, 0.56, 0.76, 0.84, 1],
        };

    return (
      <div ref={ref} className={cn("relative w-full", className)} {...divProps}>
        {/* Printer body. */}
        <div
          className="relative z-20 bg-[#1b1b1d] px-[4%] pb-[2.6%] pt-[4.4%]"
          style={{
            borderRadius: "22px 22px 10px 10px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div className="mx-auto flex items-center gap-[3%]">
            <span className="h-[6px] w-[6px] rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            {label && (
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
                {label}
              </span>
            )}
          </div>
          {/* Slot. */}
          <div
            className="mt-[3.5%] h-[7px] w-full rounded-full bg-black"
            style={{ boxShadow: "inset 0 2px 3px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.06)" }}
          />
        </div>

        {/* Feed window: the sheet is clipped to whatever has left the slot.
            The window is bled out sideways and below — and pulled back by the
            same amount — so the paper's own shadow has somewhere to fall
            without the clip cutting it off, while the layout is unchanged. */}
        <div className="relative z-10 -mx-[12%] -mb-[16%] overflow-hidden px-[12%] pb-[16%]">
          <div className="relative">
            <motion.div
              // Reduced motion gets no feed at all, not a shorter one: the
              // ticket is simply already printed.
              initial={{ y: reduceMotion ? "0%" : "-100%" }}
              animate={{ y: reduceMotion ? "0%" : strokes }}
              transition={feed}
              onAnimationComplete={onPrinted}
            >
              {children}
            </motion.div>

            {/* The slot's shadow falling across the paper as it emerges. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[9%] bg-gradient-to-b from-black/30 to-transparent" />
          </div>
        </div>
      </div>
    );
  }
);

export default AdmitOneTicket;
