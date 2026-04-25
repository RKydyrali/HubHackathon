import { faker } from "@faker-js/faker";
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import type { ApplicationStatus } from "../lib/constants";
import { EMBEDDING_DIMENSION } from "../lib/constants";
import { recalculateCompanyTrustMetrics } from "../lib/companyTrust";
import {
  BENEFITS_POOL,
  AKTAU_MICRODISTRICTS,
  COLLEGES,
  COMPANY_NAME_STEMS,
  COMPANY_SUFFIXES,
  COMPANY_TYPES,
  CONVERSATION_PAIRS,
  FIRST_NAMES,
  formatCompanyAddress,
  INDUSTRIES_WEIGHTED,
  JOB_TITLES,
  LAST_NAMES,
  pick,
  pickMarketCity,
  pickResidentialAreaForCity,
  pickVacancyMicrodistrictOrArea,
  SKILLS_POOL,
  STREETS,
  UNIVERSITIES,
  weightedPick,
} from "./mangystauDict";

const CHUNK_EMPLOYERS = 20;
const CHUNK_SEEKERS = 25;
const CHUNK_VACANCIES = 24;
const CHUNK_APP_VAC = 8;
const CHUNK_EXTRAS = 40;

function zeroEmbedding(): number[] {
  return new Array(EMBEDDING_DIMENSION).fill(0);
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(raw: string, suffix: string): string {
  const base = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "co"}-${suffix}`;
}

function kztSalaryRange(level: string, industry: string): { min: number; max: number } {
  const oil = industry === "oil_gas" || industry === "marine_port" ? 1.15 : 1;
  const mult =
    level === "intern"
      ? [180_000, 320_000]
      : level === "junior"
        ? [280_000, 520_000]
        : level === "middle"
          ? [380_000, 780_000]
          : level === "senior"
            ? [550_000, 1_200_000]
            : [700_000, 1_650_000];
  return {
    min: Math.round(mult[0]! * oil),
    max: Math.round(mult[1]! * oil),
  };
}

function pickVacancyStatus(rng: () => number): "draft" | "published" | "paused" | "archived" {
  const r = rng();
  if (r < 0.68) return "published";
  if (r < 0.8) return "draft";
  if (r < 0.9) return "paused";
  return "archived";
}

function pickFinalApplicationStatus(rng: () => number): ApplicationStatus {
  const r = rng();
  if (r < 0.22) return "reviewing";
  if (r < 0.48) return "rejected";
  if (r < 0.58) return "withdrawn";
  if (r < 0.72) return "shortlisted";
  if (r < 0.82) return "interview";
  if (r < 0.92) return "offer_sent";
  return "hired";
}

function buildStatusPath(final: ApplicationStatus, rng: () => number): ApplicationStatus[] {
  if (final === "submitted") return ["submitted"];
  if (final === "withdrawn") {
    return rng() < 0.55 ? ["submitted", "withdrawn"] : ["submitted", "reviewing", "withdrawn"];
  }
  const base: ApplicationStatus[] = ["submitted", "reviewing"];
  if (final === "reviewing") return base;
  if (final === "rejected") {
    return rng() < 0.42 ? [...base, "rejected"] : [...base, "shortlisted", "rejected"];
  }
  if (final === "shortlisted") {
    return [...base, "shortlisted"];
  }
  const withShortlist = rng() < 0.48;
  const toInterview: ApplicationStatus[] = withShortlist
    ? [...base, "shortlisted", "interview"]
    : [...base, "interview"];
  if (final === "interview") return toInterview;
  if (final === "offer_sent") {
    return [...toInterview, "offer_sent"];
  }
  if (final === "hired") {
    return rng() < 0.48 ? [...toInterview, "hired"] : [...toInterview, "offer_sent", "hired"];
  }
  return toInterview;
}

const CLEAR_PAGE = 96;

const CLEAR_TABLE_ORDER = [
  "companyTrustMetrics",
  "companyComplaints",
  "applicationMessages",
  "applicationStatusEvents",
  "savedVacancies",
  "notifications",
  "interviews",
  "applications",
  "vacancies",
  "profiles",
  "companies",
  "users",
] as const;

/** One small indexed read + deletes — safe under Convex per-execution read limits. */
async function clearOneSeedPage(ctx: MutationCtx, batchId: string): Promise<boolean> {
  for (const table of CLEAR_TABLE_ORDER) {
    const docs = await ctx.db
      .query(table)
      .withIndex("by_seedBatchId", (q) => q.eq("seedBatchId", batchId))
      .take(CLEAR_PAGE);
    if (docs.length > 0) {
      for (const d of docs) {
        await ctx.db.delete(d._id);
      }
      return true;
    }
  }
  const scratch = await ctx.db
    .query("seedScratchpads")
    .withIndex("by_batchId", (q) => q.eq("batchId", batchId))
    .take(16);
  for (const s of scratch) {
    await ctx.db.delete(s._id);
  }
  return scratch.length > 0;
}

/** Deletes one page per call; loop from CLI until `{ more: false }`. */
export const clear = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const more = await clearOneSeedPage(ctx, args.batchId);
    return { ok: !more, more };
  },
});

export const run = internalMutation({
  args: {
    batchId: v.string(),
    scale: v.number(),
    clearFirst: v.boolean(),
    /** Exact-ish vacancy count (e.g. 300). When set, overrides scale-based vacancy formula. */
    vacancyTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scale = Math.max(0, Math.min(1, args.scale));
    if (args.clearFirst) {
      const moreToClear = await clearOneSeedPage(ctx, args.batchId);
      if (moreToClear) {
        return { phase: "clearing" as const, needsMore: true as const };
      }
    }

    let scratch = await ctx.db
      .query("seedScratchpads")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!scratch) {
      const vacancyCount =
        args.vacancyTarget !== undefined
          ? Math.max(40, Math.min(2000, Math.round(args.vacancyTarget)))
          : Math.round(400 + scale * 620);
      const userCount =
        args.vacancyTarget !== undefined
          ? Math.max(180, Math.round(vacancyCount * 1.35))
          : Math.round(300 + scale * 500);
      const employerCount = Math.max(10, Math.min(150, Math.round(vacancyCount * 0.13)));
      const seekerCount = Math.max(50, userCount - employerCount);
      const applicationCount = Math.min(Math.round(vacancyCount * 3.6), 12_000);

      await ctx.db.insert("seedScratchpads", {
        batchId: args.batchId,
        scale,
        phase: "employers",
        phaseOffset: 0,
        targetEmployers: employerCount,
        targetSeekers: seekerCount,
        targetVacancies: vacancyCount,
        targetApplications: applicationCount,
        employerUserIds: [],
        companyIds: [],
        seekerUserIds: [],
        vacancyIds: [],
        applicationIds: [],
      });
      scratch = await ctx.db
        .query("seedScratchpads")
        .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
        .first();
    }

    if (!scratch) {
      throw new Error("seed scratch missing");
    }

    const rng = mulberry32(hash32(`${args.batchId}:${scratch.phase}:${scratch.phaseOffset}`));
    faker.seed(hash32(`${args.batchId}:${scratch.phase}`));

    if (scratch.phase === "employers") {
      const end = Math.min(scratch.phaseOffset + CHUNK_EMPLOYERS, scratch.targetEmployers);
      const employers: Id<"users">[] = [...scratch.employerUserIds];
      const companies: Id<"companies">[] = [...scratch.companyIds];
      for (let i = scratch.phaseOffset; i < end; i++) {
        const industry = weightedPick(rng, INDUSTRIES_WEIGHTED);
        const stem = pick(rng, COMPANY_NAME_STEMS);
        const suf = pick(rng, COMPANY_SUFFIXES);
        const coType = pick(rng, COMPANY_TYPES);
        const name = `${coType} «${stem} ${suf}»`;
        const slug = slugify(`${stem}-${suf}`, `e${i}`);
        const city = pickMarketCity(rng);
        const { line: addressLine, district: companyDistrict } = formatCompanyAddress(rng, city);
        const clerkId = `seed_${slugify(args.batchId, "b")}_emp_${i}_${hash32(args.batchId + i) % 100000}`;
        const ownerId = await ctx.db.insert("users", {
          clerkId,
          role: "employer",
          isBotLinked: false,
          seedBatchId: args.batchId,
        });
        const logoUrl = `https://placehold.co/144x144/0f172a/e2e8f0/png?text=${encodeURIComponent(stem.slice(0, 3))}`;
        const companyId = await ctx.db.insert("companies", {
          slug,
          name,
          legalName: `${name} (РК)`,
          description: `${name} — ${industry.labelRu} в регионе Мангистау. Работаем с промышленными и сервисными контрактами, соблюдаем стандарты ПБ и экологии.`,
          industry: industry.labelRu,
          companyType: coType,
          address: addressLine,
          city,
          district: companyDistrict,
          logoUrl,
          phone: `+7 (7${Math.floor(rng() * 10)}) ${200 + Math.floor(rng() * 800)}-${10 + Math.floor(rng() * 89)}-${10 + Math.floor(rng() * 89)}`,
          email: `hr.${slug}@seed-jumysai.kz`,
          website: rng() < 0.45 ? `https://${slug.slice(0, 24)}.example.kz` : undefined,
          ownerUserId: ownerId,
          companyTrustScore: 0,
          seedBatchId: args.batchId,
        });
        employers.push(ownerId);
        companies.push(companyId);
      }
      const nextOff = end;
      const nextPhase = nextOff >= scratch.targetEmployers ? "seekers" : "employers";
      await ctx.db.patch(scratch._id, {
        employerUserIds: employers,
        companyIds: companies,
        phase: nextPhase,
        phaseOffset: nextPhase === "seekers" ? 0 : nextOff,
      });
    } else if (scratch.phase === "seekers") {
      const end = Math.min(scratch.phaseOffset + CHUNK_SEEKERS, scratch.targetSeekers);
      const seekers: Id<"users">[] = [...scratch.seekerUserIds];
      for (let i = scratch.phaseOffset; i < end; i++) {
        const fn = pick(rng, FIRST_NAMES);
        const ln = pick(rng, LAST_NAMES);
        const fullName = `${fn} ${ln}`;
        const city = pickMarketCity(rng);
        const clerkId = `seed_${slugify(args.batchId, "b")}_seek_${i}_${hash32(`${args.batchId}s${i}`) % 100000}`;
        const userId = await ctx.db.insert("users", {
          clerkId,
          role: "seeker",
          isBotLinked: false,
          seedBatchId: args.batchId,
          notificationPreferences: {
            inApp: true,
            telegram: false,
            newApplications: true,
            statusChanges: true,
            interviews: true,
            aiRecommendations: true,
          },
        });
        const district = pickResidentialAreaForCity(rng, city);
        const expLevel = pick(rng, ["junior", "middle", "senior"] as const);
        const uni = pick(rng, UNIVERSITIES);
        const college = rng() < 0.25 ? pick(rng, COLLEGES) : undefined;
        const skills = faker.helpers.arrayElements([...SKILLS_POOL], { min: 4, max: 10 });
        const salaryBand = kztSalaryRange(expLevel === "junior" ? "junior" : "middle", "it");
        const resumeRu = [
          `${fullName}, ${city}.`,
          college
            ? `Базовое образование: ${college}; дополнительно курсы по охране труда.`
            : `Образование: ${uni}.`,
          `Опыт: ${expLevel === "junior" ? "2–4" : expLevel === "middle" ? "4–8" : "8+"} лет в смежных проектах региона.`,
          `Ищу стабильного работодателя в Мангистау, готов к вахте и командировкам на Курык/Жанаозен.`,
        ].join("\n");
        await ctx.db.insert("profiles", {
          userId,
          fullName,
          city,
          district,
          bio:
            rng() < 0.5
              ? `Инженерно-технический бэкграунд, ориентир на безопасность и предсказуемые процессы.`
              : `Клиентоориентированный специалист, опыт работы в многонациональных командах.`,
          skills,
          resumeText: resumeRu,
          embedding: zeroEmbedding(),
          phone: `+7 (7${Math.floor(rng() * 10)}) ${300 + Math.floor(rng() * 700)}-${20 + Math.floor(rng() * 79)}-${20 + Math.floor(rng() * 79)}`,
          emailPublic: `${slugify(fn + ln, String(i)).replace(/-/g, "")}@inbox.seed.kz`,
          avatarUrl: `https://placehold.co/96x96/f1f5f9/334155/png?text=${encodeURIComponent(fn.slice(0, 1))}`,
          preferredSalaryMin: salaryBand.min,
          preferredSalaryMax: salaryBand.max + Math.floor(rng() * 120_000),
          preferredCurrency: "KZT",
          workFormatPreference: pick(rng, ["office", "hybrid", "field", "remote"] as const),
          employmentTypes: faker.helpers.arrayElements(
            ["full_time", "part_time", "contract", "rotational"] as const,
            { min: 1, max: 3 },
          ),
          educationSummary: college ? `${college} — специальность по профилю` : `${uni}, бакалавриат`,
          experienceSummary: `Ведущие роли на объектах Западного Казахстана; есть допуски и медкомиссия.`,
          seedBatchId: args.batchId,
        });
        seekers.push(userId);
      }
      const nextOff = end;
      const nextPhase = nextOff >= scratch.targetSeekers ? "vacancies" : "seekers";
      await ctx.db.patch(scratch._id, {
        seekerUserIds: seekers,
        phase: nextPhase,
        phaseOffset: nextPhase === "vacancies" ? 0 : nextOff,
      });
    } else if (scratch.phase === "vacancies") {
      const vacIds: Id<"vacancies">[] = [...scratch.vacancyIds];
      const nCompanies = Math.max(1, scratch.companyIds.length);
      let created = 0;
      while (created < CHUNK_VACANCIES && vacIds.length < scratch.targetVacancies) {
        const cIdx = vacIds.length % nCompanies;
        const companyId = scratch.companyIds[cIdx]!;
        const employerUserId = scratch.employerUserIds[cIdx]!;
        const company = await ctx.db.get(companyId);
        if (!company) {
          break;
        }
        const industryKey =
          INDUSTRIES_WEIGHTED.find((x) => x.labelRu === company.industry)?.id ?? "industrial";
        const titles = JOB_TITLES[industryKey] ?? JOB_TITLES.industrial;
        const title = pick(rng, titles);
        const level = pick(rng, ["junior", "middle", "senior", "lead"] as const);
        const { min, max } = kztSalaryRange(level, industryKey);
        const status = pickVacancyStatus(rng);
        const now = Date.now();
        const publishedAt =
          status === "published" || status === "paused" || status === "archived"
            ? now - Math.floor(rng() * 60 * 24 * 60 * 60 * 1000)
            : undefined;
        const expiresAt =
          publishedAt && (status === "published" || status === "paused")
            ? publishedAt + (14 + Math.floor(rng() * 32)) * 24 * 60 * 60 * 1000
            : undefined;
        const workFormat = pick(rng, ["office", "hybrid", "remote", "field"] as const);
        const employmentType = pick(
          rng,
          ["full_time", "part_time", "contract", "rotational", "internship"] as const,
        );
        const langs = faker.helpers.arrayElements(
          [
            "Казахский — устно и письменно",
            "Русский — устно и письменно",
            "Английский — техническая переписка",
          ],
          { min: 2, max: 3 },
        );
        const benefits = faker.helpers.arrayElements([...BENEFITS_POOL], { min: 2, max: 5 });
        const sourceId = `native_${slugify(args.batchId, "v")}_${vacIds.length}_${hash32(`${cIdx}${vacIds.length}`) % 1_000_000}`;
        const vacancyDistrict = pickVacancyMicrodistrictOrArea(rng, company);
        const descriptionParts = [
          `${company.name} ищет **${title}** в ${company.city}.`,
          "",
          "**Обязанности:**",
          `- ${title.includes("Инженер") ? "Контроль исполнения регламентов и сменных заданий" : "Операционная работа по профилю смены"}`,
          `- Взаимодействие с смежными службами и подрядчиками`,
          `- Участие в расследованиях инцидентов и мелких улучшениях процесса`,
          "",
          "**Требования:**",
          `- Опыт от ${level === "junior" ? "1–2" : level === "middle" ? "3–5" : "6+"} лет в ${company.industry.toLowerCase()}`,
          `- Готовность к работе в ${workFormat === "field" ? "полевых условиях / на объекте" : workFormat === "remote" ? "удалённом формате по согласованию" : "офисно-вахтовом ритме"}`,
          `- Знание ПО и процессов, типичных для отрасли`,
          "",
          `**Условия:** ${benefits.join("; ")}.`,
        ];
        if (company.city === "Актау" && vacancyDistrict) {
          descriptionParts.push(
            "",
            `**Локация в Актау:** ${vacancyDistrict} (ориентир для кандидатов и фильтров на карте).`,
          );
        }
        const description = descriptionParts.join("\n");

        const vacancyId = await ctx.db.insert("vacancies", {
          ownerUserId: employerUserId,
          companyId,
          source: "native",
          sourceId,
          status,
          title,
          description,
          city: company.city,
          district: vacancyDistrict,
          salaryMin: min,
          salaryMax: max + Math.floor(rng() * 90_000),
          salaryCurrency: "KZT",
          screeningQuestions:
            rng() < 0.35
              ? [
                  "Есть ли у вас действующие допуски для работы на производстве?",
                  "Какой формат занятости вам комфортен в ближайшие 6 месяцев?",
                ]
              : undefined,
          embedding: zeroEmbedding(),
          publishedAt,
          expiresAt,
          employmentType,
          experienceLevel:
            level === "junior"
              ? "junior"
              : level === "middle"
                ? "middle"
                : level === "senior"
                  ? "senior"
                  : "lead",
          workFormat,
          languageRequirements: langs,
          benefits,
          requirements: `См. блок требований; уровень: ${level}. Языки: ${langs.join(", ")}.`,
          responsibilities: `Сменные задачи по роли «${title}»; отчётность по KPI цеха/участка.`,
          seedBatchId: args.batchId,
        });
        vacIds.push(vacancyId);
        created++;
      }
      const nextPhase = vacIds.length >= scratch.targetVacancies ? "applications" : "vacancies";
      await ctx.db.patch(scratch._id, {
        vacancyIds: vacIds,
        phase: nextPhase,
        phaseOffset: nextPhase === "applications" ? 0 : 0,
      });
    } else if (scratch.phase === "applications") {
      const vacList = scratch.vacancyIds;
      const seekList = scratch.seekerUserIds;
      const end = Math.min(scratch.phaseOffset + CHUNK_APP_VAC, vacList.length);
      const appIds: Id<"applications">[] = [...scratch.applicationIds];

      for (let vi = scratch.phaseOffset; vi < end; vi++) {
        const vacancyId = vacList[vi]!;
        const vacancy = await ctx.db.get(vacancyId);
        if (!vacancy || vacancy.status !== "published" || !vacancy.ownerUserId) {
          continue;
        }
        const appRoll = rng();
        const baseApps =
          appRoll < 0.38
            ? 0
            : appRoll < 0.66
              ? 1
              : appRoll < 0.82
                ? 2
                : appRoll < 0.92
                  ? 3
                  : 5;
        const targetApps = Math.min(11, baseApps + Math.floor(rng() * 2));
        const usedSeekers = new Set<Id<"users">>();
        let tries = 0;
        while (usedSeekers.size < targetApps && tries < seekList.length * 2) {
          tries++;
          const seekerUserId = pick(rng, seekList);
          if (usedSeekers.has(seekerUserId)) continue;
          usedSeekers.add(seekerUserId);

          const finalSt = pickFinalApplicationStatus(rng);
          const path = buildStatusPath(finalSt, rng);
          const t0 = Date.now() - Math.floor(rng() * 50 * 24 * 3600 * 1000);
          const applicationId = await ctx.db.insert("applications", {
            vacancyId,
            seekerUserId,
            status: path[path.length - 1]!,
            screeningAnswers:
              vacancy.screeningQuestions && rng() < 0.6
                ? vacancy.screeningQuestions.map((question, qi) => ({
                    question,
                    answer:
                      qi === 0
                        ? rng() < 0.7
                          ? "Иә / Да, бар."
                          : "Жаңартуда / В процессе продления."
                        : "Вахта 14/14 немесе 28/28 — талқылауға дайынмын.",
                  }))
                : undefined,
            aiScore: rng() < 0.4 ? Math.floor(55 + rng() * 40) : undefined,
            aiSummary:
              rng() < 0.4
                ? "Автоматикалық скрининг: дағдылар мен орын тұрғысынан орташа-жоғары сәйкестік."
                : undefined,
            seedBatchId: args.batchId,
          });
          appIds.push(applicationId);

          let prev: ApplicationStatus | undefined;
          let t = t0;
          for (const st of path) {
            await ctx.db.insert("applicationStatusEvents", {
              applicationId,
              fromStatus: prev,
              toStatus: st,
              changedAt: t,
              actorUserId: st === "withdrawn" ? seekerUserId : vacancy.ownerUserId,
              seedBatchId: args.batchId,
            });
            t += Math.floor((2 + rng() * 72) * 3600 * 1000);
            prev = st;
          }

          if (path.includes("interview") && finalSt !== "withdrawn" && finalSt !== "rejected") {
            const completed = finalSt === "hired" || (finalSt === "offer_sent" && rng() < 0.6);
            await ctx.db.insert("interviews", {
              applicationId,
              vacancyId,
              employerUserId: vacancy.ownerUserId,
              seekerUserId,
              scheduledAt: t - Math.floor(rng() * 8 * 24 * 3600 * 1000),
              locationOrLink:
                rng() < 0.5
                  ? vacancy.city === "Актау"
                    ? `${vacancy.city}, офис: ${pick(rng, AKTAU_MICRODISTRICTS)}`
                    : `${vacancy.city}, офис: ${pick(rng, STREETS)}`
                  : "https://meet.example.kz/screening",
              status: completed ? "completed" : pick(rng, ["scheduled", "completed"] as const),
              seedBatchId: args.batchId,
            });
          }

          if (
            rng() < 0.38 &&
            path.length > 1 &&
            finalSt !== "withdrawn" &&
            finalSt !== "rejected"
          ) {
            const conv = pick(rng, CONVERSATION_PAIRS);
            let mt = t0 + 3600 * 1000;
            for (let li = 0; li < conv.lines.length; li++) {
              const fromEmployer = li % 2 === 0;
              await ctx.db.insert("applicationMessages", {
                applicationId,
                senderUserId: fromEmployer ? vacancy.ownerUserId! : seekerUserId,
                recipientUserId: fromEmployer ? seekerUserId : vacancy.ownerUserId!,
                body: conv.lines[li]!,
                createdAt: mt,
                readAt: mt + Math.floor(rng() * 3600 * 12 * 1000),
                seedBatchId: args.batchId,
              });
              mt += Math.floor(rng() * 6 * 3600 * 1000);
            }
          }

          if (
            vacancy.companyId &&
            (finalSt === "rejected" || finalSt === "withdrawn") &&
            rng() < 0.06
          ) {
            await ctx.db.insert("companyComplaints", {
              companyId: vacancy.companyId,
              authorUserId: seekerUserId,
              vacancyId,
              applicationId,
              kind: finalSt === "withdrawn" ? "no_response" : "misleading_vacancy",
              details:
                finalSt === "withdrawn"
                  ? "Seed: candidate withdrew after delayed employer communication."
                  : "Seed: candidate reported mismatch between vacancy and process.",
              status: rng() < 0.58 ? "valid" : "rejected",
              createdAt: t + Math.floor(rng() * 3 * 24 * 3600 * 1000),
              seedBatchId: args.batchId,
            });
          }
        }
        if (vacancy.companyId) {
          await recalculateCompanyTrustMetrics(ctx, vacancy.companyId);
        }
      }

      const nextOff = end;
      const nextPhase = nextOff >= vacList.length ? "extras" : "applications";
      await ctx.db.patch(scratch._id, {
        applicationIds: appIds,
        phase: nextPhase,
        phaseOffset: nextPhase === "extras" ? 0 : nextOff,
      });
    } else if (scratch.phase === "extras") {
      const seekList = scratch.seekerUserIds;
      const vacList = scratch.vacancyIds;
      const start = scratch.phaseOffset;
      const end = Math.min(start + CHUNK_EXTRAS, seekList.length);
      for (let i = start; i < end; i++) {
        const uid = seekList[i]!;
        if (rng() < 0.22) {
          const vId = pick(rng, vacList);
          const existing = await ctx.db
            .query("savedVacancies")
            .withIndex("by_userId_vacancyId", (q) =>
              q.eq("userId", uid).eq("vacancyId", vId),
            )
            .first();
          if (!existing) {
            await ctx.db.insert("savedVacancies", {
              userId: uid,
              vacancyId: vId,
              savedAt: Date.now() - Math.floor(rng() * 20 * 24 * 3600 * 1000),
              seedBatchId: args.batchId,
            });
            await ctx.db.insert("notifications", {
              userId: uid,
              type: "custom",
              dedupeKey: `seed:save:${args.batchId}:${uid}:${vId}`,
              title: "Вакансия сақталды / Сохранена вакансия",
              body: "Сіз таңдаған жұмыс орны тізіміңізге қосылды.",
              deliveryStatus: "skipped",
              sentAt: Date.now(),
              seedBatchId: args.batchId,
            });
          }
        }
        if (rng() < 0.18) {
          const vId = pick(rng, vacList);
          const vacForMatch = await ctx.db.get(vId);
          const matchTitle = vacForMatch?.title ?? "Жаңа вакансия";
          await ctx.db.insert("notifications", {
            userId: uid,
            type: "strong_match",
            dedupeKey: `seed:match:${args.batchId}:${uid}:${vId}`,
            title: "Жаңа сәйкес вакансия",
            body: `«${matchTitle}» индексті іріктеу бойынша жаңа ұсыныс.`,
            deliveryStatus: "skipped",
            sentAt: Date.now(),
            readAt: rng() < 0.45 ? Date.now() - 1000 : undefined,
            seedBatchId: args.batchId,
          });
        }
        if (rng() < 0.08) {
          await ctx.db.insert("notifications", {
            userId: uid,
            type: "custom",
            dedupeKey: `seed:sys:${args.batchId}:${uid}:${i}`,
            title: "Жаңарту: JumysAI",
            body: "Хабарландырулар мен сүзгілер жаңартылды — тест деректері.",
            deliveryStatus: "skipped",
            sentAt: Date.now(),
            seedBatchId: args.batchId,
          });
        }
      }
      const nextOff = end;
      const nextPhase = nextOff >= seekList.length ? "done" : "extras";
      await ctx.db.patch(scratch._id, {
        phase: nextPhase,
        phaseOffset: nextOff,
      });
    }

    const updated = await ctx.db
      .query("seedScratchpads")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .first();

    if (updated?.phase === "done") {
      await ctx.db.delete(updated._id);
    }

    return {
      phase: updated?.phase ?? "done",
      needsMore: Boolean(updated && updated.phase !== "done"),
    };
  },
});
