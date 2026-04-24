import { useQuery } from "convex/react";
import {
  ArrowRight,
  Buildings,
  ChatCircleText,
  Handshake,
  MapPin,
  PaperPlaneTilt,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import accentUrl from "@/assets/generated/jumysai-subtle-accent.png";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/shared/Button";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { VacancyCard } from "@/features/vacancies/VacancyCard";
import { api } from "@/lib/convex-api";
import { formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";

export function PublicHomePage() {
  const vacancies = useQuery(api.vacancies.listPublic, { limit: 12 });
  const { copy, locale } = useI18n();
  const trustCards = [
    { title: copy.publicHome.trustTitle, body: copy.vacancies.nativeHelper, icon: Handshake },
    { title: copy.publicHome.aiTitle, body: copy.ai.fallback, icon: ChatCircleText },
    { title: copy.publicHome.nativeAndHh, body: copy.vacancies.externalOnly, icon: Buildings },
  ];

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/86 backdrop-blur-xl">
        <div className="container-app flex min-h-[4.5rem] items-center justify-between gap-3">
          <BrandMark />
          <nav className="flex items-center gap-2 md:gap-5">
            <Link to="/vacancies" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground md:inline">
              {copy.nav.vacancies}
            </Link>
            <Link to="/ai-search" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground md:inline">
              {copy.nav.aiSearch}
            </Link>
            <LocaleToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">
                {copy.nav.signIn}
              </Button>
            </Link>
            <Link to="/login" className="hidden sm:block">
              <Button size="sm">{copy.publicHome.employerCta}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 opacity-90">
          <img src={accentUrl} alt="" className="size-full object-cover" loading="eager" />
        </div>
        <div className="absolute inset-0 hero-fade" />
        <div className="container-app relative grid min-h-[640px] gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.8fr)] lg:items-center">
          <motion.div {...motionPresets.page} className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/82 px-3 py-1.5 text-sm font-semibold text-primary shadow-sm">
              <MapPin weight="fill" />
              {copy.publicHome.heroKicker}
            </p>
            <h1 className="mt-6 max-w-2xl font-heading text-5xl font-extrabold leading-[0.98] tracking-tight text-foreground md:text-6xl">
              {copy.publicHome.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.publicHome.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/ai-search">
                <Button size="lg">
                  <Sparkle data-icon="inline-start" weight="fill" />
                  {copy.publicHome.seekerCta}
                </Button>
              </Link>
              <Link to="/vacancies">
                <Button size="lg" variant="outline">
                  {copy.publicHome.browseCta}
                  <ArrowRight data-icon="inline-end" weight="bold" />
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {trustCards.map(({ title }, index) => (
                  <span
                    key={String(title)}
                    className="grid size-9 place-items-center rounded-full border-2 border-background bg-card text-xs font-bold text-primary shadow-sm"
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <span>{copy.publicHome.trustTitle}</span>
            </div>
          </motion.div>

          <motion.div {...motionPresets.card} className="relative min-h-[430px]">
            <div className="absolute right-0 top-0 hidden h-72 w-72 rounded-full bg-primary/10 blur-3xl lg:block" />
            <div className="glass-panel relative overflow-hidden rounded-[1.75rem] p-4">
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/10 to-transparent" />
              <div className="relative rounded-2xl border bg-background/72 p-4 woven-grid">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">{copy.publicHome.liveVacancies}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{copy.publicHome.nativeAndHh}</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Sparkle weight="fill" />
                  </span>
                </div>
                <div className="mt-5 grid gap-3">
                  {vacancies === undefined
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <LoadingSkeleton key={index} variant="vacancy-card" />
                      ))
                    : vacancies.slice(0, 3).map((vacancy, index) => (
                        <motion.div
                          key={vacancy._id}
                          className="rounded-2xl border bg-card/92 p-4 shadow-card"
                          initial={{ opacity: 0, x: 24, rotate: index % 2 === 0 ? 1.5 : -1.5 }}
                          animate={{ opacity: 1, x: 0, rotate: index % 2 === 0 ? 1.5 : -1.5 }}
                          transition={{ type: "spring", stiffness: 120, damping: 18, delay: index * 0.08 }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <PreviewIcon index={index} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-foreground">
                                {copy.vacancies.title} {index + 1}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {vacancy.city}
                                {vacancy.district ? `, ${vacancy.district}` : ""}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-primary">{formatSalary(vacancy, locale)}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-b bg-card/48">
        <div className="container-app grid gap-3 py-5 md:grid-cols-[0.7fr_1fr] md:items-center">
          <p className="text-sm font-semibold text-muted-foreground">{copy.publicHome.trustTitle}</p>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {trustCards.map(({ title, icon: Icon }) => (
              <div key={String(title)} className="flex min-w-48 items-center gap-3 rounded-xl border bg-background/72 px-4 py-3">
                <Icon className="text-primary" weight="duotone" />
                <span className="truncate text-sm font-semibold">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app grid gap-6 py-10 md:grid-cols-[0.92fr_1.08fr] md:py-14">
        <SectionPanel title={copy.publicHome.howTitle} patterned>
          <div className="grid gap-4">
            {[copy.publicHome.seekerCta, copy.ai.understood, copy.publicHome.browseCta].map((item, index) => (
              <div key={item} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="border-b pb-4 last:border-b-0">
                  <p className="text-sm font-semibold text-foreground">{item}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.ai.privacy}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
        <div className="grid gap-4">
          {trustCards.map(({ title, body, icon: Icon }) => (
            <SectionPanel key={String(title)} className="shadow-none">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon weight="duotone" />
                </span>
                <div>
                  <h2 className="font-heading text-lg font-extrabold tracking-tight">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              </div>
            </SectionPanel>
          ))}
        </div>
      </section>

      <section className="container-app pb-12">
        <SectionPanel
          title={copy.publicHome.liveVacancies}
          subtitle={copy.publicHome.nativeAndHh}
          action={
            <Link to="/vacancies">
              <Button variant="outline" size="sm">
                {copy.nav.vacancies}
              </Button>
            </Link>
          }
        >
          {vacancies === undefined ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingSkeleton key={index} variant="vacancy-card" />
              ))}
            </div>
          ) : vacancies.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {vacancies.slice(0, 4).map((vacancy) => (
                <VacancyCard key={vacancy._id} vacancy={vacancy} compact />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.vacancies.noResults}</p>
          )}
        </SectionPanel>
      </section>

      <section className="container-app pb-12">
        <div className="overflow-hidden rounded-[1.75rem] bg-primary text-primary-foreground shadow-lift">
          <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="absolute inset-y-0 right-0 hidden w-1/3 opacity-25 ornament-subtle md:block" />
            <div className="relative">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary-foreground/80">
                <PaperPlaneTilt weight="bold" />
                {copy.publicHome.seekerCta}
              </p>
              <h2 className="mt-2 font-heading text-2xl font-extrabold tracking-tight md:text-3xl">
                {copy.publicHome.heroTitle}
              </h2>
            </div>
            <Link to="/vacancies" className="relative">
              <Button variant="secondary" size="lg">
                {copy.publicHome.browseCta}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="container-app grid gap-6 py-8 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-3">
            <BrandMark />
            <p className="max-w-xl leading-6">{copy.publicHome.footer}</p>
          </div>
          <Link to="/login" className="font-semibold text-primary hover:text-primary/80">
            {copy.publicHome.employerCta}
          </Link>
        </div>
      </footer>
    </main>
  );
}

function PreviewIcon({ index }: { index: number }) {
  const icons = [ShieldCheck, Handshake, Buildings] as const;
  const Icon = icons[index % icons.length];
  return <Icon weight="duotone" />;
}
