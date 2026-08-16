import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /** Reverse the direction of travel. */
  reverse?: boolean;
  /** Hold the belt still while the pointer is over it. */
  pauseOnHover?: boolean;
  /** Run top-to-bottom instead of left-to-right. */
  vertical?: boolean;
  /** How many times the children are repeated to close the loop. */
  repeat?: number;
  children: React.ReactNode;
}

/**
 * An endless belt of content. The children are rendered `repeat` times and the
 * whole row is translated by exactly one copy's width, so the seam lands where
 * the first copy started and the loop is invisible.
 *
 * Pace is set per instance with the `--duration` custom property (e.g.
 * `className="[--duration:40s]"`) and the space between items with `--gap`.
 */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  children,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
            "animate-marquee flex-row": !vertical,
            "animate-marquee-vertical flex-col": vertical,
            "group-hover:[animation-play-state:paused]": pauseOnHover,
            "[animation-direction:reverse]": reverse,
          })}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export default Marquee;
