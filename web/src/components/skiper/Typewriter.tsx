import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type TypewriterProps = {
  text: string;
  className?: string;
  caretClassName?: string;
  speedMs?: number;
  startDelayMs?: number;
  startOnView?: boolean;
};

export function Typewriter({
  text,
  className,
  caretClassName,
  speedMs = 22,
  startDelayMs = 200,
  startOnView = true,
}: TypewriterProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const [out, setOut] = useState(reduceMotion ? text : "");

  useEffect(() => {
    if (reduceMotion) {
      setOut(text);
      return;
    }
    if (startOnView && !inView) return;

    let cancelled = false;
    let i = 0;
    setOut("");
    const startTimer = window.setTimeout(function tick() {
      if (cancelled) return;
      i += 1;
      setOut(text.slice(0, i));
      if (i < text.length) {
        window.setTimeout(tick, speedMs);
      }
    }, startDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [text, speedMs, startDelayMs, inView, startOnView, reduceMotion]);

  return (
    <span ref={ref} className={cn("inline", className)} aria-label={text}>
      <span aria-hidden>{out}</span>
      {!reduceMotion && (
        <span
          aria-hidden
          className={cn(
            "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[3px] bg-primary align-baseline",
            "animate-[caret-blink_1.05s_steps(2,end)_infinite]",
            caretClassName,
          )}
        />
      )}
    </span>
  );
}
