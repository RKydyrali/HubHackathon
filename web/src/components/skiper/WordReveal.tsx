import { motion, useReducedMotion } from "framer-motion";
import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type WordRevealProps = {
  text: string;
  as?: ElementType;
  className?: string;
  wordClassName?: string;
  highlight?: string[];
  highlightClassName?: string;
  delay?: number;
  prefix?: ReactNode;
};

export function WordReveal({
  text,
  as: Tag = "span",
  className,
  wordClassName,
  highlight = [],
  highlightClassName = "bg-gradient-to-r from-primary via-secondary-accent to-primary bg-clip-text text-transparent [background-size:200%_100%] animate-[gradient-pan_6s_ease_infinite]",
  delay = 0,
  prefix,
}: WordRevealProps) {
  const reduceMotion = useReducedMotion();
  const words = text.split(/(\s+)/);

  return (
    <Tag aria-label={text} className={className}>
      {prefix}
      <span aria-hidden className="inline">
        {words.map((word, i) => {
          if (/^\s+$/.test(word)) {
            return (
              <span key={`s-${i}`} className="inline-block">
                {"\u00A0"}
              </span>
            );
          }
          const isHighlighted = highlight.some((h) =>
            word.toLowerCase().includes(h.toLowerCase()),
          );
          return (
            <motion.span
              key={`w-${i}`}
              className={cn(
                "inline-block whitespace-pre will-change-transform",
                wordClassName,
                isHighlighted && highlightClassName,
              )}
              initial={reduceMotion ? false : { opacity: 0, y: "0.6em", filter: "blur(8px)" }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: delay + i * 0.045,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {word}
            </motion.span>
          );
        })}
      </span>
    </Tag>
  );
}
