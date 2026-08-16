import * as React from "react";
// framer-motion, not the `motion` package the component shipped against: v12 of
// framer-motion exports the same LazyMotion/m API and is already a direct
// dependency here, so this avoids a second animation library in the bundle.
import { LazyMotion, domAnimation, m } from "framer-motion";

import { cn } from "@/lib/utils";

interface CardProps {
  number: string;
  title: string;
  description: string;
  colorTheme?: "orange" | "blue" | "purple";
  className?: string;
  rotate?: string;
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
  /** Makes the card pressable. Without it the card stays a plain, inert note. */
  onSelect?: () => void;
  actionLabel?: string;
}

const Pin = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
  </svg>
);

const Card = ({
  number,
  title,
  description,
  colorTheme = "blue",
  className,
  rotate,
  colors: customColors,
  onSelect,
  actionLabel,
}: CardProps) => {
  const defaultBgColors = {
    orange: "bg-orange-50 dark:bg-orange-500/10",
    blue: "bg-blue-50 dark:bg-blue-500/10",
    purple: "bg-purple-50 dark:bg-purple-500/10",
  };
  const defaultTextColors = {
    orange: "text-orange-500 dark:text-orange-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
  };
  const defaultBorderColors = {
    orange: "border-orange-100 dark:border-orange-500/20",
    blue: "border-blue-100 dark:border-blue-500/20",
    purple: "border-purple-100 dark:border-purple-500/20",
  };

  const bgColor = customColors?.bg || defaultBgColors[colorTheme];
  const textColor = customColors?.text || defaultTextColors[colorTheme];
  const borderColor = customColors?.border || defaultBorderColors[colorTheme];

  const note = (
    <div className="rounded-[25px] border border-neutral-100 bg-white p-2 shadow-[0px_10px_20px_0px_#D3D3D3] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
      {/* The margin of the note, above the coloured panel: the number written
          in the paper's own white space, with the pin still centred over it.
          The numeral is the site's own face in italic rather than the
          handwriting stack the component ships with — a marker-pen numeral is
          the one thing here that would read as borrowed. */}
      <div className="relative mb-3 flex items-center px-2 pt-1">
        <span
          className={`${textColor} text-4xl font-light italic leading-none tracking-tight`}
        >
          {number}
        </span>
        <Pin className={`absolute left-1/2 top-1 z-20 h-8 w-8 -translate-x-1/2 ${textColor}`} />
      </div>
      <div
        className={`${bgColor} border ${borderColor} rounded-[15px] p-[15px] h-full flex flex-col relative overflow-hidden text-left`}
      >
        <h3 className="mb-[10px] text-2xl font-semibold leading-none text-neutral-800 dark:text-neutral-100">
          {title}
        </h3>
        <p className="text-sm/5 tracking-tight text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );

  const box = cn(
    "relative w-full md:w-[280px] transition-transform duration-300 hover:z-30 hover:scale-105",
    rotate,
    className
  );

  if (!onSelect) return <div className={box}>{note}</div>;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={actionLabel ? `${title} — ${actionLabel}` : title}
      className={cn(
        box,
        "cursor-pointer text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "active:scale-[0.98] active:duration-150 md:rounded-[25px]"
      )}
    >
      {note}
    </button>
  );
};

export interface Step {
  title: string;
  description: string;
  colorTheme?: "orange" | "blue" | "purple";
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface StepPosition {
  className?: string;
  rotate?: string;
}

export interface HowItWorksProps {
  features?: Step[];
  className?: string;
  stepPositions?: StepPosition[];
  /** Called with the index of the step that was pressed. */
  onStepSelect?: (index: number, step: Step) => void;
  /** Appended to each card's accessible name, e.g. "start this step". */
  actionLabel?: string;
}

// Tailwind has no `rotate-8` in its default scale, so the tilts are arbitrary
// values — with the class names the component shipped with, the cards sat
// perfectly straight.
const DEFAULT_CARD_POSITIONS: StepPosition[] = [
  { className: "md:absolute md:top-0 md:left-[15%]", rotate: "rotate-[8deg]" },
  {
    className: "md:absolute md:top-[120px] md:right-[15%]",
    rotate: "rotate-[-8deg]",
  },
  { className: "md:absolute md:top-[450px] md:left-[15%]", rotate: "rotate-[8deg]" },
  {
    className: "md:absolute md:top-[570px] md:right-[10%]",
    rotate: "rotate-[-8deg]",
  },
  { className: "md:absolute md:top-[850px] md:left-[15%]", rotate: "rotate-[8deg]" },
];

export default function HowItWorks({
  features,
  className,
  stepPositions,
  onStepSelect,
  actionLabel,
}: HowItWorksProps) {
  const defaultFeatures: Step[] = [
    {
      title: "Create Account",
      description:
        "Sign up in minutes. Enter your details and verify your email to get started.",
      colorTheme: "orange",
    },
    {
      title: "Verify Identity",
      description:
        "Complete your profile verification to ensure secure transactions and compliance.",
      colorTheme: "blue",
    },
    {
      title: "Select Plan",
      description:
        "Choose from a variety of investment plans tailored to your financial goals.",
      colorTheme: "purple",
    },
    {
      title: "Analyze & Invest",
      description: "Review returns and make your first investment with confidence.",
      colorTheme: "orange",
    },
    {
      title: "Track Growth",
      description:
        "Monitor your portfolio in real-time and watch your wealth grow over time.",
      colorTheme: "blue",
    },
  ];

  const data = features && features.length > 0 ? features : defaultFeatures;
  const positions = stepPositions || DEFAULT_CARD_POSITIONS;

  let height = 1130;
  if (data.length === 1) height = 400;
  else if (data.length === 2) height = 450;
  else if (data.length === 3) height = 800;
  else if (data.length === 4) height = 900;
  else height = 1130;

  return (
    <LazyMotion features={domAnimation}>
      <div
        className={cn(
          "relative bg-white px-8 max-md:pt-10 max-md:pb-[100px] md:py-20 dark:bg-black",
          className
        )}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08] dark:opacity-[0.15]"
          style={{
            backgroundImage: "linear-gradient(#000 1px, transparent 1px)",
            backgroundSize: "100% 32px",
            marginTop: "4px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-[0.1]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "100% 32px",
            marginTop: "4px",
          }}
        />
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className="relative w-full max-w-[1000px] mx-auto flex flex-col space-y-8 md:space-y-0 md:block h-auto md:h-[var(--md-height)]"
            style={{ "--md-height": `${height}px` } as React.CSSProperties}
          >
            {data.length > 1 && (
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block z-0"
                viewBox={`0 0 1000 ${height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {(() => {
                  const pathD = data.reduce((acc, _, index) => {
                    if (index >= data.length - 1) return acc;
                    if (index === 0) return "M 290 150 C 500 150, 550 270, 710 270"; // 1 -> 2
                    if (index === 1) return acc + " C 850 270, 500 350, 290 450"; // 2 -> 3
                    if (index === 2) return acc + " C 290 600, 550 720, 750 720"; // 3 -> 4
                    if (index === 3) return acc + " C 950 720, 500 800, 290 850"; // 4 -> 5
                    return acc;
                  }, "");
                  return (
                    <m.path
                      d={pathD}
                      stroke="currentColor"
                      className="text-neutral-300 dark:text-neutral-700"
                      strokeWidth="2"
                      strokeDasharray="8 6"
                      fill="none"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{
                        strokeDashoffset: -140, // Multiple of 14 (8+6) for seamless loop
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  );
                })()}
              </svg>
            )}

            {data.map((step, index) => {
              const position = positions[index % positions.length];

              return (
                <Card
                  key={step.title}
                  number={`0${index + 1}`}
                  title={step.title}
                  description={step.description}
                  colorTheme={step.colorTheme || "blue"}
                  colors={step.colors}
                  rotate={position.rotate}
                  className={position.className}
                  onSelect={onStepSelect ? () => onStepSelect(index, step) : undefined}
                  actionLabel={actionLabel}
                />
              );
            })}
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}
