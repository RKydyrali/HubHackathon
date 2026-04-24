import { useQuery } from "convex/react";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { ProfileEditor } from "./ProfileEditor";

export function ProfilePage() {
  const profile = useQuery(api.profiles.getMyProfile);
  const { copy } = useI18n();

  return (
    <>
      <PageHeader title={copy.profile.title} subtitle={copy.profile.subtitle} />
      <div className="container-app py-5">
        {profile === undefined ? <LoadingSkeleton variant="form" /> : <ProfileEditor profile={profile} />}
      </div>
    </>
  );
}
