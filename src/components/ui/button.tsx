import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The system's button, wearing shadcn's API. Every call site in the app keeps
// working — variant and size names are unchanged — but they now all render the
// pill: mono uppercase label, hairline border, one transition curve. See the
// control section of src/index.css.
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-full font-mono uppercase tracking-[0.12em] font-medium",
    "border-hairline border-transparent",
    "transition-[background-color,border-color,color,opacity] duration-base ease-sine",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline",
    "disabled:pointer-events-none disabled:bg-ink/[0.04] disabled:text-ink/25 disabled:border-transparent",
    "[&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-ink text-paper hover:bg-ink/[0.82]",
        destructive: "bg-critical text-paper hover:bg-critical/85",
        outline: "border-ink/30 text-ink hover:border-ink",
        secondary: "bg-surface-sunken text-ink hover:bg-ink/10",
        ghost: "text-ink/60 hover:bg-ink/5 hover:text-ink",
        link: "text-ink underline-offset-4 hover:underline tracking-normal normal-case font-sans",
      },
      size: {
        // Asymmetric vertical padding: uppercase mono sits high in its box and
        // optically centres low without it.
        default: "text-[11px] leading-none px-7 pt-[15px] pb-3.5",
        sm: "text-[10px] leading-none px-[1.125rem] pt-[11px] pb-2.5",
        lg: "text-xs leading-none px-9 pt-[19px] pb-[18px]",
        icon: "h-10 w-10 p-0 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
