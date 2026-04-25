import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/shared/Button";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";

export function PostHireNextSteps({
  applicationId,
  role,
}: {
  applicationId: Id<"applications">;
  role: "employer" | "seeker";
}) {
  const { locale } = useI18n();
  const workspace = useQuery(api.postHire.getWorkspace, { applicationId });
  const ensure = useMutation(api.postHire.ensureChannels);
  const grant = useMutation(api.postHire.grantConsent);
  const setVis = useMutation(api.postHire.setChannelVisibility);
  const seeded = useRef(false);

  useEffect(() => {
    if (!workspace?.isHired || seeded.current) {
      return;
    }
    if (workspace.channels.some((c) => c.missingRow)) {
      seeded.current = true;
      void ensure({ applicationId });
    }
  }, [applicationId, ensure, workspace]);

  if (workspace === undefined) {
    return <p className="text-sm text-muted-foreground">{locale === "kk" ? "Жүктелуде…" : "Загрузка…"}</p>;
  }

  if (!workspace.isHired) {
    return null;
  }

  const labels: Record<string, { ru: string; kk: string }> = {
    email: { ru: "Email", kk: "Email" },
    telegram: { ru: "Telegram", kk: "Telegram" },
    phone: { ru: "Телефон", kk: "Телефон" },
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {locale === "kk" ? "Наймнан кейінгі байланыс" : "Связь после найма"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {locale === "kk"
            ? "Алдымен ішкі хабарлама, содан кейін келісім бойынша арналар ашылады."
            : "Сначала чат в продукте, затем контакты по правилам видимости и взаимному согласию."}
        </p>
      </div>

      <ul className="space-y-3">
        {workspace.channels.map((ch) => {
          const label = labels[ch.channel]?.[locale] ?? ch.channel;
          const mine = role === "employer" ? ch.employerValue : ch.seekerValue;
          const theirs = role === "employer" ? ch.seekerValue : ch.employerValue;
          const iHave = role === "employer" ? ch.employerHasValue : ch.seekerHasValue;
          const theyHave = role === "employer" ? ch.seekerHasValue : ch.employerHasValue;

          return (
            <li key={ch.channel} className="rounded-lg border bg-background px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {ch.visibility === "public"
                    ? locale === "kk"
                      ? "Қоғамдық"
                      : "Публично"
                    : locale === "kk"
                      ? "Өзара келісім"
                      : "Взаимное согласие"}
                </span>
              </div>
              {role === "employer" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={ch.visibility === "public" ? "default" : "outline"}
                    onClick={() => void setVis({ applicationId, channel: ch.channel, visibility: "public" })}
                  >
                    {locale === "kk" ? "Жария" : "Публично"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={ch.visibility === "mutual" ? "default" : "outline"}
                    onClick={() => void setVis({ applicationId, channel: ch.channel, visibility: "mutual" })}
                  >
                    {locale === "kk" ? "Келісім" : "По согласию"}
                  </Button>
                </div>
              ) : null}
              <div className="mt-2 grid gap-1 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">
                    {locale === "kk" ? "Сіздің контактыңыз" : "Ваш контакт"}:{" "}
                  </span>
                  {iHave ? (
                    <span className="font-medium">
                      {mine ??
                        (ch.needsConsent
                          ? locale === "kk"
                            ? "келісім күтілуде"
                            : "скрыто до согласия"
                          : "—")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {locale === "kk" ? "көрсетілмеген" : "не указан"}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {locale === "kk" ? "Екінші жақ" : "Контакт стороны"}:{" "}
                  </span>
                  {theyHave ? (
                    <span className="font-medium">
                      {theirs ??
                        (ch.needsConsent
                          ? locale === "kk"
                            ? "келісім күтілуде"
                            : "скрыто до согласия"
                          : "—")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {locale === "kk" ? "жоқ" : "нет данных"}
                    </span>
                  )}
                </div>
              </div>
              {ch.visibility === "mutual" && ch.needsConsent ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => void grant({ applicationId, channel: ch.channel })}
                >
                  {locale === "kk" ? "Контактімді ашуға келісемін" : "Согласен показать свой контакт"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
