import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, CheckCircle } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DetailPanel } from "@/components/layout/DetailPanel";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { getStatusMeta } from "@/lib/status-ui";
import { ALLOWED_TRANSITIONS } from "@/lib/status";
import type { ApplicantWithProfile } from "@/types/domain";
import { ApplicationStatusTimeline } from "./ApplicationStatusTimeline";
import { HiredApplicationThread } from "./HiredApplicationThread";
import { PostHireNextSteps } from "./PostHireNextSteps";

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

  return (
    <DetailPanel
      title={item.profile?.fullName ?? (locale === "kk" ? "Профиль жоқ" : "Профиль недоступен")}
      actions={<StatusBadge status={item.application.status} locale={locale} />}
    >
      <div className="flex flex-col gap-4 text-sm">
        <ApplicationStatusTimeline status={item.application.status} />

        <section className="rounded-lg border bg-background p-4">
          <h3 className="font-semibold text-foreground">{copy.applications.nextActions}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((nextStatus) => {
              const meta = getStatusMeta(nextStatus, locale);
              return nextStatus === "rejected" ? (
                <ConfirmDialog
                  key={nextStatus}
                  label={meta.label}
                  title={meta.label}
                  body={copy.applications.rejectPipelineWarning}
                  irreversible
                  onConfirm={() => updateStatus(nextStatus)}
                />
              ) : (
                <Button key={nextStatus} type="button" onClick={() => void updateStatus(nextStatus)}>
                  <CheckCircle data-icon="start" weight="bold" />
                  {meta.label}
                </Button>
              );
            })}
            {actions.length === 0 ? <p className="text-sm text-muted-foreground">{copy.applications.noActions}</p> : null}
          </div>
        </section>

        <SectionPanel
          title={copy.applications.candidate}
          subtitle={item.vacancy?.title ?? (locale === "kk" ? "Вакансия жоқ" : "Вакансия недоступна")}
          className="shadow-none"
        >
          <div>
            <p className="leading-6 text-muted-foreground">
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
        </SectionPanel>

        {item.application.status === "hired" ? (
          <section className="rounded-lg border bg-background p-4">
            <HiredApplicationThread applicationId={item.application._id as Id<"applications">} />
          </section>
        ) : null}

        {item.application.status === "hired" ? (
          <PostHireNextSteps applicationId={item.application._id as Id<"applications">} role="employer" />
        ) : null}

        <section className="rounded-lg border bg-background p-4">
          <h3 className="font-semibold text-foreground">{copy.vacancies.screening}</h3>
          <div className="mt-3 flex flex-col gap-3">
            {item.application.screeningAnswers?.length ? (
              item.application.screeningAnswers.map((answer) => (
                <div
                  key={answer.question}
                  className="rounded-xl border border-border/80 bg-muted/30 p-4 dark:bg-muted/15"
                >
                  <p className="text-sm font-medium leading-snug text-foreground [text-wrap:pretty]">{answer.question}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
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

        <section className="rounded-lg border bg-background p-4">
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
                <div key={interview._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
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
