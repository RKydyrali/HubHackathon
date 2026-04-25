import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type AuroraBackgroundProps = {
  className?: string;
};

export function AuroraBackground({ className }: AuroraBackgroundProps) {
  const reduceMotion = useReducedMotion();

  const blob = (extra: string, animate: Record<string, number[] | string[]>, delay = 0) => (
    <motion.div
      aria-hidden
      className={cn("absolute rounded-full blur-3xl will-change-transform", extra)}
      initial={false}
      animate={reduceMotion ? undefined : animate}
      transition={{
        duration: 18,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "mirror",
        delay,
      }}
    />
  );

  return (
    <div className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      {blob(
        "left-[-10rem] top-[-12rem] size-[34rem] bg-primary/18",
        { x: [0, 60, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.05, 0.98, 1] },
      )}
      {blob(
        "right-[-12rem] top-24 size-[36rem] bg-success/14",
        { x: [0, -40, 30, 0], y: [0, 20, -20, 0], scale: [1, 1.04, 0.97, 1] },
        2,
      )}
      {blob(
        "bottom-[-18rem] left-1/4 size-[36rem] bg-warning/12",
        { x: [0, 50, -30, 0], y: [0, -25, 15, 0], scale: [1, 1.06, 0.99, 1] },
        4,
      )}
      {blob(
        "right-1/3 top-1/2 size-[24rem] bg-secondary-accent/14",
        { x: [0, -30, 20, 0], y: [0, 30, -10, 0], scale: [1, 1.08, 1, 1] },
        6,
      )}
      <div className="absolute inset-0 woven-grid opacity-60" />
      <div
        className="absolute inset-0 mix-blend-overlay opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
