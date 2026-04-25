import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { ActionFooter } from "@/components/product/ActionFooter";
import { DetailAside } from "@/components/product/DetailAside";
import { Button } from "@/components/shared/Button";
import { SourceBadge } from "@/components/shared/StatusBadge";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { getSourceMeta } from "@/lib/status-ui";

const applicationSchema = z.object({
  // Answers keyed by index (NOT question text) to avoid react-hook-form path issues
  // when questions contain dots or other special characters.
  answers: z.array(z.string().min(2, "Ответ должен быть чуть подробнее.")),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

export function ApplyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { copy, locale } = useI18n();
  const vacancy = useQuery(api.vacancies.getVacancy, id ? { vacancyId: id as Id<"vacancies"> } : "skip");
  const createApplication = useMutation(api.applications.createApplication);
  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { answers: [] },
    mode: "onChange",
  });
  const answers = useWatch({ control: form.control, name: "answers" });

  const questions = useMemo(() => {
    if (vacancy === undefined) return [];
    if (!vacancy || vacancy.source !== "native" || vacancy.status !== "published") return [];
    return vacancy.screeningQuestions?.length
      ? vacancy.screeningQuestions
      : [copy.apply.defaultQuestion];
  }, [copy.apply.defaultQuestion, vacancy]);

  useEffect(() => {
    if (!questions.length) return;

    // Ensure we have one answer slot per question, but do NOT reset on every keystroke.
    // Only run when the questions set changes.
    const current = form.getValues("answers") ?? [];
    const next = questions.map((_, index) => (current[index] ?? "").toString());

    const needsSync =
      current.length !== next.length ||
      next.some((value, index) => (current[index] ?? "") !== value);

    if (needsSync) {
      form.reset(
        { answers: next },
        { keepDirty: true, keepTouched: true, keepErrors: true },
      );
    }
  }, [form, questions.join("\u0000")]);

  if (vacancy === undefined) return <LoadingSkeleton variant="form" />;
  if (!vacancy || vacancy.source !== "native" || vacancy.status !== "published") {
    const sourceMeta = vacancy ? getSourceMeta(vacancy.source, locale) : null;
    return (
      <>
        <PageHeader title={copy.apply.title} subtitle={vacancy?.title} />
        <div className="container-app py-5">
          <EmptyState
            title={copy.vacancies.notOpen}
            body={sourceMeta?.actionHint}
            action={
              vacancy?.source === "hh" && vacancy.externalApplyUrl ? (
                <a href={vacancy.externalApplyUrl} target="_blank" rel="noreferrer">
                  <Button>
                    <ArrowSquareOut data-icon="inline-start" weight="bold" />
                    {copy.vacancies.applyHh}
                  </Button>
                </a>
              ) : undefined
            }
          />
        </div>
      </>
    );
  }

  const pending = form.formState.isSubmitting;
  const completedAnswers = (answers ?? []).filter((answer) => answer?.trim()).length;

  async function submit(values: ApplicationForm) {
    if (!vacancy) return;
    try {
      await createApplication({
        vacancyId: vacancy._id as Id<"vacancies">,
        screeningAnswers: questions.map((question, index) => ({
          question,
          answer: values.answers[index] ?? "",
        })),
      });
      toast.success(copy.apply.success);
      navigate("/applications");
    } catch (error) {
      const message = error instanceof Error && /already/i.test(error.message)
        ? copy.apply.duplicate
        : error instanceof Error
          ? error.message
          : copy.common.error;
      form.setError("root", { message });
    }
  }

  return (
    <>
      <PageHeader title={copy.apply.title} subtitle={vacancy.title} />
      <form className="container-app grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_360px]" onSubmit={form.handleSubmit(submit)}>
        <SectionPanel title={copy.apply.title} subtitle={copy.apply.support}>
          <FieldGroup>
            {questions.map((question, index) => {
              const fieldName = `answers.${index}` as const;
              const invalid = Boolean(form.formState.errors.answers?.[index]);
              return (
                <Field key={question} data-invalid={invalid}>
                  <FieldLabel htmlFor={`answer-${index}`}>{question}</FieldLabel>
                  <Textarea
                    id={`answer-${index}`}
                    rows={5}
                    aria-invalid={invalid}
                    disabled={pending}
                    {...form.register(fieldName)}
                  />
                  <FieldDescription>{copy.apply.support}</FieldDescription>
                  {invalid ? <FieldError>{form.formState.errors.answers?.[index]?.message}</FieldError> : null}
                </Field>
              );
            })}
            {form.formState.errors.root ? <FieldError>{form.formState.errors.root.message}</FieldError> : null}
          </FieldGroup>
        </SectionPanel>
        <DetailAside title={copy.vacancies.title} subtitle={vacancy.title}>
          <div className="grid gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground">{vacancy.title}</p>
              <p className="mt-1 text-muted-foreground">{vacancy.city}</p>
              <div className="mt-3">
                <SourceBadge source={vacancy.source} locale={locale} />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {getSourceMeta(vacancy.source, locale).actionHint}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="font-medium text-foreground">{copy.common.done}</p>
              <p className="mt-1 text-muted-foreground">
                {questions.length} {copy.vacancies.screening}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.round((completedAnswers / questions.length) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </DetailAside>
        <ActionFooter meta={pending ? copy.apply.submitting : copy.apply.support} className="lg:col-span-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/vacancies/${vacancy._id}`)} disabled={pending}>
            {copy.common.cancel}
          </Button>
          <Button type="submit" disabled={!form.formState.isValid || pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? copy.apply.submitting : copy.apply.submit}
          </Button>
        </ActionFooter>
      </form>
    </>
  );
}
