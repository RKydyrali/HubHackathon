import { Brain, CheckCircle, Sparkle } from "@phosphor-icons/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import type { ApplicantWithProfile } from "@/types/domain";

type ScenarioDraft = {
  context: string;
  tasks: Array<{ prompt: string }>;
  constraints: string[];
  rubric: Array<{ criterion: string; description: string; maxScore: number }>;
};

const emptyDraft: ScenarioDraft = {
  context: "",
  tasks: [{ prompt: "" }],
  constraints: [""],
  rubric: [{ criterion: "", description: "", maxScore: 100 }],
};

const fallbackCopy = {
  title: "Interview Scenario",
  subtitle: "Create a structured web case for the candidate to solve before you decide.",
  start: "Start scenario",
  generating: "Generating draft",
  context: "Context",
  tasks: "Tasks / questions",
  constraints: "Constraints",
  rubric: "Scoring rubric",
  addTask: "Add task",
  addConstraint: "Add constraint",
  addCriterion: "Add criterion",
  saveDraft: "Save draft",
  publish: "Publish scenario",
  published: "Published",
  draft: "Draft",
  submission: "Candidate submission",
  history: "Submission history",
  aiAssessment: "AI assessment",
  advisory: "AI assessment is advisory. The employer makes the final hiring decision.",
  noSubmission: "The candidate has not submitted a solution yet.",
  saved: "Scenario draft saved",
  publishedToast: "Scenario published",
  generated: "Scenario draft generated",
};

function normalizeCopy(copy: ReturnType<typeof useI18n>["copy"]) {
  return copy.applications.interviewScenario ?? fallbackCopy;
}

function scenarioFromData(data: unknown): ScenarioDraft | null {
  const scenario = (data as { scenario?: ScenarioDraft } | null)?.scenario;
  if (!scenario) return null;
  return {
    context: scenario.context,
    tasks: scenario.tasks.length ? scenario.tasks : [{ prompt: "" }],
    constraints: scenario.constraints.length ? scenario.constraints : [""],
    rubric: scenario.rubric.length
      ? scenario.rubric
      : [{ criterion: "", description: "", maxScore: 100 }],
  };
}

export function EmployerInterviewScenarioSection({ item }: { item: ApplicantWithProfile }) {
  const { copy } = useI18n();
  const t = normalizeCopy(copy);
  const applicationId = item.application._id as Id<"applications">;
  const scenarioData = useQuery(
    api.interviewScenarios.getForApplication,
    item.application.status === "interview" ? { applicationId } : "skip",
  );
  const generateDraft = useAction((api.ai as any).generateInterviewScenarioDraft);
  const saveDraft = useMutation(api.interviewScenarios.saveDraft);
  const publishScenario = useMutation(api.interviewScenarios.publish);
  const [draft, setDraft] = useState<ScenarioDraft>(emptyDraft);
  const [localScenarioId, setLocalScenarioId] = useState<Id<"interviewScenarios"> | null>(null);
  const [pending, setPending] = useState<"generate" | "save" | "publish" | null>(null);

  const scenario = scenarioData?.scenario ?? null;
  const latestSubmission = scenarioData?.latestSubmission ?? null;
  const submissions = scenarioData?.submissions ?? [];

  useEffect(() => {
    const next = scenarioFromData(scenarioData);
    if (next && scenario?.status === "draft") {
      setDraft(next);
      setLocalScenarioId(scenario._id as Id<"interviewScenarios">);
    }
  }, [scenarioData, scenario?._id, scenario?.status]);

  const hasEditableDraft = scenario?.status !== "published" && (draft.context.trim() || localScenarioId);

  const maxScore = useMemo(
    () => draft.rubric.reduce((sum, criterion) => sum + (Number(criterion.maxScore) || 0), 0),
    [draft.rubric],
  );

  if (item.application.status !== "interview") {
    return null;
  }

  async function handleGenerate() {
    setPending("generate");
    try {
      const result = await generateDraft({ applicationId });
      setDraft(result.draft);
      toast.success(result.aiFailed ? `${t.generated}. AI fallback used.` : t.generated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(null);
    }
  }

  async function handleSave() {
    setPending("save");
    try {
      const saved = await saveDraft({ applicationId, draft });
      if (saved?._id) {
        setLocalScenarioId(saved._id as Id<"interviewScenarios">);
      }
      toast.success(t.saved);
      return saved?._id as Id<"interviewScenarios"> | undefined;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return undefined;
    } finally {
      setPending(null);
    }
  }

  async function handlePublish() {
    setPending("publish");
    try {
      const savedId = localScenarioId ?? ((await saveDraft({ applicationId, draft }))?._id as Id<"interviewScenarios">);
      await publishScenario({ scenarioId: savedId });
      setLocalScenarioId(savedId);
      toast.success(t.publishedToast);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(null);
    }
  }

  if (scenarioData === undefined) {
    return (
      <section className="rounded-lg border bg-background p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {copy.common.loading}
        </div>
      </section>
    );
  }

  if (scenario?.status === "published") {
    return (
      <SectionPanel
        title={t.title}
        subtitle={t.advisory}
        className="shadow-none"
        action={<Badge tone="success">{t.published}</Badge>}
      >
        <ScenarioReadOnly draft={scenario} labels={t} />
        <SubmissionSummary latestSubmission={latestSubmission} submissions={submissions} labels={t} />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel
      title={t.title}
      subtitle={t.subtitle}
      className="shadow-none"
      action={hasEditableDraft ? <Badge tone="muted">{t.draft}</Badge> : null}
    >
      {!hasEditableDraft ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/25 p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Brain className="size-5" weight="bold" />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
          </div>
          <Button type="button" onClick={() => void handleGenerate()} disabled={pending === "generate"}>
            {pending === "generate" ? <Spinner className="size-4" /> : <Sparkle data-icon="start" weight="bold" />}
            {pending === "generate" ? t.generating : t.start}
          </Button>
        </div>
      ) : (
        <ScenarioEditor
          draft={draft}
          setDraft={setDraft}
          labels={t}
          maxScore={maxScore}
          pending={pending}
          onSave={() => void handleSave()}
          onPublish={() => void handlePublish()}
        />
      )}
    </SectionPanel>
  );
}

function ScenarioEditor({
  draft,
  setDraft,
  labels,
  maxScore,
  pending,
  onSave,
  onPublish,
}: {
  draft: ScenarioDraft;
  setDraft: (draft: ScenarioDraft) => void;
  labels: typeof fallbackCopy;
  maxScore: number;
  pending: "generate" | "save" | "publish" | null;
  onSave: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        {labels.context}
        <Textarea
          value={draft.context}
          rows={4}
          onChange={(event) => setDraft({ ...draft, context: event.target.value })}
        />
      </label>

      <div className="grid gap-2">
        <p className="text-sm font-medium">{labels.tasks}</p>
        {draft.tasks.map((task, index) => (
          <Textarea
            key={index}
            aria-label={`Task ${index + 1}`}
            value={task.prompt}
            rows={3}
            onChange={(event) => {
              const tasks = [...draft.tasks];
              tasks[index] = { prompt: event.target.value };
              setDraft({ ...draft, tasks });
            }}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft({ ...draft, tasks: [...draft.tasks, { prompt: "" }] })}
        >
          {labels.addTask}
        </Button>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">{labels.constraints}</p>
        {draft.constraints.map((constraint, index) => (
          <Input
            key={index}
            aria-label={`Constraint ${index + 1}`}
            value={constraint}
            onChange={(event) => {
              const constraints = [...draft.constraints];
              constraints[index] = event.target.value;
              setDraft({ ...draft, constraints });
            }}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft({ ...draft, constraints: [...draft.constraints, ""] })}
        >
          {labels.addConstraint}
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{labels.rubric}</p>
          <span className="text-xs tabular-nums text-muted-foreground">{maxScore} pts</span>
        </div>
        {draft.rubric.map((criterion, index) => (
          <div key={index} className="grid gap-2 rounded-lg border bg-background p-3">
            <Input
              aria-label={`Rubric criterion ${index + 1}`}
              value={criterion.criterion}
              onChange={(event) => {
                const rubric = [...draft.rubric];
                rubric[index] = { ...criterion, criterion: event.target.value };
                setDraft({ ...draft, rubric });
              }}
            />
            <Textarea
              aria-label={`Rubric description ${index + 1}`}
              value={criterion.description}
              rows={2}
              onChange={(event) => {
                const rubric = [...draft.rubric];
                rubric[index] = { ...criterion, description: event.target.value };
                setDraft({ ...draft, rubric });
              }}
            />
            <Input
              aria-label={`Rubric max score ${index + 1}`}
              type="number"
              value={criterion.maxScore}
              onChange={(event) => {
                const rubric = [...draft.rubric];
                rubric[index] = { ...criterion, maxScore: Number(event.target.value) };
                setDraft({ ...draft, rubric });
              }}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setDraft({
              ...draft,
              rubric: [...draft.rubric, { criterion: "", description: "", maxScore: 10 }],
            })
          }
        >
          {labels.addCriterion}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onSave} disabled={Boolean(pending)}>
          {pending === "save" ? <Spinner className="size-4" /> : null}
          {labels.saveDraft}
        </Button>
        <Button type="button" onClick={onPublish} disabled={Boolean(pending)}>
          {pending === "publish" ? <Spinner className="size-4" /> : <CheckCircle data-icon="start" weight="bold" />}
          {labels.publish}
        </Button>
      </div>
    </div>
  );
}

function ScenarioReadOnly({ draft, labels }: { draft: ScenarioDraft; labels: typeof fallbackCopy }) {
  return (
    <div className="grid gap-4 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labels.context}</p>
        <p className="mt-2 leading-6 text-foreground">{draft.context}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labels.tasks}</p>
        <ol className="mt-2 grid gap-2">
          {draft.tasks.map((task, index) => (
            <li key={`${index}-${task.prompt}`} className="rounded-lg border bg-background p-3 leading-6">
              {index + 1}. {task.prompt}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labels.constraints}</p>
        <ul className="mt-2 grid gap-1 text-muted-foreground">
          {draft.constraints.map((constraint) => (
            <li key={constraint}>- {constraint}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SubmissionSummary({
  latestSubmission,
  submissions,
  labels,
}: {
  latestSubmission: {
    answers: Array<{ taskIndex: number; answer: string; links?: string[] }>;
    evaluation?: {
      overallScore: number;
      recommendation: string;
      criterionScores: Array<{
        criterion: string;
        score: number;
        maxScore: number;
        evidence: string;
      }>;
    };
  } | null;
  submissions: Array<unknown>;
  labels: typeof fallbackCopy;
}) {
  return (
    <div className="mt-5 grid gap-4 border-t pt-4">
      <div>
        <h4 className="font-semibold text-foreground">{labels.submission}</h4>
        {!latestSubmission ? (
          <p className="mt-2 text-sm text-muted-foreground">{labels.noSubmission}</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {latestSubmission.answers.map((answer: { taskIndex: number; answer: string; links?: string[] }) => (
              <div key={answer.taskIndex} className="rounded-lg border bg-background p-3">
                <p className="text-xs font-medium text-muted-foreground">Task {answer.taskIndex + 1}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{answer.answer}</p>
                {answer.links?.length ? (
                  <div className="mt-2 grid gap-1">
                    {answer.links.map((link) => (
                      <a key={link} href={link} className="text-sm text-primary underline-offset-4 hover:underline">
                        {link}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
      {latestSubmission?.evaluation ? (
        <div className="rounded-lg border bg-muted/25 p-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-foreground">{labels.aiAssessment}</h4>
            <Badge tone="info">{latestSubmission.evaluation.overallScore}%</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{latestSubmission.evaluation.recommendation}</p>
          <div className="mt-3 grid gap-2">
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
        </div>
      ) : null}
      {submissions.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          {labels.history}: {submissions.length}
        </p>
      ) : null}
    </div>
  );
}
