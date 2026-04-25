import { UserCircle } from "@phosphor-icons/react";

import { MatchMeter } from "@/components/product/MatchMeter";
import { cn } from "@/lib/utils";

type SeekerMatch = {
  matchScore: number;
  profile: {
    _id: string;
    fullName?: string;
    city?: string;
    skills?: string[];
  };
};

export function SeekerMatchList({
  matches,
  className,
}: {
  matches: SeekerMatch[];
  className?: string;
}) {
  if (!matches.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {matches.map((m) => {
        const name = m.profile.fullName?.trim() || "Candidate";
        const city = m.profile.city?.trim() || "";
        const skills = (m.profile.skills ?? []).filter(Boolean).slice(0, 3);
        return (
          <div
            key={`${m.profile._id}-${m.matchScore}`}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <UserCircle className="size-5 shrink-0 text-primary" weight="bold" />
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{city || "—"}</p>
              {skills.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="sm:pl-4">
              <MatchMeter value={m.matchScore} compact />
            </div>
          </div>
        );
      })}
    </div>
  );
}

