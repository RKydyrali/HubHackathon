import { zodResolver } from "@hookform/resolvers/zod";
import { MagicWand, PaperPlaneTilt, Sparkle } from "@phosphor-icons/react";
import { useAction, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/shared/Button";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { formatSalary } from "@/lib/format";
import type { Vacancy } from "@/types/domain";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : Number(value)),
  z.number().optional(),
);

const vacancySchema = z.object({
  title: z.string().min(2, "Укажите название вакансии"),
  description: z.string().min(10, "Добавьте понятное описание"),
  district: z.string().optional(),
  salaryMin: optionalNumber,
  salaryMax: optionalNumber,
  screeningQuestionsText: z.string().optional(),
});

type VacancyInput = z.input<typeof vacancySchema>;
type VacancyForm = z.output<typeof vacancySchema>;

type GeneratedVacancy = {
  title?: string;
  description?: string;
  city?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
};

export function VacancyEditor({ vacancy, onCreated }: { vacancy?: Vacancy | null; onCreated?: () => void }) {
  const createVacancy = useMutation(api.vacancies.createNativeVacancy);
  const updateVacancy = useMutation(api.vacancies.updateNativeVacancy);
  const publishVacancy = useMutation(api.vacancies.publishVacancy);
  const archiveVacancy = useMutation(api.vacancies.archiveNativeVacancy);
  const generateVacancy = useAction(api.ai.generateVacancy);
  const generateScreeningQuestions = useAction(api.ai.generateScreeningQuestions);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [savingAction, setSavingAction] = useState<"publish" | "archive" | null>(null);
  const { copy, locale } = useI18n();
  const readOnly = vacancy?.source === "hh";
  const isCreating = !vacancy;

  const form = useForm<VacancyInput, unknown, VacancyForm>({
    resolver: zodResolver(vacancySchema),
    mode: "onChange",
    defaultValues: toDefaultValues(vacancy),
  });

  useEffect(() => {
    form.reset(toDefaultValues(vacancy));
  }, [form, vacancy]);

  async function submit(values: VacancyForm) {
    if (readOnly) return;
    const screeningQuestions = parseQuestions(values.screeningQuestionsText);
    const payload = {
      title: values.title,
      description: values.description,
      city: "Aktau",
      district: values.district || undefined,
      salaryMin: values.salaryMin || undefined,
      salaryMax: values.salaryMax || undefined,
      salaryCurrency: "KZT",
    };

    if (vacancy) {
      await updateVacancy({
        vacancyId: vacancy._id as Id<"vacancies">,
        ...payload,
        screeningQuestions: screeningQuestions.length ? screeningQuestions : undefined,
      });
      toast.success(locale === "kk" ? "Вакансия сақталды" : "Вакансия сохранена");
    } else {
      const created = await createVacancy(payload);
      if (created && screeningQuestions.length) {
        await updateVacancy({
          vacancyId: created._id as Id<"vacancies">,
          screeningQuestions,
        });
      }
      form.reset(toDefaultValues(null));
      onCreated?.();
      toast.success(locale === "kk" ? "Жоба құрылды" : "Черновик создан");
    }
  }

  async function runDraftGeneration() {
    const trimmed = draftPrompt.trim();
    if (!trimmed) return;
    setGeneratingDraft(true);
    try {
      const generated = (await generateVacancy({ rawText: trimmed })) as GeneratedVacancy;
      form.setValue("title", generated.title ?? form.getValues("title"), { shouldValidate: true });
      form.setValue("description", generated.description ?? form.getValues("description"), { shouldValidate: true });
      form.setValue("salaryMin", generated.salaryMin ?? undefined, { shouldValidate: true });
      form.setValue("salaryMax", generated.salaryMax ?? undefined, { shouldValidate: true });
      toast.success(locale === "kk" ? "AI жоба дайындады" : "AI подготовил черновик");
    } catch {
      toast.error(locale === "kk" ? "AI жоба дайындай алмады" : "AI не смог подготовить черновик");
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function runQuestionGeneration() {
    if (!vacancy) return;
    setGeneratingQuestions(true);
    try {
      const generated = (await generateScreeningQuestions({
        vacancyId: vacancy._id as Id<"vacancies">,
      })) as { questions?: string[] };
      form.setValue("screeningQuestionsText", (generated.questions ?? []).join("\n"), { shouldValidate: true });
      toast.success(locale === "kk" ? "Сұрақтар дайын" : "Вопросы подготовлены");
    } catch {
      toast.error(locale === "kk" ? "AI сұрақ дайындай алмады" : "AI не смог подготовить вопросы");
    } finally {
      setGeneratingQuestions(false);
    }
  }

  async function changePublicationStatus(status: "publish" | "archive") {
    if (!vacancy || readOnly) return;
    setSavingAction(status);
    try {
      if (status === "publish") {
        await publishVacancy({ vacancyId: vacancy._id as Id<"vacancies"> });
      } else {
        await archiveVacancy({ vacancyId: vacancy._id as Id<"vacancies"> });
      }
      toast.success(locale === "kk" ? "Мәртебе жаңартылды" : "Статус обновлен");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(submit)}>
      <div className="rounded-2xl border bg-muted/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isCreating
                ? locale === "kk"
                  ? "Жаңа вакансия жобасы"
                  : "Новый черновик вакансии"
                : vacancy.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {vacancy ? formatSalary(vacancy, locale) : locale === "kk" ? "Жарияламас бұрын сақтап тексеріңіз." : "Сохраните и проверьте перед публикацией."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {vacancy ? <SourceBadge source={vacancy.source} locale={locale} compact /> : null}
            {vacancy ? <StatusBadge status={vacancy.status} locale={locale} /> : <StatusBadge status="draft" locale={locale} />}
          </div>
        </div>
      </div>

      {readOnly ? (
        <p className="rounded-2xl border bg-secondary p-3 text-sm leading-6 text-muted-foreground">
          {copy.vacancies.externalOnly} {locale === "kk" ? "Бұл HH вакансиясын өзгертуге болмайды." : "Эту вакансию HH нельзя редактировать."}
        </p>
      ) : null}

      {!readOnly ? (
        <section className="rounded-2xl border bg-background/72 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkle weight="bold" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {locale === "kk" ? "AI жобасы, кейін қолмен түзетіледі" : "AI-черновик, который можно править"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {locale === "kk"
                  ? "Қысқа мәтін жазыңыз: рөл, кесте, аудан, жалақы. AI тек бастапқы мәтін дайындайды."
                  : "Напишите коротко: роль, график, район, зарплату. AI только готовит стартовый текст."}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <Textarea
                  value={draftPrompt}
                  onChange={(event) => setDraftPrompt(event.target.value)}
                  placeholder={locale === "kk" ? "Мысалы: әкімші, кешкі ауысым, 14 шағын аудан..." : "Например: администратор, вечерние смены, 14 мкр..."}
                  rows={3}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="self-end"
                  onClick={() => void runDraftGeneration()}
                  disabled={generatingDraft || !draftPrompt.trim()}
                >
                  {generatingDraft ? <Spinner className="size-4" /> : <MagicWand data-icon="start" weight="bold" />}
                  {locale === "kk" ? "Жоба жасау" : "Сделать черновик"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <Field data-invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>{locale === "kk" ? "Атауы" : "Название"}</FieldLabel>
        <Input disabled={readOnly} {...form.register("title")} />
        <FieldError>{form.formState.errors.title?.message}</FieldError>
      </Field>

      <Field data-invalid={Boolean(form.formState.errors.description)}>
        <FieldLabel>{locale === "kk" ? "Сипаттама" : "Описание"}</FieldLabel>
        <Textarea disabled={readOnly} rows={8} {...form.register("description")} />
        <FieldDescription>
          {locale === "kk"
            ? "Міндеттерді, кестені, мекенжай аймағын және отклик үшін маңызды шарттарды жазыңыз."
            : "Опишите задачи, график, район и условия, которые важны для отклика."}
        </FieldDescription>
        <FieldError>{form.formState.errors.description?.message}</FieldError>
      </Field>

      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <FieldLabel>{copy.vacancies.district}</FieldLabel>
          <Input disabled={readOnly} {...form.register("district")} />
        </Field>
        <Field>
          <FieldLabel>{locale === "kk" ? "Жалақы бастап" : "Зарплата от"}</FieldLabel>
          <Input disabled={readOnly} type="number" {...form.register("salaryMin")} />
        </Field>
        <Field>
          <FieldLabel>{locale === "kk" ? "Жалақы дейін" : "Зарплата до"}</FieldLabel>
          <Input disabled={readOnly} type="number" {...form.register("salaryMax")} />
        </Field>
      </div>

      <Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FieldLabel>{copy.vacancies.screening}</FieldLabel>
          {vacancy && !readOnly ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => void runQuestionGeneration()} disabled={generatingQuestions}>
              {generatingQuestions ? <Spinner className="size-4" /> : <Sparkle data-icon="start" weight="bold" />}
              {locale === "kk" ? "AI сұрақтары" : "AI-вопросы"}
            </Button>
          ) : null}
        </div>
        <Textarea
          disabled={readOnly}
          rows={4}
          placeholder={
            locale === "kk"
              ? "Әр сұрақты жаңа жолдан жазыңыз"
              : "Каждый вопрос с новой строки"
          }
          {...form.register("screeningQuestionsText")}
        />
        <FieldDescription>
          {locale === "kk"
            ? "Бұл сұрақтар өтініш беру кезінде кандидатқа көрсетіледі."
            : "Эти вопросы появятся в форме отклика для кандидата."}
        </FieldDescription>
      </Field>

      <div className="sticky bottom-4 z-10 flex flex-wrap gap-2 rounded-2xl border bg-card/92 p-3 shadow-card backdrop-blur-xl">
        {!readOnly ? (
          <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner className="size-4" /> : <PaperPlaneTilt data-icon="start" weight="bold" />}
            {vacancy ? copy.common.save : locale === "kk" ? "Жоба құру" : "Создать черновик"}
          </Button>
        ) : null}
        {vacancy && !readOnly ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void changePublicationStatus("publish")}
              disabled={savingAction !== null || vacancy.status === "published"}
            >
              {savingAction === "publish" ? <Spinner className="size-4" /> : null}
              {locale === "kk" ? "Жариялау" : "Опубликовать"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void changePublicationStatus("archive")}
              disabled={savingAction !== null || vacancy.status === "archived"}
            >
              {savingAction === "archive" ? <Spinner className="size-4" /> : null}
              {locale === "kk" ? "Архивке жіберу" : "В архив"}
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
}

function toDefaultValues(vacancy?: Vacancy | null): VacancyInput {
  return {
    title: vacancy?.title ?? "",
    description: vacancy?.description ?? "",
    district: vacancy?.district ?? "",
    salaryMin: vacancy?.salaryMin,
    salaryMax: vacancy?.salaryMax,
    screeningQuestionsText: vacancy?.screeningQuestions?.join("\n") ?? "",
  };
}

function parseQuestions(value?: string) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
