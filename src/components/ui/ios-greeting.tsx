"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IOSGreetingProps {
  text: string;
  className?: string;
  speed?: number;
}

export function IOSGreeting({ text, className, speed = 1 }: IOSGreetingProps) {
  // Split text into words to animate them sequentially
  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06 / speed,
        delayChildren: 0.1,
      },
    },
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 120,
      },
    },
    hidden: {
      opacity: 0,
      y: 10,
      filter: "blur(8px)",
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 120,
      },
    },
  };

  return (
    <motion.div
      className={cn("flex flex-wrap items-center justify-center font-medium tracking-tight", className)}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <span key={index} className="inline-flex mr-[0.25em] pb-1">
          <motion.span variants={child} className="inline-block">
            {word}
          </motion.span>
        </span>
      ))}
    </motion.div>
  );
}
