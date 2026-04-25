import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type CompanyTrustTone = "success" | "warning" | "muted";
export type CompanyTrustDataSufficiency =
  | "external"
  | "none"
  | "low"
  | "sufficient";

export type CompanyTrustContract = {
  score: number | null;
  badgeText: string;
  tone: CompanyTrustTone;
  responseRate: number | null;
  averageResponseTime: number | null;
  hiresCount: number;
  complaintsCount: number;
  dataSufficiency: CompanyTrustDataSufficiency;
};

const MIN_APPLICATIONS_FOR_SCORE = 5;
const FAST_RESPONSE_MS = 24 * 60 * 60 * 1000;
const SLOW_RESPONSE_MS = 7 * 24 * 60 * 60 * 1000;
const TARGET_HIRE_RATE = 0.15;
const COMPLAINT_PENALTY_CAP = 15;
const COMPLAINT_PENALTY_RATE = 0.25;
const MAX_COMPANY_VACANCIES = 250;
const MAX_APPLICATIONS_PER_VACANCY = 250;
const MAX_EVENTS_PER_APPLICATION = 50;
const MAX_MESSAGES_PER_APPLICATION = 100;
const DEFAULT_TRUST_SCORE = 0;

type TrustMetricShape = {
  applicationsCount: number;
  employerResponsesCount: number;
  hiresCount: number;
  validComplaintsCount: number;
  firstResponseTimeTotalMs: number;
  averageFirstResponseTimeMs?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreFromMetrics(metrics: TrustMetricShape): number | null {
  if (metrics.applicationsCount < MIN_APPLICATIONS_FOR_SCORE) {
    return null;
  }

  const responseRate = metrics.employerResponsesCount / metrics.applicationsCount;
  const averageResponse = metrics.averageFirstResponseTimeMs;
  const responseSpeedScore =
    averageResponse === undefined
      ? 0
      : averageResponse <= FAST_RESPONSE_MS
        ? 100
        : averageResponse >= SLOW_RESPONSE_MS
          ? 0
          : ((SLOW_RESPONSE_MS - averageResponse) / (SLOW_RESPONSE_MS - FAST_RESPONSE_MS)) *
            100;
  const hireRate = metrics.hiresCount / metrics.applicationsCount;
  const hireScore = clamp((hireRate / TARGET_HIRE_RATE) * 100, 0, 100);
  const complaintPenalty = clamp(
    (metrics.validComplaintsCount / Math.max(1, metrics.applicationsCount)) /
      COMPLAINT_PENALTY_RATE *
      COMPLAINT_PENALTY_CAP,
    0,
    COMPLAINT_PENALTY_CAP,
  );

  const raw =
    responseRate * 100 * 0.4 +
    responseSpeedScore * 0.25 +
    hireScore * 0.2 -
    complaintPenalty;
  return Math.round(clamp(raw, 0, 100));
}

export function externalVacancyTrust(): CompanyTrustContract {
  return {
    score: null,
    badgeText: "внешняя вакансия",
    tone: "muted",
    responseRate: null,
    averageResponseTime: null,
    hiresCount: 0,
    complaintsCount: 0,
    dataSufficiency: "external",
  };
}

export function noCompanyTrust(): CompanyTrustContract {
  return {
    score: null,
    badgeText: "нет данных",
    tone: "muted",
    responseRate: null,
    averageResponseTime: null,
    hiresCount: 0,
    complaintsCount: 0,
    dataSufficiency: "none",
  };
}

export function buildCompanyTrustContract(
  metrics: TrustMetricShape | null,
): CompanyTrustContract {
  if (!metrics || metrics.applicationsCount === 0) {
    return {
      ...noCompanyTrust(),
      badgeText: "мало данных",
      dataSufficiency: "low",
    };
  }

  const responseRate =
    metrics.applicationsCount > 0
      ? metrics.employerResponsesCount / metrics.applicationsCount
      : null;
  const averageResponseTime = metrics.averageFirstResponseTimeMs ?? null;
  const score = scoreFromMetrics(metrics);

  if (score === null) {
    return {
      score: null,
      badgeText: "мало данных",
      tone: "muted",
      responseRate,
      averageResponseTime,
      hiresCount: metrics.hiresCount,
      complaintsCount: metrics.validComplaintsCount,
      dataSufficiency: "low",
    };
  }

  const frequent = score >= 70;
  return {
    score,
    badgeText: frequent ? "часто отвечает" : "редко отвечает",
    tone: frequent ? "success" : "warning",
    responseRate,
    averageResponseTime,
    hiresCount: metrics.hiresCount,
    complaintsCount: metrics.validComplaintsCount,
    dataSufficiency: "sufficient",
  };
}

export async function getCompanyMetrics(
  ctx: QueryCtx,
  companyId: Id<"companies">,
): Promise<Doc<"companyTrustMetrics"> | null> {
  return await ctx.db
    .query("companyTrustMetrics")
    .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
    .first();
}

async function getFirstSubmittedAt(
  events: Doc<"applicationStatusEvents">[],
  fallback: number,
): Promise<number> {
  const submitted = events
    .filter((event) => event.toStatus === "submitted")
    .sort((a, b) => a.changedAt - b.changedAt)[0];
  return submitted?.changedAt ?? fallback;
}

function firstEmployerStatusResponseAt(
  events: Doc<"applicationStatusEvents">[],
  employerUserId: Id<"users">,
  submittedAt: number,
): number | null {
  const event = events
    .filter(
      (item) =>
        item.actorUserId === employerUserId &&
        item.toStatus !== "submitted" &&
        item.changedAt >= submittedAt,
    )
    .sort((a, b) => a.changedAt - b.changedAt)[0];
  return event?.changedAt ?? null;
}

function firstEmployerMessageAt(
  messages: Doc<"applicationMessages">[],
  employerUserId: Id<"users">,
  submittedAt: number,
): number | null {
  const message = messages
    .filter((item) => item.senderUserId === employerUserId && item.createdAt >= submittedAt)
    .sort((a, b) => a.createdAt - b.createdAt)[0];
  return message?.createdAt ?? null;
}

async function calculateCompanyTrustMetrics(
  ctx: MutationCtx,
  company: Doc<"companies">,
): Promise<TrustMetricShape> {
  const vacancies = await ctx.db
    .query("vacancies")
    .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
    .take(MAX_COMPANY_VACANCIES);

  let applicationsCount = 0;
  let employerResponsesCount = 0;
  let hiresCount = 0;
  let firstResponseTimeTotalMs = 0;

  for (const vacancy of vacancies) {
    if (vacancy.source === "hh") {
      continue;
    }
    const employerUserId = vacancy.ownerUserId ?? company.ownerUserId;
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_vacancyId", (q) => q.eq("vacancyId", vacancy._id))
      .take(MAX_APPLICATIONS_PER_VACANCY);

    for (const application of applications) {
      applicationsCount += 1;
      if (application.status === "hired") {
        hiresCount += 1;
      }

      const events = await ctx.db
        .query("applicationStatusEvents")
        .withIndex("by_applicationId", (q) => q.eq("applicationId", application._id))
        .take(MAX_EVENTS_PER_APPLICATION);
      const submittedAt = await getFirstSubmittedAt(events, application._creationTime);
      const statusResponseAt = firstEmployerStatusResponseAt(events, employerUserId, submittedAt);

      const messages = await ctx.db
        .query("applicationMessages")
        .withIndex("by_applicationId", (q) => q.eq("applicationId", application._id))
        .take(MAX_MESSAGES_PER_APPLICATION);
      const messageResponseAt = firstEmployerMessageAt(messages, employerUserId, submittedAt);

      const firstResponseAt =
        statusResponseAt === null
          ? messageResponseAt
          : messageResponseAt === null
            ? statusResponseAt
            : Math.min(statusResponseAt, messageResponseAt);

      if (firstResponseAt !== null) {
        employerResponsesCount += 1;
        firstResponseTimeTotalMs += Math.max(0, firstResponseAt - submittedAt);
      }
    }
  }

  const complaints = await ctx.db
    .query("companyComplaints")
    .withIndex("by_companyId_and_status", (q) =>
      q.eq("companyId", company._id).eq("status", "valid"),
    )
    .take(500);

  return {
    applicationsCount,
    employerResponsesCount,
    hiresCount,
    validComplaintsCount: complaints.length,
    firstResponseTimeTotalMs,
    averageFirstResponseTimeMs:
      employerResponsesCount > 0
        ? firstResponseTimeTotalMs / employerResponsesCount
        : undefined,
  };
}

export async function recalculateCompanyTrustMetrics(
  ctx: MutationCtx,
  companyId: Id<"companies">,
): Promise<CompanyTrustContract> {
  const company = await ctx.db.get(companyId);
  if (!company) {
    return noCompanyTrust();
  }

  const metrics = await calculateCompanyTrustMetrics(ctx, company);
  const existing = await ctx.db
    .query("companyTrustMetrics")
    .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
    .first();
  const nextMetric = {
    companyId,
    applicationsCount: metrics.applicationsCount,
    employerResponsesCount: metrics.employerResponsesCount,
    hiresCount: metrics.hiresCount,
    validComplaintsCount: metrics.validComplaintsCount,
    firstResponseTimeTotalMs: metrics.firstResponseTimeTotalMs,
    averageFirstResponseTimeMs: metrics.averageFirstResponseTimeMs,
    updatedAt: Date.now(),
    seedBatchId: company.seedBatchId,
  };

  if (existing) {
    await ctx.db.patch(existing._id, nextMetric);
  } else {
    await ctx.db.insert("companyTrustMetrics", nextMetric);
  }

  const contract = buildCompanyTrustContract(metrics);
  await ctx.db.patch(companyId, { companyTrustScore: contract.score ?? DEFAULT_TRUST_SCORE });
  return contract;
}
