import type { ReactNode } from "react";

export function SplitPane({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-9rem)] grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_460px] md:gap-0 md:p-0">
      <div className="min-w-0">{left}</div>
      <div className="hidden md:block">{right}</div>
    </div>
  );
}
