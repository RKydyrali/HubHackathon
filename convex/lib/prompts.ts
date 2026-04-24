import { DEFAULT_CITY } from "./constants";

export function buildVacancyGenerationPrompt(rawText: string): string {
  return [
    "Extract a structured job vacancy from the employer text.",
    `Default city to ${DEFAULT_CITY} when omitted.`,
    "Return concise, production-ready values.",
    "If salary is unclear, leave salaryMin and salaryMax as null.",
    "Keep source as native.",
    `Raw employer text: ${rawText}`,
  ].join("\n");
}

export function buildScreeningQuestionsPrompt(vacancy: {
  title: string;
  description: string;
  city: string;
}): string {
  return [
    "Generate exactly 3 short screening questions for this job.",
    "The questions must be specific to the role and in the same language as the vacancy.",
    "Do not ask generic personality questions.",
    `Title: ${vacancy.title}`,
    `City: ${vacancy.city}`,
    `Description: ${vacancy.description}`,
  ].join("\n");
}

export function buildScreeningAnalysisPrompt(input: {
  vacancyTitle: string;
  vacancyDescription: string;
  screeningAnswers: Array<{ question: string; answer: string }>;
}): string {
  const answers = input.screeningAnswers
    .map((item, index) => {
      return `${index + 1}. Q: ${item.question}\nA: ${item.answer}`;
    })
    .join("\n");

  return [
    "Score the candidate answers from 0 to 100 for this vacancy.",
    "Provide a short neutral summary focused on job fit and gaps.",
    "Be strict but fair.",
    `Vacancy title: ${input.vacancyTitle}`,
    `Vacancy description: ${input.vacancyDescription}`,
    `Answers:\n${answers}`,
  ].join("\n");
}

export function buildAiJobCriteriaPrompt(input: {
  message: string;
  previousCriteriaJson?: string;
  followUpTurns: number;
}): string {
  return [
    "You are JumysAI, a practical job matching assistant for Aktau and Mangystau.",
    "Extract structured job-search criteria from the user's Russian or mixed-language message.",
    "Ask only useful follow-up questions for matching. Avoid career motivation questions.",
    "Never ask for IIN, documents, exact home address, or sensitive personal data.",
    "Prefer local district and microdistrict signals such as 12 мкр, 14 мкр, центр, приморский.",
    "If at least two useful signals are known, shouldShowResults can be true.",
    "If followUpTurns is 2 or more, prefer showing results unless a critical field is missing.",
    "If followUpTurns is 5 or more, set shouldShowResults to true and nextQuestion to null.",
    "Keep nextQuestion short, conversational, and in Russian.",
    `followUpTurns: ${input.followUpTurns}`,
    input.previousCriteriaJson
      ? `Previous criteria JSON: ${input.previousCriteriaJson}`
      : "Previous criteria JSON: null",
    `User message: ${input.message}`,
  ].join("\n");
}

export function buildAiJobDiscussionPrompt(input: {
  question: string;
  criteriaJson: string;
  vacanciesJson: string;
}): string {
  return [
    "You are JumysAI, helping a seeker discuss already loaded vacancies.",
    "Use only the vacancy data provided. Do not invent salary, district, schedule, employer, or conditions.",
    "If data is missing, say it clearly in Russian.",
    "Answer concisely and practically.",
    `Criteria JSON: ${input.criteriaJson}`,
    `Loaded vacancies JSON: ${input.vacanciesJson}`,
    `User question: ${input.question}`,
  ].join("\n");
}

export function buildAiJobComparisonPrompt(input: {
  criteriaJson: string;
  comparisonJson: string;
}): string {
  return [
    "You are JumysAI comparing 2-3 loaded vacancies for a seeker.",
    "Use only the comparison JSON. Do not invent missing details.",
    "Recommend based on the user's criteria and mention tradeoffs.",
    "Keep the answer in Russian, concise, and practical.",
    `Criteria JSON: ${input.criteriaJson}`,
    `Comparison JSON: ${input.comparisonJson}`,
  ].join("\n");
}
