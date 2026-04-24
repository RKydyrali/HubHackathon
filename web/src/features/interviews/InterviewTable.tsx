import { Table, type Column } from "@/components/shared/Table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EMPTY_STATES, formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Interview } from "@/types/domain";

export function InterviewTable({ interviews }: { interviews: Interview[] }) {
  const { copy, locale } = useI18n();
  const columns: Column<Interview>[] = [
    { key: "time", header: copy.interviews.scheduledAt, cell: (interview) => formatAbsoluteDate(interview.scheduledAt) },
    { key: "location", header: copy.interviews.location, cell: (interview) => interview.locationOrLink ?? "Not set" },
    { key: "status", header: "Status", cell: (interview) => <StatusBadge status={interview.status} locale={locale} /> },
  ];
  return <Table columns={columns} data={interviews} empty={EMPTY_STATES.interviews} getKey={(interview) => interview._id} />;
}
