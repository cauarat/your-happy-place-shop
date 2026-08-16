import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/marquee-01-utils/marquee";
import { cn } from "@/lib/utils";

export interface Testimonial {
  /** Who said it. */
  name: string;
  /** The line under the name — city, membership, whatever identifies them. */
  meta: string;
  /** What they said. */
  body: string;
}

const TestimonialCard = ({ name, meta, body }: Testimonial) => (
  <Card className="h-full w-[280px] shrink-0 rounded-2xl border-black/[0.06] bg-white p-5 shadow-none sm:w-[320px]">
    <CardContent className="flex flex-col gap-3 p-0">
      <div className="flex flex-col">
        <p className="text-[13px] font-medium text-black">{name}</p>
        <p className="text-[12px] text-zinc-400">{meta}</p>
      </div>
      <p className="text-[14px] leading-relaxed text-zinc-600">{body}</p>
    </CardContent>
  </Card>
);

export interface TestimonialMarqueeProps {
  testimonials: Testimonial[];
  className?: string;
}

/**
 * Two belts of quotes travelling in opposite directions, faded out at both
 * edges so they read as a continuous strip rather than a list that happens to
 * be cut off. Hovering holds whichever belt the pointer is on, so a quote can
 * actually be read.
 */
export default function TestimonialMarquee({ testimonials, className }: TestimonialMarqueeProps) {
  // Both belts carry every quote, the lower one starting halfway through the
  // list. Splitting them in half instead would put three cards on a belt wide
  // enough to show four, and the same face would be on screen twice.
  const half = Math.ceil(testimonials.length / 2);
  const firstRow = testimonials;
  const secondRow = [...testimonials.slice(half), ...testimonials.slice(0, half)];

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden",
        className
      )}
    >
      <Marquee pauseOnHover className="[--duration:36s]">
        {firstRow.map((item, i) => (
          <TestimonialCard key={`${item.name}-${i}`} {...item} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="[--duration:36s]">
        {secondRow.map((item, i) => (
          <TestimonialCard key={`${item.name}-${i}`} {...item} />
        ))}
      </Marquee>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
