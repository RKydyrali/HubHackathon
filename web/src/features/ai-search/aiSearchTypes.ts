import type { Id } from "@/lib/convex-api";
import type { Vacancy } from "@/types/domain";

export type AiJobCriteria = {
  roles: string[];
  skills: string[];
  city: string | null;
  district: string | null;
  schedule: string | null;
  workType: "full_time" | "part_time" | "temporary" | null;
  experienceLevel: "none" | "junior" | "experienced" | null;
  salaryMin: number | null;
  urgency: "today" | "this_week" | "flexible" | null;
  sourcePreference: "native" | "hh" | "any";
};

export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AiVacancyMatch = {
  vacancy: Vacancy;
  explanation: string[];
  matchScore?: number;
};

export type AiMatchGroups = {
  best: AiVacancyMatch[];
  nearby: AiVacancyMatch[];
  fastStart: AiVacancyMatch[];
  hh: AiVacancyMatch[];
  all: AiVacancyMatch[];
  totalCount: number;
  aiUnavailable?: boolean;
};

export type AssistantComparisonRow = {
  title: string;
  salary: string;
  district: string;
  schedule: string;
  experience: string;
  source: "native" | "hh";
  applicationFriction: string;
  whyFits: string[];
  risks: string[];
};

export type TemporaryAssistantState = {
  messages: AiChatMessage[];
  criteria: AiJobCriteria;
  matchedVacancyIds: Array<string | Id<"vacancies">>;
};

export const emptyCriteria: AiJobCriteria = {
  roles: [],
  skills: [],
  city: null,
  district: null,
  schedule: null,
  workType: null,
  experienceLevel: null,
  salaryMin: null,
  urgency: null,
  sourcePreference: "any",
};

export const emptyMatches: AiMatchGroups = {
  best: [],
  nearby: [],
  fastStart: [],
  hh: [],
  all: [],
  totalCount: 0,
};
