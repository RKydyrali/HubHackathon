export type JobPostTrustBadgeText =
  | "often responds"
  | "rarely responds"
  | "low data"
  | "external vacancy";

export type JobPostTrustInput = {
  title: string;
  description: string;
  city: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  externalApplyUrl?: string | null;
};

export type JobPostTrustResult = {
  score: number;
  badgeText: JobPostTrustBadgeText;
  reasons: string[];
};

type Signal = {
  reason: string;
  weight: number;
  priority: number;
};

const VAGUE_TITLES = new Set([
  "job",
  "work",
  "worker",
  "vacancy",
  "staff",
  "employee",
  "help wanted",
]);

const DUTY_PATTERN =
  /\b(responsibilit|dut(y|ies)|task|serve|clean|prepare|deliver|pick|pack|manage|support|sell|cook|drive|repair|greet|operate|maintain|assist)\b/i;
const REQUIREMENT_PATTERN =
  /\b(requirement|required|must|experience|skill|knowledge|ability|license|certificate|education)\b/i;
const SCHEDULE_PATTERN =
  /\b(schedule|shift|full[ -]?time|part[ -]?time|hours?|days?|night|morning|evening|remote|hybrid|office|2\/2|5\/2|6\/1|09:00|9:00)\b/i;
const CONTACT_PATTERN =
  /(\+?\d[\d\s().-]{7,}\d)|([^\s@]+@[^\s@]+\.[^\s@]+)|\b(apply|contact|phone|email|telegram|whatsapp|call|message)\b/i;
const UPFRONT_PAYMENT_PATTERN =
  /\b(upfront|registration fee|pay before|deposit|processing fee|training fee|starter kit|send money|transfer money)\b/i;
const SENSITIVE_DOCUMENT_PATTERN =
  /\b(passport|iin|ssn|social security|bank card|card number|cvv|tax id|identity document|national id|drivers license|driver's license)\b/i;
const EASY_MONEY_PATTERN =
  /\b(easy money|get rich|no effort|guaranteed income|earn fast|quick cash|income from home|no experience needed)\b/i;
const MONEY_PATTERN = /\b\d[\d\s,.]{4,}\b/g;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function wordCount(value: string): number {
  const matches = normalizeText(value).match(/\b[\p{L}\p{N}]+\b/gu);
  return matches?.length ?? 0;
}

function hasSalary(input: JobPostTrustInput): boolean {
  return (
    typeof input.salaryMin === "number" ||
    typeof input.salaryMax === "number" ||
    MONEY_PATTERN.test(input.description)
  );
}

function maxSalaryValue(input: JobPostTrustInput): number {
  const values = [input.salaryMin, input.salaryMax].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  MONEY_PATTERN.lastIndex = 0;
  for (const match of input.description.matchAll(MONEY_PATTERN)) {
    const numeric = Number(match[0].replace(/[^\d]/g, ""));
    if (Number.isFinite(numeric)) {
      values.push(numeric);
    }
  }
  return values.length ? Math.max(...values) : 0;
}

function isClearTitle(title: string): boolean {
  const normalized = normalizeText(title).toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.length >= 4 && !VAGUE_TITLES.has(normalized);
}

function badgeFor(score: number, externalApplyUrl?: string | null): JobPostTrustBadgeText {
  if (externalApplyUrl?.trim()) {
    return "external vacancy";
  }
  if (score >= 70) {
    return "often responds";
  }
  if (score >= 40) {
    return "rarely responds";
  }
  return "low data";
}

function addSignal(
  signals: Signal[],
  condition: boolean,
  positive: Signal,
  negative: Signal,
): number {
  const signal = condition ? positive : negative;
  signals.push(signal);
  return signal.weight;
}

function topReasons(signals: Signal[]): string[] {
  const ordered = [...signals]
    .sort((first, second) => {
      const priorityDiff = second.priority - first.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return Math.abs(second.weight) - Math.abs(first.weight);
    })
    .map((signal) => signal.reason);
  return Array.from(new Set(ordered)).slice(0, 5);
}

export function estimateJobPostTrust(input: JobPostTrustInput): JobPostTrustResult {
  const signals: Signal[] = [];
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const city = normalizeText(input.city);
  const descriptionWords = wordCount(description);

  let score = 35;

  score += addSignal(
    signals,
    isClearTitle(title),
    { reason: "Clear title is provided", weight: 10, priority: 3 },
    { reason: "Title is vague", weight: -12, priority: 7 },
  );

  const substantialDescription = descriptionWords >= 35;
  const somewhatDetailedDescription = descriptionWords >= 18;
  if (substantialDescription) {
    signals.push({ reason: "Description has useful detail", weight: 15, priority: 4 });
    score += 15;
  } else if (somewhatDetailedDescription) {
    signals.push({ reason: "Description has limited detail", weight: 5, priority: 3 });
    score += 5;
  } else {
    signals.push({ reason: "Description is very short", weight: -15, priority: 7 });
    score -= 15;
  }

  score += addSignal(
    signals,
    DUTY_PATTERN.test(description),
    { reason: "Duties are described", weight: 10, priority: 5 },
    { reason: "Description does not specify duties", weight: -8, priority: 5 },
  );

  score += addSignal(
    signals,
    REQUIREMENT_PATTERN.test(description),
    { reason: "Requirements are described", weight: 10, priority: 5 },
    { reason: "Requirements are missing", weight: -6, priority: 4 },
  );

  score += addSignal(
    signals,
    Boolean(city),
    { reason: "Clear city is provided", weight: 10, priority: 5 },
    { reason: "City is missing", weight: -12, priority: 7 },
  );

  score += addSignal(
    signals,
    SCHEDULE_PATTERN.test(description),
    { reason: "Schedule or work format is mentioned", weight: 10, priority: 5 },
    { reason: "Schedule is missing", weight: -5, priority: 3 },
  );

  score += addSignal(
    signals,
    hasSalary(input),
    { reason: "Salary range is provided", weight: 10, priority: 5 },
    { reason: "Salary is missing", weight: -4, priority: 3 },
  );

  score += addSignal(
    signals,
    CONTACT_PATTERN.test(description) || Boolean(input.externalApplyUrl?.trim()),
    { reason: "Application contact is provided", weight: 8, priority: 4 },
    { reason: "Application contact is missing", weight: -4, priority: 3 },
  );

  if (UPFRONT_PAYMENT_PATTERN.test(description)) {
    signals.push({ reason: "Post asks for upfront payment", weight: -35, priority: 10 });
    score -= 35;
  }

  if (SENSITIVE_DOCUMENT_PATTERN.test(description)) {
    signals.push({
      reason: "Post asks for sensitive documents early",
      weight: -30,
      priority: 10,
    });
    score -= 30;
  }

  if (EASY_MONEY_PATTERN.test(description)) {
    signals.push({ reason: "Post uses easy-money wording", weight: -18, priority: 9 });
    score -= 18;
  }

  const salaryLooksUnrealistic =
    maxSalaryValue(input) >= 1_000_000 &&
    (descriptionWords < 35 || EASY_MONEY_PATTERN.test(description));
  if (salaryLooksUnrealistic) {
    signals.push({
      reason: "Pay claim looks unrealistic for the detail provided",
      weight: -25,
      priority: 10,
    });
    score -= 25;
  }

  const finalScore = Math.round(clamp(score, 0, 100));
  return {
    score: finalScore,
    badgeText: badgeFor(finalScore, input.externalApplyUrl),
    reasons: topReasons(signals),
  };
}
