import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The layout and motion primitives every page is assembled from.
 *
 * The point of these is not to save typing — it's that "how wide is the page",
 * "how much air goes above a section" and "how does content arrive" become
 * decisions made once, here, instead of decisions re-made slightly differently
 * on each screen. That consistency is most of what separates a set of pages
 * from a product.
 */

/* ---------------------------------------------------------------- Shell --
 * The page's measure and gutter. `bleed` opts out of the max-width for things
 * that should run the full window (a grid of imagery, a marquee) while still
 * keeping the gutter, so their edges line up with contained content above.
 */
export const Shell = ({
  as: Tag = "div",
  bleed = false,
  className,
  children,
  ...rest
}: {
  as?: React.ElementType;
  bleed?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) => (
  <Tag className={cn(bleed ? "shell-wide" : "shell", className)} {...rest}>
    {children}
  </Tag>
);

/* -------------------------------------------------------------- Section --
 * Vertical rhythm comes in three sizes and nothing else. `sm` for a strip that
 * belongs to its neighbour, `md` for the default, `lg` for a section that
 * should feel like a new chapter.
 */
export const Section = ({
  size = "md",
  bleed = false,
  bordered = false,
  className,
  innerClassName,
  children,
  ...rest
}: {
  size?: "sm" | "md" | "lg" | "none";
  bleed?: boolean;
  bordered?: boolean;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) => (
  <section
    className={cn(
      size === "sm" && "section-sm",
      size === "md" && "section-md",
      size === "lg" && "section-lg",
      bordered && "hairline-t",
      className
    )}
    {...rest}
  >
    <Shell bleed={bleed} className={innerClassName}>
      {children}
    </Shell>
  </section>
);

/* --------------------------------------------------------------- Eyebrow --
 * The mono micro-label. Optionally numbered, which is what makes a run of
 * sections read as a sequence rather than a list.
 */
export const Eyebrow = ({
  index,
  className,
  children,
}: {
  index?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <p className={cn("eyebrow flex items-center gap-2", className)}>
    {index && (
      <>
        <span className="text-ink/25 tabular-nums">{index}</span>
        <span aria-hidden className="h-px w-6 bg-ink/15" />
      </>
    )}
    {children}
  </p>
);

/* --------------------------------------------------------- SectionHeading --
 * Eyebrow, headline, optional lead, optional trailing action — the one header
 * pattern, so every section on every page opens the same way. The action sits
 * beside the headline on desktop and drops below it on mobile, where a
 * right-aligned control would otherwise crowd the title.
 */
export const SectionHeading = ({
  eyebrow,
  eyebrowIndex,
  title,
  lead,
  action,
  align = "start",
  className,
}: {
  eyebrow?: React.ReactNode;
  eyebrowIndex?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  action?: React.ReactNode;
  align?: "start" | "center";
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
      align === "center" && "md:flex-col md:items-center text-center",
      className
    )}
  >
    <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
      {eyebrow && (
        <Eyebrow index={eyebrowIndex} className={cn("mb-4", align === "center" && "justify-center")}>
          {eyebrow}
        </Eyebrow>
      )}
      <h2 className="type-h2">{title}</h2>
      {lead && <p className="type-lead mt-4">{lead}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/* ---------------------------------------------------------------- Reveal --
 * Content arrives once, on the way in, and never again — re-animating on the
 * way back up is what makes a page feel like a demo. 24px and a fade on the
 * quint curve: enough to register as movement, not enough to make scrolling
 * feel like it's dragging the layout behind it.
 *
 * `delay` staggers siblings; keep it under ~0.24s total or the last item in a
 * row arrives after the eye has already moved on.
 */
export const Reveal = ({
  delay = 0,
  y = 24,
  className,
  children,
  ...rest
}: {
  delay?: number;
  y?: number;
  className?: string;
  children: React.ReactNode;
} & React.ComponentProps<typeof motion.div>) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{
        duration: reduce ? 0.2 : 0.7,
        delay: reduce ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

/** Stagger container for a list of Reveals that should cascade. */
export const revealStagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
};

/* --------------------------------------------------------------- Marquee --
 * An infinite ticker. The children are rendered twice and the pair is
 * translated by exactly half its width, so the seam never lands mid-item
 * whatever the content length. Duplicate copy is hidden from screen readers.
 */
export const Marquee = ({
  speed = 40,
  gap = "3rem",
  className,
  children,
}: {
  speed?: number;
  gap?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn("marquee", className)}
    style={
      {
        "--marquee-duration": `${speed}s`,
        "--marquee-gap": gap,
      } as React.CSSProperties
    }
  >
    <div className="marquee-track">{children}</div>
    <div className="marquee-track" aria-hidden>
      {children}
    </div>
  </div>
);

/* ------------------------------------------------------------ EmptyState --
 * Every "there's nothing here" in the app looks like this: a mono label, a
 * plain explanation of why, and — importantly — the action that resolves it.
 * An empty state without a way out is a dead end.
 */
export const EmptyState = ({
  icon,
  label,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  label?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col items-center justify-center px-6 py-24 text-center", className)}>
    {icon && (
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border-hairline border-ink/15 text-ink/40">
        {icon}
      </div>
    )}
    {label && <p className="eyebrow mb-3">{label}</p>}
    <h3 className="type-h3 max-w-sm">{title}</h3>
    {description && <p className="type-body mt-3 max-w-sm text-ink/60">{description}</p>}
    {action && <div className="mt-8">{action}</div>}
  </div>
);
