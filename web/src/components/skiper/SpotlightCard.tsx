import { useRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  borderGradient?: boolean;
};

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(99, 102, 241, 0.18)",
  borderGradient = true,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--mx", `-9999px`);
        el.style.setProperty("--my", `-9999px`);
      }}
      className={cn(
        "group/spotlight relative isolate overflow-hidden rounded-[1.5rem] transition-transform",
        className,
      )}
      style={{ ["--spot" as string]: spotlightColor } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--mx, -9999px) var(--my, -9999px), var(--spot), transparent 60%)",
        }}
      />
      {borderGradient && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
          style={{
            background:
              "radial-gradient(360px circle at var(--mx, -9999px) var(--my, -9999px), rgba(99,102,241,0.45), transparent 55%)",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "1px",
          }}
        />
      )}
      {children}
    </div>
  );
}
