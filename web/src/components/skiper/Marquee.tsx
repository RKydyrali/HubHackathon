import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  reverse?: boolean;
  durationSeconds?: number;
  edgeFade?: boolean;
};

export function Marquee({
  children,
  className,
  pauseOnHover = true,
  reverse = false,
  durationSeconds = 28,
  edgeFade = true,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group/marquee relative flex w-full overflow-hidden",
        edgeFade &&
          "[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]",
        className,
      )}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden={i === 1 ? true : undefined}
          className={cn(
            "flex min-w-full shrink-0 items-center gap-3 will-change-transform",
            reverse ? "animate-[marquee-reverse_var(--marquee-duration)_linear_infinite]"
                    : "animate-[marquee_var(--marquee-duration)_linear_infinite]",
            pauseOnHover && "group-hover/marquee:[animation-play-state:paused]",
          )}
          style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
