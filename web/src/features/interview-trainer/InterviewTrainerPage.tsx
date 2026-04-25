import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { useI18n } from "@/lib/i18n";
import { CommonInterviewQuestionsTrainer } from "./CommonInterviewQuestionsTrainer";
import { ElevatorPitchTrainer } from "./ElevatorPitchTrainer";

export function InterviewTrainerPage() {
  const { copy } = useI18n();
  const it = copy.interviewTrainer;

  return (
    <>
      <PageHeader title={it.title} subtitle={it.subtitle} />
      <main className="container-app space-y-6 py-5 pb-10">
        <SectionPanel title={it.pitch.title}>
          <ElevatorPitchTrainer />
        </SectionPanel>

        <SectionPanel title={it.questions.title}>
          <CommonInterviewQuestionsTrainer />
        </SectionPanel>
      </main>
    </>
  );
}

