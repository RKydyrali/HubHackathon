import { IdentificationCard, Lightbulb, MapPin, Scales, UserCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { AiUnavailableState } from "@/components/feedback/AiUnavailableState";
import { AiAdvisoryNotice } from "@/components/product/AiTrust";
import { DetailAside } from "@/components/product/DetailAside";
import { Button } from "@/components/shared/Button";
import { Switch } from "@/components/ui/switch";
import { useI18n, type Locale } from "@/lib/i18n";
import type { Profile } from "@/types/domain";

const asideCopy = {
  ru: {
    title: "AI помощник",
    subtitle: "Профиль, подсказки и сравнение",
    profileContext: "Контекст профиля",
    profileBody: "AI учитывает данные профиля, когда это доступно для вашей роли.",
    profileEmpty: "Профиль пока не заполнен.",
    editProfile: "Редактировать профиль",
    assistance: "Уточнить подбор",
    relaxDistrict: "Расширить район",
    includeHh: "Включить HH",
    compareReady: "Можно сравнить выбранные вакансии.",
    compareWaiting: "Выберите минимум две вакансии для сравнения.",
    selected: "Выбрано",
    skills: "Навыки",
  },
  kk: {
    title: "AI көмекші",
    subtitle: "Профиль, кеңестер және салыстыру",
    profileContext: "Профиль контексті",
    profileBody: "Рөліңізге қолжетімді болса, AI профиль деректерін ескереді.",
    profileEmpty: "Профиль әлі толтырылмаған.",
    editProfile: "Профильді өзгерту",
    assistance: "Таңдауды нақтылау",
    relaxDistrict: "Ауданды кеңейту",
    includeHh: "HH қосу",
    compareReady: "Таңдалған вакансияларды салыстыруға болады.",
    compareWaiting: "Салыстыру үшін кемінде екі вакансия таңдаңыз.",
    selected: "Таңдалды",
    skills: "Дағдылар",
  },
} as const;

export function AiAssistantAside({
  canUseProfileContext,
  useProfileContext,
  onUseProfileContextChange,
  profile,
  profileContextSummary,
  selectedCount,
  onCompare,
  onRelaxDistrict,
  onIncludeHh,
  aiUnavailable,
  onRetryAi,
  layout = "aside",
}: {
  canUseProfileContext: boolean;
  useProfileContext: boolean;
  onUseProfileContextChange: (value: boolean) => void;
  profile: Profile | null | undefined;
  profileContextSummary: string[];
  selectedCount: number;
  onCompare: () => void;
  onRelaxDistrict: () => void;
  onIncludeHh: () => void;
  aiUnavailable: boolean;
  onRetryAi: () => void;
  layout?: "aside" | "inline";
}) {
  const { copy, locale } = useI18n();
  const text = asideCopy[locale];

  if (layout === "inline") {
    return (
      <aside
        className="rounded-xl border border-border/60 bg-muted/10 p-4"
        aria-label={text.title}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">{copy.applications.advisory}</p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {canUseProfileContext ? (
            <div
              className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border/50 bg-background/60 p-3 sm:max-w-sm"
              aria-label={text.profileContext}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <UserCircle className="size-4" weight="bold" />
                  {text.profileContext}
                </span>
                <Switch
                  size="sm"
                  checked={useProfileContext}
                  onCheckedChange={onUseProfileContextChange}
                  aria-label={text.profileContext}
                />
              </div>
              <ProfileSummary profile={profile} summary={profileContextSummary} locale={locale} />
              <Link to="/profile" className="w-fit text-xs font-medium text-primary hover:underline">
                {text.editProfile}
              </Link>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onRelaxDistrict}>
              <MapPin data-icon="inline-start" weight="bold" />
              {text.relaxDistrict}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onIncludeHh}>
              {text.includeHh}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onCompare}
              disabled={selectedCount < 2}
              className="min-w-0"
            >
              <Scales data-icon="inline-start" weight="bold" />
              {copy.ai.compare}
              <span className="tabular-nums">({selectedCount})</span>
            </Button>
          </div>
        </div>

        {aiUnavailable ? (
          <div className="mt-3">
            <AiUnavailableState onRetry={onRetryAi} />
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <DetailAside title={text.title} subtitle={text.subtitle} className="top-24">
      <div className="flex flex-col gap-5">
        <AiAdvisoryNotice title={copy.applications.ai} body={copy.applications.advisory} />

        {canUseProfileContext ? (
          <section className="rounded-lg border bg-background p-4" aria-label={text.profileContext}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserCircle weight="bold" />
                  {text.profileContext}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.profileBody}</p>
              </div>
              <Switch
                size="sm"
                checked={useProfileContext}
                onCheckedChange={onUseProfileContextChange}
                aria-label={text.profileContext}
              />
            </div>

            <ProfileSummary profile={profile} summary={profileContextSummary} locale={locale} />

            <Link to="/profile" className="mt-3 block">
              <Button type="button" size="sm" variant="outline" className="w-full">
                <IdentificationCard data-icon="inline-start" weight="bold" />
                {text.editProfile}
              </Button>
            </Link>
          </section>
        ) : null}

        <section className="rounded-lg border bg-background p-4" aria-label={text.assistance}>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb weight="bold" />
            {text.assistance}
          </p>
          <div className="mt-3 grid gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onRelaxDistrict}>
              <MapPin data-icon="inline-start" weight="bold" />
              {text.relaxDistrict}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onIncludeHh}>
              {text.includeHh}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border bg-background p-4" aria-label={copy.ai.compare}>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Scales weight="bold" />
            {copy.ai.compare}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedCount >= 2 ? text.compareReady : text.compareWaiting}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {text.selected}: <span className="font-medium tabular-nums text-foreground">{selectedCount}</span>
          </p>
          <Button type="button" className="mt-3 w-full" size="sm" onClick={onCompare} disabled={selectedCount < 2}>
            {copy.ai.compare}
          </Button>
        </section>

        {aiUnavailable ? <AiUnavailableState onRetry={onRetryAi} /> : null}
      </div>
    </DetailAside>
  );
}

function ProfileSummary({
  profile,
  summary,
  locale,
}: {
  profile: Profile | null | undefined;
  summary: string[];
  locale: Locale;
}) {
  const text = asideCopy[locale];
  const visible = summary.length
    ? summary
    : [
        profile?.city,
        profile?.district,
        ...(profile?.skills ?? []).slice(0, 4),
      ].filter((item): item is string => Boolean(item));

  if (!visible.length) {
    return <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{text.profileEmpty}</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {visible.map((item) => (
        <span key={item} className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}
