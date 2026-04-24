import { StatusBadge } from "@/components/shared/StatusBadge";
import { Row } from "@/components/shared/Row";
import { formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Interview } from "@/types/domain";

export function InterviewRow({ interview }: { interview: Interview }) {
  const { locale } = useI18n();
  return (
    <Row
      title={formatAbsoluteDate(interview.scheduledAt)}
      meta={interview.locationOrLink ?? "Location not set"}
      aside={<StatusBadge status={interview.status} locale={locale} />}
    />
  );
}
