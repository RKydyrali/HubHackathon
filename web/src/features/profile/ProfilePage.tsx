import { useQuery } from "convex/react";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { ProfileEditor } from "./ProfileEditor";
import { ProfileMockInterviewsSection } from "./ProfileMockInterviewsSection";
import { ResumeProfileAiHelper } from "./ResumeProfileAiHelper";
import { Link } from "react-router-dom";

export function ProfilePage() {
  const profile = useQuery(api.profiles.getMyProfile);
  const { copy } = useI18n();

  return (
    <>
      <PageHeader title={copy.profile.title} subtitle={copy.profile.subtitle} />
      <div className="container-app space-y-8 py-5">
        {profile === undefined ? (
          <LoadingSkeleton variant="form" />
        ) : (
          <>
            <SectionPanel title={copy.interviewTrainer.ctaFromProfileTitle}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.interviewTrainer.ctaFromProfileBody}
                </p>
                <Link to="/interview-trainer" className="shrink-0">
                  <Button type="button">{copy.interviewTrainer.openCta}</Button>
                </Link>
              </div>
            </SectionPanel>
            <ResumeProfileAiHelper profile={profile} />
            <ProfileEditor profile={profile} />
            <ProfileMockInterviewsSection />
          </>
        )}
      </div>
    </>
  );
}
