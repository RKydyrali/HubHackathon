import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";

const applicationSchema = z.object({
  answers: z.record(z.string(), z.string().min(2, "Ответ должен быть чуть подробнее.")),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

export function ApplyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { copy } = useI18n();
  const vacancy = useQuery(api.vacancies.getVacancy, id ? { vacancyId: id as Id<"vacancies"> } : "skip");
  const createApplication = useMutation(api.applications.createApplication);
  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { answers: {} },
    mode: "onChange",
  });

  if (vacancy === undefined) return <LoadingSkeleton variant="form" />;
  if (!vacancy || vacancy.source !== "native" || vacancy.status !== "published") {
    return (
      <>
        <PageHeader title={copy.apply.title} />
        <div className="container-app py-5"><EmptyState title={copy.vacancies.notOpen} /></div>
      </>
    );
  }

  const questions = vacancy.screeningQuestions?.length ? vacancy.screeningQuestions : [copy.apply.defaultQuestion];
  const pending = form.formState.isSubmitting;

  async function submit(values: ApplicationForm) {
    if (!vacancy) return;
    try {
      await createApplication({
        vacancyId: vacancy._id as Id<"vacancies">,
        screeningAnswers: questions.map((question) => ({
          question,
          answer: values.answers[question] ?? "",
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
      <form className="container-app max-w-3xl py-5" onSubmit={form.handleSubmit(submit)}>
        <SectionPanel title={copy.apply.title} subtitle={copy.apply.support}>
          <FieldGroup>
            {questions.map((question, index) => {
              const fieldName = `answers.${question}` as const;
              const invalid = Boolean(form.formState.errors.answers?.[question]);
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
                  {invalid ? <FieldError>{form.formState.errors.answers?.[question]?.message}</FieldError> : null}
                </Field>
              );
            })}
            {form.formState.errors.root ? <FieldError>{form.formState.errors.root.message}</FieldError> : null}
          </FieldGroup>
          <div className="mt-6 flex justify-end border-t pt-4">
            <Button disabled={!form.formState.isValid || pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? copy.apply.submitting : copy.apply.submit}
            </Button>
          </div>
        </SectionPanel>
      </form>
    </>
  );
}
