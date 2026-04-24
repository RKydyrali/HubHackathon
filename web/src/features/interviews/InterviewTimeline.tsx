import type { Interview } from "@/types/domain";
import { InterviewRow } from "./InterviewRow";

export function InterviewTimeline({ interviews }: { interviews: Interview[] }) {
  return (
    <div className="surface-card overflow-hidden rounded-2xl">
      {interviews.map((interview) => <InterviewRow key={interview._id} interview={interview} />)}
    </div>
  );
}
