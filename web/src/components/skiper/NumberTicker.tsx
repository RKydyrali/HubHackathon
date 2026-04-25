import {
  animate,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type NumberTickerProps = {
  value: number;
  className?: string;
  durationSeconds?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  startOnView?: boolean;
};

export function NumberTicker({
  value,
  className,
  durationSeconds = 1.6,
  prefix = "",
  suffix = "",
  decimals = 0,
  startOnView = true,
}: NumberTickerProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (latest) => {
    const n = decimals === 0 ? Math.round(latest) : Number(latest.toFixed(decimals));
    return `${prefix}${new Intl.NumberFormat("ru-RU").format(n)}${suffix}`;
  });

  useEffect(() => {
    if (reduceMotion) {
      mv.set(value);
      return;
    }
    if (startOnView && !inView) return;
    const controls = animate(mv, value, {
      duration: durationSeconds,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, durationSeconds, mv, inView, startOnView, reduceMotion]);

  useEffect(() => {
    return formatted.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [formatted]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {`${prefix}0${suffix}`}
    </span>
  );
}
