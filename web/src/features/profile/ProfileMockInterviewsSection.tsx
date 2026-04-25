import { useQuery } from "convex/react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { Badge } from "@/components/shared/Badge";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";

export function ProfileMockInterviewsSection() {
  const { copy } = useI18n();
  const mc = copy.mockInterview;
  const rows = useQuery(api.coach.listMyMockInterviewSessions);

  if (rows === undefined) {
    return (
      <SectionPanel title={copy.profile.myMockInterviews}>
        <LoadingSkeleton variant="rows" />
      </SectionPanel>
    );
  }

  const completed = rows.filter(({ session }) => session.status === "completed");

  return (
    <SectionPanel title={copy.profile.myMockInterviews}>
      {completed.length === 0 ? (
        <p className="text-sm text-muted-foreground">{mc.noCompleted}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {completed.map(({ session, vacancy }) => (
            <li
              key={session._id}
              className="rounded-2xl border bg-background/70 p-4 text-sm leading-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-foreground">
                  {vacancy?.title ?? mc.openVacancy}
                </p>
                {session.finalScore != null ? (
                  <Badge tone="muted">
                    {mc.score}: {session.finalScore}
                  </Badge>
                ) : null}
              </div>
              {vacancy ? (
                <Link
                  to={`/vacancies/${vacancy._id}`}
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  {mc.openVacancy}
                </Link>
              ) : null}
              {session.hiringRecommendation ? (
                <p className="mt-3 text-muted-foreground">
                  <span className="font-medium text-foreground">{mc.recommendation}: </span>
                  {session.hiringRecommendation}
                </p>
              ) : null}
              {session.strengths?.length ? (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {mc.strengths}
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {session.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {session.improvements?.length ? (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {mc.improvements}
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {session.improvements.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionPanel>
  );
}
