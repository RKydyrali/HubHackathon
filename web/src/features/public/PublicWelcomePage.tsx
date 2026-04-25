import {
  ArrowRight,
  BellRinging,
  Briefcase,
  Buildings,
  CheckCircle,
  MapPin,
  PaperPlaneTilt,
  Robot,
  ShieldCheck,
  Sparkle,
  TelegramLogo,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/shared/BrandMark";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { AuroraBackground } from "@/components/skiper/AuroraBackground";
import { Marquee } from "@/components/skiper/Marquee";
import { NumberTicker } from "@/components/skiper/NumberTicker";
import { ShimmerPill } from "@/components/skiper/ShimmerPill";
import { SpotlightCard } from "@/components/skiper/SpotlightCard";
import { Typewriter } from "@/components/skiper/Typewriter";
import { WordReveal } from "@/components/skiper/WordReveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/convex-api";
import { formatSalary } from "@/lib/format";
import { getTelegramBotUrl } from "@/lib/telegramBotUrl";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Vacancy } from "@/types/domain";

const aiSearchPath = "/ai-search";
const employerPath = "/employer/dashboard";
const publicGuideStorageKey = "jumysai.publicGuide.dismissed";

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const heroHighlightWords = ["Актау,", "Актау", "Ақтаудағы", "Ақтау"];

export function PublicWelcomePage() {
  const { copy } = useI18n();
  const reduceMotion = useReducedMotion();
  const vacancies = useQuery(api.vacancies.listPublic, { limit: 3 });
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 130, damping: 24, mass: 0.8 };

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <AuroraBackground />

      <GuestHeader />

      <motion.div
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } },
        }}
      >
        <motion.section
          variants={sectionVariants}
          transition={transition}
          className="container-app grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-10 pb-14 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:pb-20 lg:pt-14"
        >
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {copy.publicHome.heroKicker}
              </Badge>
              <ShimmerPill>{copy.publicHome.heroLivePill}</ShimmerPill>
            </div>
            <WordReveal
              as="h1"
              text={copy.publicHome.heroTitle}
              highlight={heroHighlightWords}
              className="mt-5 block max-w-4xl font-heading text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            />
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              {copy.publicHome.heroBody}
            </motion.p>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:items-center"
            >
              <Link
                to="/vacancies"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "group/cta relative overflow-hidden rounded-full",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
                />
                <span className="relative">{copy.publicHome.browseCta}</span>
                <ArrowRight
                  data-icon="inline-end"
                  weight="bold"
                  className="relative transition-transform duration-200 group-hover/cta:translate-x-0.5"
                />
              </Link>
              <Link
                to="/login"
                state={{ from: aiSearchPath }}
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full bg-card/85")}
              >
                <Sparkle data-icon="inline-start" weight="bold" />
                {copy.publicHome.findAiCta}
              </Link>
              <Link
                to="/login"
                state={{ from: employerPath }}
                className={cn(
                  buttonVariants({ size: "lg", variant: "ghost" }),
                  "rounded-full text-muted-foreground hover:text-foreground",
                )}
              >
                <Buildings data-icon="inline-start" weight="bold" />
                {copy.publicHome.employerEntry}
              </Link>
            </motion.div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {copy.publicHome.heroBadges.map((badge) => (
                <span key={badge} className="rounded-full border bg-card/70 px-3 py-1.5 shadow-card">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <HeroSpotlight />
        </motion.section>

        <HeroMarquee />

        <HeroStats />

        <motion.section
          variants={sectionVariants}
          transition={transition}
          className="container-app max-w-7xl pb-12 lg:pb-16"
          aria-labelledby="public-vacancies-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {copy.publicHome.liveVacancies}
              </p>
              <h2 id="public-vacancies-heading" className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {copy.publicHome.vacancyPreviewTitle}
              </h2>
            </div>
            <Link to="/vacancies" className={cn(buttonVariants({ variant: "outline" }), "rounded-full bg-card/80")}>
              {copy.publicHome.viewAllVacancies}
            </Link>
          </div>
          <VacancyPreview vacancies={vacancies as Vacancy[] | undefined} />
        </motion.section>

        <BentoSections />
      </motion.div>
    </main>
  );
}

function GuestHeader() {
  const { copy } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/82 backdrop-blur-xl">
      <div className="container-app flex min-h-16 max-w-7xl items-center justify-between gap-3 py-2">
        <BrandMark className="shrink-0" />
        <nav className="hidden items-center gap-2 md:flex" aria-label={copy.nav.vacancies}>
          <Link to="/vacancies" className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}>
            {copy.publicHome.browseCta}
          </Link>
          <Link to="/login" state={{ from: aiSearchPath }} className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}>
            {copy.publicHome.findAiCta}
          </Link>
          <Link to="/login" state={{ from: employerPath }} className={cn(buttonVariants({ variant: "outline" }), "rounded-full bg-card/80")}>
            {copy.publicHome.employerEntry}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LocaleToggle />
          </div>
          <Link to="/login" className={cn(buttonVariants({ variant: "outline" }), "rounded-full bg-card/80")}>
            {copy.nav.signIn}
          </Link>
        </div>
      </div>
      <div className="container-app grid max-w-7xl grid-cols-2 gap-2 pb-3 md:hidden">
        <Link to="/vacancies" className={cn(buttonVariants(), "rounded-full")}>
          {copy.publicHome.browseCta}
        </Link>
        <Link to="/login" state={{ from: aiSearchPath }} className={cn(buttonVariants({ variant: "outline" }), "rounded-full bg-card/85")}>
          {copy.publicHome.findAiCta}
        </Link>
      </div>
    </header>
  );
}

function HeroSpotlight() {
  const { copy } = useI18n();
  const reduceMotion = useReducedMotion();

  return (
    <motion.aside
      className="relative"
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      aria-label={copy.publicHome.aiDemoTitle}
    >
      <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden />
      <motion.div
        aria-hidden
        className="conic-ring absolute -inset-px rounded-[2rem] opacity-70"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        style={{ filter: "blur(14px)" }}
      />
      <div className="glass-panel relative overflow-hidden rounded-[2rem] p-4 shadow-lift sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-20%] size-72 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <ShimmerPill className="mb-2">{copy.publicHome.aiDemoKicker}</ShimmerPill>
            <h2 className="mt-1 font-heading text-xl font-bold tracking-tight">
              <span className="text-gradient-brand">{copy.publicHome.aiDemoTitle}</span>
            </h2>
          </div>
          <motion.span
            className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lift"
            animate={
              reduceMotion
                ? undefined
                : { boxShadow: [
                    "0 0 0 0 rgba(99,102,241,0.45)",
                    "0 0 0 12px rgba(99,102,241,0)",
                    "0 0 0 0 rgba(99,102,241,0)",
                  ] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          >
            <Sparkle weight="fill" aria-hidden />
          </motion.span>
        </div>

        <div className="relative mt-5 rounded-2xl border bg-background/90 p-3">
          <p className="text-xs font-medium text-muted-foreground">{copy.ai.inputLabel}</p>
          <div className="mt-2 rounded-xl bg-card p-3 text-sm leading-6 shadow-card">
            <Typewriter text={copy.publicHome.aiDemoPrompt} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border bg-card/80 px-3 py-2 text-sm text-muted-foreground">
            <PaperPlaneTilt weight="bold" className="shrink-0 text-primary" aria-hidden />
            <span>{copy.publicHome.aiDemoReply}</span>
          </div>
        </div>

        <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
          {copy.publicHome.aiDemoChips.map((chip, index) => (
            <motion.div
              key={chip}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30%" }}
              transition={{ delay: 0.2 + index * 0.08, duration: 0.5 }}
              className="rounded-xl border bg-card/72 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {chip}
            </motion.div>
          ))}
        </div>

        <div className="relative mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
          {copy.publicHome.authRequiredHint}
        </div>

        <FirstVisitGuide />
      </div>
    </motion.aside>
  );
}

function HeroMarquee() {
  const { copy } = useI18n();
  const items = copy.publicHome.heroBadgeMarquee;

  return (
    <section
      aria-label={copy.publicHome.liveVacancies}
      className="relative -mt-2 pb-8 lg:pb-10"
    >
      <Marquee durationSeconds={36} className="py-2">
        {items.map((label) => (
          <span
            key={label}
            className="mx-1 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card backdrop-blur"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-primary/70" />
            {label}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

function HeroStats() {
  const { copy } = useI18n();
  const reduceMotion = useReducedMotion();
  const stats = copy.publicHome.stats;

  return (
    <section aria-labelledby="public-stats-heading" className="container-app max-w-7xl pb-14 lg:pb-16">
      <p id="public-stats-heading" className="sr-only">
        {stats.kicker}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <SpotlightCard className="h-full rounded-[1.5rem] border bg-card/85 p-5 shadow-card">
              <div className="flex items-baseline gap-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                <NumberTicker
                  value={item.value}
                  className="text-gradient-brand"
                  durationSeconds={1.4 + index * 0.2}
                />
                <span className="text-gradient-brand">{item.suffix}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.label}</p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function hasDismissedPublicGuide() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(publicGuideStorageKey) === "true";
  } catch {
    return false;
  }
}

function persistPublicGuideDismissal() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(publicGuideStorageKey, "true");
  } catch {
    // Storage can be unavailable in private contexts; hiding still keeps the UI non-blocking.
  }
}

function FirstVisitGuide() {
  const { copy } = useI18n();
  const reduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(() => !hasDismissedPublicGuide());
  const [stepIndex, setStepIndex] = useState(0);

  if (!isVisible) {
    return null;
  }

  const guide = copy.publicHome.guide;
  const isLastStep = stepIndex === guide.steps.length - 1;
  const currentStep = guide.steps[stepIndex];
  const primaryLabel = isLastStep ? guide.done : guide.next;

  const dismiss = () => {
    persistPublicGuideDismissal();
    setIsVisible(false);
  };

  const goNext = () => {
    if (isLastStep) {
      dismiss();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, guide.steps.length - 1));
  };

  return (
    <motion.section
      aria-label={guide.ariaLabel}
      aria-describedby="public-guide-step"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 24 }}
      className="mt-4 rounded-2xl border border-primary/15 bg-background/92 p-3 shadow-card"
    >
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
          <Robot weight="duotone" className="size-7" />
          <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-success" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {guide.stepLabel} {stepIndex + 1}/{guide.steps.length}
          </p>
          <p id="public-guide-step" className="mt-1 text-sm leading-6 text-foreground">
            {currentStep}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label={guide.skip}
              onClick={dismiss}
              className={cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "h-8 rounded-full px-3 text-xs text-muted-foreground",
              )}
            >
              {guide.skip}
            </button>
            <button
              type="button"
              aria-label={primaryLabel}
              onClick={goNext}
              className={cn(buttonVariants({ size: "sm" }), "h-8 rounded-full px-3 text-xs")}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function VacancyPreview({ vacancies }: { vacancies: Vacancy[] | undefined }) {
  const { copy, locale } = useI18n();

  if (vacancies === undefined) {
    return (
      <div className="mt-5">
        <p className="mb-3 text-sm font-medium text-muted-foreground">{copy.publicHome.vacanciesLoading}</p>
        <div className="grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[1.5rem] border bg-card/70 p-4 shadow-card">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="mt-4 h-5 w-4/5 rounded-md" />
              <Skeleton className="mt-3 h-4 w-1/2 rounded-md" />
              <Skeleton className="mt-5 h-10 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!vacancies.length) {
    return (
      <div className="mt-5 rounded-[1.75rem] border bg-card/82 p-6 shadow-card">
        <p className="font-heading text-lg font-semibold">{copy.publicHome.vacanciesEmptyTitle}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{copy.publicHome.vacanciesEmptyBody}</p>
        <Link to="/vacancies" className={cn(buttonVariants({ variant: "outline" }), "mt-4 rounded-full")}>
          {copy.publicHome.viewAllVacancies}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-3">
      {vacancies.slice(0, 3).map((vacancy, index) => (
        <motion.div
          key={vacancy._id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 140, damping: 22 }}
        >
          <SpotlightCard className="h-full">
            <article className="flex h-full flex-col rounded-[1.5rem] border bg-card/86 p-4 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {vacancy.source === "hh" ? "HH.kz" : copy.brand}
                  </p>
                  <h3 className="mt-2 line-clamp-2 font-heading text-lg font-bold leading-snug tracking-tight">
                    {vacancy.title}
                  </h3>
                </div>
                <motion.span
                  whileHover={{ rotate: -6, scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 240, damping: 14 }}
                  className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"
                >
                  <Briefcase weight="bold" aria-hidden />
                </motion.span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{vacancy.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {vacancy.district ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
                    <MapPin weight="fill" className="size-3 text-primary/80" aria-hidden />
                    {vacancy.district}
                  </span>
                ) : null}
                <span className="rounded-full border bg-background px-2.5 py-1">
                  {formatSalary(vacancy, locale)}
                </span>
              </div>
              <Link
                to={`/vacancies/${vacancy._id}`}
                className={cn(buttonVariants({ variant: "outline" }), "mt-auto w-full rounded-full bg-background")}
              >
                {copy.publicHome.openVacancy}
                <ArrowRight data-icon="inline-end" weight="bold" />
              </Link>
            </article>
          </SpotlightCard>
        </motion.div>
      ))}
    </div>
  );
}

function BentoSections() {
  const { copy } = useI18n();
  const telegramBotUrl = getTelegramBotUrl(import.meta.env);

  const featureIcons = [MapPin, Sparkle, TelegramLogo, Buildings] as const;
  const roleIcons = [Briefcase, Buildings] as const;

  return (
    <>
      <section className="container-app grid max-w-7xl gap-4 pb-12 lg:grid-cols-[1.25fr_0.75fr] lg:pb-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {copy.publicHome.features.map((feature, index) => {
            const FeatureIcon = featureIcons[index] ?? CheckCircle;
            return (
              <motion.div
                key={feature.title}
                variants={sectionVariants}
                className={cn(
                  "rounded-[1.75rem] border bg-card/84 p-5 shadow-card",
                  index === 1 && "sm:translate-y-6",
                )}
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FeatureIcon weight="bold" aria-hidden />
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div variants={sectionVariants} className="rounded-[2rem] border bg-card/88 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {copy.publicHome.telegramKicker}
          </p>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight">{copy.publicHome.telegramTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.publicHome.telegramBody}</p>
          <div className="mt-5 rounded-2xl border bg-background/85 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <BellRinging weight="bold" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{copy.publicHome.telegramCardTitle}</p>
                <p className="text-xs text-muted-foreground">{copy.publicHome.authRequiredHint}</p>
              </div>
            </div>
          </div>
          <a
            href={telegramBotUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 rounded-full")}
          >
            <TelegramLogo data-icon="inline-start" weight="bold" />
            {copy.publicHome.telegramCta}
          </a>
        </motion.div>
      </section>

      <section className="container-app grid max-w-7xl gap-4 pb-12 lg:grid-cols-2 lg:pb-16">
        {copy.publicHome.roleCards.map((role, index) => {
          const RoleIcon = roleIcons[index] ?? Briefcase;
          const href = index === 0 ? "/vacancies" : "/login";
          const state = index === 0 ? undefined : { from: employerPath };
          return (
            <motion.article key={role.title} variants={sectionVariants} className="rounded-[2rem] border bg-card/86 p-5 shadow-card">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <RoleIcon weight="bold" aria-hidden />
              </span>
              <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight">{role.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{role.body}</p>
              <Link
                to={href}
                state={state}
                className={cn(
                  buttonVariants({ variant: index === 0 ? "default" : "outline" }),
                  "mt-5 rounded-full",
                )}
              >
                {role.cta}
              </Link>
            </motion.article>
          );
        })}
      </section>

      <section className="container-app max-w-7xl pb-16 lg:pb-20">
        <motion.div variants={sectionVariants} className="rounded-[2rem] border bg-card/88 p-5 shadow-card sm:p-6">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {copy.publicHome.howTitle}
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight">{copy.publicHome.howHeading}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.publicHome.trustNote}</p>
            </div>
            <div className="grid gap-3">
              {copy.publicHome.steps.map((step, index) => (
                <div key={step.title} className="grid gap-3 rounded-2xl border bg-background/82 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-base font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-start">
            <ShieldCheck className="size-5 shrink-0 text-primary" weight="bold" aria-hidden />
            <p>{copy.publicHome.aiTrustNote}</p>
          </div>
        </motion.div>
      </section>
    </>
  );
}
