import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, CheckCircle, Sparkle, UserCircle } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DetailPanel } from "@/components/layout/DetailPanel";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { getStatusMeta } from "@/lib/status-ui";
import { ALLOWED_TRANSITIONS } from "@/lib/status";
import type { ApplicantWithProfile } from "@/types/domain";

const scheduleSchema = z.object({
  scheduledAt: z.string().min(1, "Укажите дату и время"),
  locationOrLink: z.string().optional(),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

export function ReviewPanel({ item }: { item: ApplicantWithProfile }) {
  const moveStatus = useMutation(api.applications.updateApplicationStatus);
  const scheduleInterview = useMutation(api.interviews.scheduleInterview);
  const interviews = useQuery(api.interviews.listByApplication, {
    applicationId: item.application._id as Id<"applications">,
  });
  const { copy, locale } = useI18n();
  const actions = ALLOWED_TRANSITIONS[item.application.status];
  const scheduleForm = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { scheduledAt: "", locationOrLink: "" },
  });

  async function updateStatus(nextStatus: (typeof actions)[number]) {
    await moveStatus({ applicationId: item.application._id, status: nextStatus });
    toast.success(locale === "kk" ? "Өтініш мәртебесі жаңартылды" : "Статус отклика обновлен");
  }

  async function submitSchedule(values: ScheduleForm) {
    await scheduleInterview({
      applicationId: item.application._id as Id<"applications">,
      scheduledAt: new Date(values.scheduledAt).getTime(),
      locationOrLink: values.locationOrLink || undefined,
    });
    scheduleForm.reset();
    toast.success(locale === "kk" ? "Сұхбат белгіленді" : "Интервью назначено");
  }

  const aiScore = item.application.aiScore;

  return (
    <DetailPanel
      title={item.profile?.fullName ?? (locale === "kk" ? "Профиль жоқ" : "Профиль недоступен")}
      actions={<StatusBadge status={item.application.status} locale={locale} />}
    >
      <div className="flex flex-col gap-4 text-sm">
        <SectionPanel
          title={copy.applications.reviewTitle}
          subtitle={item.vacancy?.title ?? (locale === "kk" ? "Вакансия жоқ" : "Вакансия недоступна")}
          className="shadow-none"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <UserCircle className="size-5 text-primary" weight="bold" />
                {item.profile?.fullName ?? (locale === "kk" ? "Аты көрсетілмеген" : "Имя не указано")}
              </p>
              <p className="mt-2 leading-6 text-muted-foreground">
                {item.profile?.bio || item.profile?.resumeText || (locale === "kk" ? "Профиль әлі толық емес." : "Профиль пока заполнен не полностью.")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.profile?.skills.length ? (
                  item.profile.skills.map((skill) => (
                    <span key={skill} className="rounded-full border bg-secondary px-2.5 py-1 text-xs font-semibold">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {locale === "kk" ? "Дағдылар көрсетілмеген" : "Навыки не указаны"}
                  </span>
                )}
              </div>
            </div>
            {typeof aiScore === "number" ? (
              <div className="min-w-36 rounded-2xl border bg-background/72 p-3">
                <p className="text-xs text-muted-foreground">{copy.applications.ai}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{aiScore}%</p>
                <Progress value={aiScore} className="mt-3" />
              </div>
            ) : null}
          </div>
        </SectionPanel>

        <section className="rounded-2xl border bg-background/72 p-4">
          <h3 className="font-semibold text-foreground">{copy.vacancies.screening}</h3>
          <div className="mt-3 flex flex-col gap-3">
            {item.application.screeningAnswers?.length ? (
              item.application.screeningAnswers.map((answer) => (
                <div key={answer.question} className="rounded-2xl border bg-muted/50 p-3">
                  <p className="font-medium text-foreground">{answer.question}</p>
                  <p className="mt-1 leading-6 text-muted-foreground">
                    {answer.answer || (locale === "kk" ? "Жауап жоқ" : "Нет ответа")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                {locale === "kk" ? "Скрининг жауаптары жоқ" : "Скрининг-ответов нет"}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkle className="size-5 text-primary" weight="bold" />
            {copy.applications.ai}
          </h3>
          <p className="mt-2 leading-6 text-muted-foreground">
            {item.application.aiSummary ?? copy.applications.noSummary}
          </p>
          <p className="mt-3 rounded-2xl border bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
            {copy.applications.advisory}
          </p>
        </section>

        <section className="rounded-2xl border bg-background/72 p-4">
          <h3 className="font-semibold text-foreground">{copy.applications.nextActions}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((nextStatus) => {
              const meta = getStatusMeta(nextStatus, locale);
              return (
                <Button key={nextStatus} type="button" onClick={() => void updateStatus(nextStatus)}>
                  <CheckCircle data-icon="start" weight="bold" />
                  {meta.label}
                </Button>
              );
            })}
            {actions.length === 0 ? <p className="text-sm text-muted-foreground">{copy.applications.noActions}</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-background/72 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <CalendarPlus className="size-5 text-primary" weight="bold" />
            {copy.interviews.schedule}
          </h3>
          {item.application.status === "interview" ? (
            <form className="mt-3 grid gap-3" onSubmit={scheduleForm.handleSubmit(submitSchedule)}>
              <Field data-invalid={Boolean(scheduleForm.formState.errors.scheduledAt)}>
                <FieldLabel>{copy.interviews.scheduledAt}</FieldLabel>
                <Input type="datetime-local" {...scheduleForm.register("scheduledAt")} />
                <FieldError>{scheduleForm.formState.errors.scheduledAt?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel>{copy.interviews.location}</FieldLabel>
                <Input
                  placeholder={locale === "kk" ? "Кеңсе мекенжайы немесе бейне қоңырау сілтемесі" : "Адрес офиса или ссылка на видеозвонок"}
                  {...scheduleForm.register("locationOrLink")}
                />
                <FieldDescription>
                  {locale === "kk" ? "Кандидатқа нақты орын немесе сілтеме көрінеді." : "Кандидат увидит конкретное место или ссылку."}
                </FieldDescription>
              </Field>
              <Button type="submit" disabled={scheduleForm.formState.isSubmitting}>
                {scheduleForm.formState.isSubmitting ? <Spinner className="size-4" /> : <CalendarPlus data-icon="start" weight="bold" />}
                {copy.interviews.save}
              </Button>
            </form>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {locale === "kk"
                ? "Сұхбат белгілеу үшін өтінішті алдымен сұхбат мәртебесіне ауыстырыңыз."
                : "Чтобы назначить интервью, сначала переведите отклик в статус интервью."}
            </p>
          )}
          {interviews?.length ? (
            <div className="mt-3 grid gap-2">
              {interviews.map((interview) => (
                <div key={interview._id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3">
                  <span className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-KZ", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(interview.scheduledAt))}
                  </span>
                  <StatusBadge status={interview.status} locale={locale} />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </DetailPanel>
  );
}
