import { ArrowLeft } from "@phosphor-icons/react";
import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/shared/Button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import {
  type GeneratedVacancyFields,
  buildCreateNativePayload,
  vacancySchema,
} from "./vacancyFormModel";
import { VacancyLivePreview, type VacancyPreviewState } from "./VacancyLivePreview";

const STEP_COUNT = 4;
const DEBOUNCE_MS = 520;

function buildRawText(
  answers: { role: string; district: string; salary: string; requirements: string },
  locale: "ru" | "kk",
): string {
  const r = answers.role.trim();
  const d = answers.district.trim();
  const s = answers.salary.trim();
  const q = answers.requirements.trim();
  if (locale === "kk") {
    const parts: string[] = [];
    if (r) parts.push(`Рөлі: ${r}`);
    if (d) parts.push(`Аудан: ${d}`);
    if (s) parts.push(`Жалақы: ${s}`);
    if (q) parts.push(`Талаптар: ${q}`);
    return parts.join("\n\n");
  }
  const parts: string[] = [];
  if (r) parts.push(`Роль: ${r}`);
  if (d) parts.push(`Район: ${d}`);
  if (s) parts.push(`Зарплата: ${s}`);
  if (q) parts.push(`Требования: ${q}`);
  return parts.join("\n\n");
}

export function VacancyCreateFlow({
  onCancel,
  backLabel,
}: {
  onCancel: () => void;
  backLabel: string;
}) {
  const { copy, locale } = useI18n();
  const ev = copy.employerVacancies;
  const navigate = useNavigate();
  const generateVacancy = useAction(api.ai.generateVacancy);
  const createVacancy = useMutation(api.vacancies.createNativeVacancy);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    role: "",
    district: "",
    salary: "",
    requirements: "",
  });
  const [generated, setGenerated] = useState<GeneratedVacancyFields | null>(null);
  const [previewState, setPreviewState] = useState<VacancyPreviewState>("empty");
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genSeq = useRef(0);

  const rawText = buildRawText(answers, locale);
  const canRequestPreview = rawText.trim().length >= 12;

  const runGenerate = useCallback(
    async (raw: string) => {
      const mySeq = ++genSeq.current;
      setPreviewState("loading");
      try {
        const out = (await generateVacancy({ rawText: raw })) as GeneratedVacancyFields;
        if (genSeq.current !== mySeq) return;
        setGenerated(out);
        setPreviewState("ready");
      } catch {
        if (genSeq.current !== mySeq) return;
        setPreviewState("error");
        setGenerated(null);
      }
    },
    [generateVacancy],
  );

  const scheduleGenerate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!canRequestPreview) {
      setPreviewState("empty");
      setGenerated(null);
      return;
    }
    setPreviewState("loading");
    debounceRef.current = setTimeout(() => {
      void runGenerate(rawText);
    }, DEBOUNCE_MS);
  }, [canRequestPreview, rawText, runGenerate]);

  useEffect(() => {
    scheduleGenerate();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scheduleGenerate]);

  const onChangeField = (key: keyof typeof answers, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  const onRetryPreview = () => {
    if (canRequestPreview) void runGenerate(rawText);
  };

  const currentKey = (["role", "district", "salary", "requirements"] as const)[step]!;
  const currentLabel = (() => {
    switch (step) {
      case 0:
        return { l: ev.stepRoleLabel, d: ev.stepRoleDescription };
      case 1:
        return { l: ev.stepDistrictLabel, d: ev.stepDistrictDescription };
      case 2:
        return { l: ev.stepSalaryLabel, d: ev.stepSalaryDescription };
      default:
        return { l: ev.stepReqLabel, d: ev.stepReqDescription };
    }
  })();

  const canAdvance = (answers[currentKey] ?? "").trim().length > 0;
  const isLast = step === STEP_COUNT - 1;

  const onNext = () => {
    if (!canAdvance) return;
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
    }
  };

  const onCreateDraft = async () => {
    if (!isLast || !canAdvance) return;
    if (submitting) return;
    if (previewState === "loading" && !generated) {
      toast.error(
        locale === "kk" ? "Алдымен қарау дайындалсын" : "Дождитесь предпросмотра",
      );
      return;
    }

    setSubmitting(true);
    try {
      let g: GeneratedVacancyFields | null = generated;
      if (!g || !g.title?.trim() || (g.description?.trim().length ?? 0) < 10) {
        if (!canRequestPreview) {
          toast.error(
            locale === "kk" ? "Барлық қадамды толтырыңыз" : "Заполните шаги",
          );
          return;
        }
        try {
          g = (await generateVacancy({ rawText: rawText.trim() })) as GeneratedVacancyFields;
          setGenerated(g);
          setPreviewState("ready");
        } catch {
          toast.error(ev.previewError);
          return;
        }
      }
      if (!g.title?.trim() || (g.description?.trim().length ?? 0) < 10) {
        toast.error(
          locale === "kk" ? "AI сипаттамасын алу мүмкін емес" : "AI не сформировал описание",
        );
        return;
      }
      const parsed = vacancySchema.safeParse({
        title: g.title,
        description: g.description,
        district: answers.district.trim() || undefined,
        salaryMin: g.salaryMin == null ? undefined : g.salaryMin,
        salaryMax: g.salaryMax == null ? undefined : g.salaryMax,
        screeningQuestionsText: "",
      });
      if (!parsed.success) {
        toast.error(copy.common.error, {
          description: parsed.error.issues.map((i) => i.message).join(" · "),
        });
        return;
      }
      const payload = buildCreateNativePayload({
        title: parsed.data.title,
        description: parsed.data.description,
        district: answers.district.trim() || undefined,
        salaryMin: parsed.data.salaryMin,
        salaryMax: parsed.data.salaryMax,
      });
      const created = await createVacancy(payload);
      toast.success(ev.createSuccessNavigating);
      if (created?._id) {
        navigate(`/employer/vacancies/${created._id as Id<"vacancies">}`);
      }
    } catch {
      toast.error(locale === "kk" ? "Сақтау сәтсіз" : "Не удалось сохранить");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 pl-0">
          <ArrowLeft className="size-4" weight="bold" />
          {backLabel}
        </Button>
        <p className="text-xs text-muted-foreground" aria-hidden>
          {step + 1} / {STEP_COUNT}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{currentLabel.l}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{currentLabel.d}</p>
          </div>
          <Field>
            <FieldLabel className="sr-only">{currentLabel.l}</FieldLabel>
            <Textarea
              value={answers[currentKey]}
              onChange={(e) => onChangeField(currentKey, e.target.value)}
              rows={4}
              className="min-h-[100px] resize-y"
            />
            <FieldDescription>
              {locale === "kk" ? "Сақталған жауап ескеріледі." : "Ответы учитываются в черновике."}
            </FieldDescription>
          </Field>
          <div className="flex flex-wrap gap-2">
            {!isLast ? (
              <Button type="button" onClick={onNext} disabled={!canAdvance}>
                {ev.nextStep}
              </Button>
            ) : null}
            {isLast ? (
              <Button
                type="button"
                onClick={() => void onCreateDraft()}
                disabled={submitting || !canAdvance || (previewState === "loading" && !generated)}
              >
                {submitting ? (locale === "kk" ? "Сақталады…" : "Создаём…") : ev.createDraft}
              </Button>
            ) : null}
          </div>
        </div>

        <VacancyLivePreview
          state={previewState}
          generated={generated}
          district={answers.district}
          onRetry={onRetryPreview}
        />
      </div>
    </div>
  );
}
