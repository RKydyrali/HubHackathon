import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SectionPanel } from "@/components/layout/SectionPanel";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";

const fallbackCopy = {
  title: "Interview Scenario",
  context: "Context",
  tasks: "Tasks / questions",
  constraints: "Constraints",
  rubric: "Scoring rubric",
  answerLabel: "Answer for task",
  linksLabel: "Links for task",
  linksPlaceholder: "Optional links, one per line",
  submit: "Submit solution",
  resubmit: "Resubmit solution",
  submitted: "Solution submitted",
  aiAssessment: "AI assessment",
  waiting: "AI assessment is being prepared.",
  advisory: "AI assessment is advisory. The employer makes the final hiring decision.",
};

function normalizeCopy(copy: ReturnType<typeof useI18n>["copy"]) {
  return copy.applications.interviewScenario ?? fallbackCopy;
}

type AnswerDraft = {
  answer: string;
  linksText: string;
};

export function SeekerInterviewScenarioPanel({ applicationId }: { applicationId: Id<"applications"> }) {
  const { copy } = useI18n();
  const t = normalizeCopy(copy);
  const scenarioData = useQuery(api.interviewScenarios.getForSeekerApplication, { applicationId });
  const submit = useMutation(api.interviewScenarios.submit);
  const [answers, setAnswers] = useState<AnswerDraft[]>([]);
  const [pending, setPending] = useState(false);

  const scenario = scenarioData?.scenario ?? null;
  const latestSubmission = scenarioData?.latestSubmission ?? null;

  useEffect(() => {
    if (!scenario) return;
    const previous = latestSubmission?.answers ?? [];
    setAnswers(
      scenario.tasks.map((_: unknown, index: number) => {
        const prior = previous.find((answer: { taskIndex: number }) => answer.taskIndex === index);
        return {
          answer: prior?.answer ?? "",
          linksText: (prior?.links ?? []).join("\n"),
        };
      }),
    );
  }, [latestSubmission?._id, scenario]);

  if (scenarioData === undefined) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {copy.common.loading}
        </div>
      </section>
    );
  }

  if (!scenario) {
    return null;
  }

  async function handleSubmit() {
    setPending(true);
    try {
      await submit({
        scenarioId: scenario._id as Id<"interviewScenarios">,
        answers: answers.map((answer, index) => ({
          taskIndex: index,
          answer: answer.answer,
          links: answer.linksText
            .split("\n")
            .map((link) => link.trim())
            .filter(Boolean),
        })),
      });
      toast.success(t.submitted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionPanel title={t.title} subtitle={t.advisory} className="shadow-none">
      <div className="grid gap-5 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.context}</p>
          <p className="mt-2 leading-6 text-foreground">{scenario.context}</p>
        </div>

        {scenario.constraints.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.constraints}</p>
            <ul className="mt-2 grid gap-1 text-muted-foreground">
              {scenario.constraints.map((constraint: string) => (
                <li key={constraint}>- {constraint}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {scenario.tasks.map((task: { prompt: string }, index: number) => (
            <div key={`${index}-${task.prompt}`} className="grid gap-3 rounded-lg border bg-background p-3">
              <p className="font-medium leading-6">
                {index + 1}. {task.prompt}
              </p>
              <label className="grid gap-2 text-sm font-medium">
                {t.answerLabel} {index + 1}
                <Textarea
                  aria-label={`${t.answerLabel} ${index + 1}`}
                  rows={5}
                  value={answers[index]?.answer ?? ""}
                  onChange={(event) => {
                    const next = [...answers];
                    next[index] = { ...(next[index] ?? { answer: "", linksText: "" }), answer: event.target.value };
                    setAnswers(next);
                  }}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {t.linksLabel} {index + 1}
                <Input
                  aria-label={`${t.linksLabel} ${index + 1}`}
                  placeholder={t.linksPlaceholder}
                  value={answers[index]?.linksText ?? ""}
                  onChange={(event) => {
                    const next = [...answers];
                    next[index] = {
                      ...(next[index] ?? { answer: "", linksText: "" }),
                      linksText: event.target.value,
                    };
                    setAnswers(next);
                  }}
                />
              </label>
            </div>
          ))}
          <Button type="submit" disabled={pending || answers.every((answer) => !answer.answer.trim())}>
            {pending ? <Spinner className="size-4" /> : <PaperPlaneTilt data-icon="start" weight="bold" />}
            {latestSubmission ? t.resubmit : t.submit}
          </Button>
        </form>

        {latestSubmission ? (
          <div className="rounded-lg border bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-foreground">{t.aiAssessment}</h3>
              {latestSubmission.evaluation ? (
                <Badge tone="info">{latestSubmission.evaluation.overallScore}%</Badge>
              ) : (
                <Badge tone="muted">{latestSubmission.status}</Badge>
              )}
            </div>
            {latestSubmission.evaluation ? (
              <div className="mt-3 grid gap-3">
                <p className="text-sm leading-6 text-muted-foreground">{latestSubmission.evaluation.recommendation}</p>
                {latestSubmission.evaluation.criterionScores.map(
                  (score: { criterion: string; score: number; maxScore: number; evidence: string }) => (
                    <div key={score.criterion} className="rounded-lg bg-background p-3 text-sm">
                      <p className="font-medium">
                        {score.criterion}: {score.score}/{score.maxScore}
                      </p>
                      <p className="mt-1 text-muted-foreground">{score.evidence}</p>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t.waiting}</p>
            )}
          </div>
        ) : null}
      </div>
    </SectionPanel>
  );
}
