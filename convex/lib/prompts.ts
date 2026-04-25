import { DEFAULT_CITY } from "./constants";

export type AiJobPromptMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AiJobVisibleVacancyPromptContext = {
  title: string;
  district?: string | null;
  salary?: string | null;
  source: string;
};

export function buildVacancyGenerationPrompt(rawText: string): string {
  return [
    "You are JumysAI. Turn informal employer notes into a structured job posting for a hyperlocal platform in Kazakhstan (Aktau / Mangystau).",
    "Output language: Russian for title and description, even if the input mixes languages.",
    "title: a clear job title a candidate would tap on (2–7 words). Rewrite vague phrasing (e.g. «мне нужен рабочий» → concrete role: «Рабочий / разнорабочий», «Исполнитель» only if the sector is unknown). Avoid first-person; no marketing fluff.",
    "description: 4–8 short paragraphs or bullet-style lines suitable for a job board. Use this structure when information allows:",
    "1) one line on the role in plain terms;",
    "2) key daily tasks and responsibilities (specific verbs; if the user wrote one vague word like «работать», replace it with a neutral but concrete template for a general worker, e.g. выполнение поручений руководителя, соблюдение ТБ, поддержание порядка — and add «уточните детали в чате с работодателем» only as a last resort when the sector is truly unknown);",
    "3) must-have vs nice-to-have experience;",
    "4) schedule and location cues from the text;",
    "5) pay and conditions if stated.",
    "Do not fabricate exact salary numbers: only fill salaryMin/salaryMax if the user gave numbers, ranges, or unambiguous phrasing (e.g. «200 тысяч тенге», «250k ₸»). Otherwise leave them null. Prefer KZT.",
    "If the text is minimal, still write a professional description from what is sure, and label gaps briefly («график и формат смены уточняются») without inventing employer-specific facts.",
    `Default city to ${DEFAULT_CITY} when the location is missing or only «Актау»-level; keep district/microdistrict inside description text if the user named one.`,
    "Keep source as native.",
    `Raw employer text:\n${rawText}`,
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

export function buildResumeProfileExtractionPrompt(resumeText: string): string {
  return [
    "You are JumysAI helping a job seeker turn pasted resume text into a profile draft.",
    "AI prepared a draft, please review before saving. Return only fields for a preview; do not persist anything.",
    "Extract: fullName, city, district, skills, bio, resumeText.",
    "Do not invent names, districts, employers, education, salary, dates, or skills that are not supported by the pasted text.",
    "Use null for district if it is missing. Default city to Aktau when the resume does not name a city.",
    "skills must be concise profile skills, not long sentences. bio must be 1-3 honest sentences in Russian.",
    "resumeText must preserve the pasted resume text.",
    `Pasted resume text:\n${resumeText}`,
  ].join("\n");
}

const MOCK_INTERVIEW_DESCRIPTION_MAX = 6000;

export function buildMockInterviewSystemPrompt(input: {
  vacancyTitle: string;
  vacancyDescription: string;
  vacancyCity: string;
  profileSnippet?: string;
}): string {
  const description =
    input.vacancyDescription.length > MOCK_INTERVIEW_DESCRIPTION_MAX
      ? `${input.vacancyDescription.slice(0, MOCK_INTERVIEW_DESCRIPTION_MAX)}…`
      : input.vacancyDescription;
  const profileBlock = input.profileSnippet?.trim()
    ? `\nКратко о кандидате (из профиля):\n${input.profileSnippet.trim()}`
    : "";
  return [
    "Ты — опытный интервьюер по найму. Проводи мок-интервью на русском языке.",
    "Задавай по одному чёткому вопросу за раз, опираясь на вакансию.",
    "Не выдавай заранее «правильные ответы»; после ответа кандидата можно кратко реагировать и переходить к следующему вопросу.",
    "Держи тон профессиональным и уважительным.",
    `Вакансия: ${input.vacancyTitle}`,
    `Город: ${input.vacancyCity}`,
    `Описание:\n${description}`,
    profileBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMockInterviewDebriefPrompt(input: {
  vacancyTitle: string;
  vacancyDescription: string;
  transcript: string;
}): string {
  const description =
    input.vacancyDescription.length > MOCK_INTERVIEW_DESCRIPTION_MAX
      ? `${input.vacancyDescription.slice(0, MOCK_INTERVIEW_DESCRIPTION_MAX)}…`
      : input.vacancyDescription;
  return [
    "Оцени мок-интервью кандидата по этой вакансии.",
    "Строго, но справедливо: score от 0 до 100.",
    "summary — короткий нейтральный текст о соответствии роли и пробелах.",
    "strengths и improvements — по 2–5 конкретных пунктов на русском.",
    "hiringRecommendation — одна строка-вердикт (например: рекомендуется к следующему этапу / с оговорками / не рекомендуется) на русском.",
    `Vacancy title: ${input.vacancyTitle}`,
    `Vacancy description: ${description}`,
    "Transcript (роли user = кандидат, assistant = интервьюер):",
    input.transcript,
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
    "Write the summary in Russian. For each answer, you may use clear labels like Pros:, Cons:, and Rating: on separate lines to improve scannability.",
    `Vacancy title: ${input.vacancyTitle}`,
    `Vacancy description: ${input.vacancyDescription}`,
    `Answers:\n${answers}`,
  ].join("\n");
}

export function buildElevatorPitchImprovePrompt(input: { rawText: string }): string {
  return [
    "Ты — карьерный коуч. Улучши elevator pitch кандидата.",
    "Выходной язык: русский.",
    "Сохрани смысл и факты, не выдумывай опыт, компании, цифры или должности, если их нет в исходном тексте.",
    "Стиль: ясно, по делу, дружелюбно и уверенно; без канцелярита и без «воды».",
    "Оцени качество исходного питча score от 0 до 100 (строго, но честно).",
    "Верни JSON по схеме: score (0..100), neutral (улучшенная версия 3–5 предложений), short (1–2 предложения), confident (3–5 предложений, чуть увереннее), notes (0–5 коротких заметок).",
    "neutral/short/confident должны быть готовыми текстами, без маркировки вроде 'Neutral:'.",
    `Исходный текст:\n${input.rawText}`,
  ].join("\n");
}

export function buildInterviewAnswerFeedbackPrompt(input: {
  question: string;
  answer: string;
}): string {
  return [
    "Ты — интервьюер и наставник. Оцени ответ кандидата на вопрос собеседования.",
    "Выходной язык: русский.",
    "score от 0 до 100 (строго, но справедливо).",
    "suggestion — одна конкретная, применимая рекомендация, что улучшить в следующей попытке (1–2 предложения).",
    "Не выдумывай факты. Не добавляй длинные списки.",
    `Вопрос:\n${input.question}`,
    `Ответ:\n${input.answer}`,
  ].join("\n");
}

export function buildInterviewScenarioDraftPrompt(input: {
  vacancyTitle: string;
  vacancyDescription: string;
  vacancyCity: string;
  screeningAnswers?: Array<{ question: string; answer: string }>;
  profileSummary?: string;
}): string {
  const answers = (input.screeningAnswers ?? [])
    .slice(0, 8)
    .map((item, index) => `${index + 1}. Q: ${item.question}\nA: ${item.answer}`)
    .join("\n");
  return [
    "You are JumysAI, helping an employer create a practical case-interview scenario for a candidate.",
    "Output Russian by default. Keep it suitable for a web app where the employer reviews and edits before publishing.",
    "Create one structured case scenario with context, task prompts, constraints, and a scoring rubric.",
    "Do not ask for sensitive personal data, identity documents, exact home address, health, family, religion, ethnicity, or other protected information.",
    "Tasks must be concrete and answerable in writing. Prefer 2-4 tasks.",
    "Constraints must be realistic for the vacancy and local Kazakhstan hiring context. Do not invent confidential company data.",
    "Rubric items must add up to a useful 100-point assessment when possible.",
    `Vacancy: ${input.vacancyTitle}`,
    `City: ${input.vacancyCity}`,
    `Vacancy description:\n${input.vacancyDescription.slice(0, 6000)}`,
    input.profileSummary
      ? `Candidate profile summary:\n${input.profileSummary.slice(0, 2000)}`
      : "Candidate profile summary: none",
    answers ? `Screening answers:\n${answers}` : "Screening answers: none",
  ].join("\n");
}

export function buildInterviewScenarioEvaluationPrompt(input: {
  scenarioJson: string;
  submissionJson: string;
}): string {
  return [
    "You are JumysAI evaluating a candidate's submitted case-interview solution for an employer.",
    "Use only the scenario, rubric, and candidate submission provided. Do not invent facts or infer hidden experience.",
    "Return rubric-based scores with concise evidence from the candidate's answer.",
    "overallScore must be 0-100. Each criterion score should be proportional to that criterion's maxScore.",
    "riskNotes should list concrete gaps, uncertainty, or missing evidence. If there are no material risks, return an empty array.",
    "recommendation should be a short Russian advisory sentence for the employer; it must not make an automatic hiring decision.",
    `Scenario JSON:\n${input.scenarioJson}`,
    `Submission JSON:\n${input.submissionJson}`,
  ].join("\n");
}

export function buildAiJobCriteriaPrompt(input: {
  message: string;
  previousCriteriaJson?: string;
  followUpTurns: number;
  recentMessages?: AiJobPromptMessage[];
  profileSummary?: string[];
  visibleVacancies?: AiJobVisibleVacancyPromptContext[];
}): string {
  const recentMessages = (input.recentMessages ?? [])
    .slice(-8)
    .map((message) => `${message.role}: ${message.content.slice(0, 500)}`);
  const profileSummary = (input.profileSummary ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  const visibleVacancies = (input.visibleVacancies ?? [])
    .slice(0, 8)
    .map((vacancy) =>
      JSON.stringify({
        title: vacancy.title,
        district: vacancy.district ?? null,
        salary: vacancy.salary ?? null,
        source: vacancy.source,
      }),
    );

  return [
    "You are JumysAI, a practical job matching assistant for Aktau and Mangystau.",
    "Extract structured job-search criteria from the user's Russian or mixed-language message.",
    "Output Russian; use Kazakh only if the user writes primarily in Kazakh.",
    "Ask only useful follow-up questions for matching. Avoid career motivation questions.",
    "Never ask for IIN, documents, exact home address, or sensitive personal data.",
    "Prefer local district and microdistrict signals such as 12 мкр, 14 мкр, центр, приморский.",
    "Do not invent city, district, salary, employer, schedule, or vacancy details. Use null or ask a short follow-up when the user/context does not provide a value.",
    "Use recent chat context, profile summary, and visible matched vacancies only as context; the latest user message is still authoritative for new changes.",
    "If at least two useful signals are known, shouldShowResults can be true.",
    "If followUpTurns is 2 or more, prefer showing results unless a critical field is missing.",
    "If followUpTurns is 5 or more, set shouldShowResults to true and nextQuestion to null.",
    "Keep nextQuestion short, conversational, and in Russian (one short sentence).",
    "If nextQuestion is not null, set quickReplyOptions to exactly 4 very short (max 6-8 words) Russian answer suggestions a user can tap. They must match the topic of nextQuestion. If there is no follow-up (nextQuestion is null), set quickReplyOptions to [].",
    `followUpTurns: ${input.followUpTurns}`,
    input.previousCriteriaJson
      ? `Previous criteria JSON: ${input.previousCriteriaJson}`
      : "Previous criteria JSON: null",
    recentMessages.length
      ? `Recent chat context:\n${recentMessages.join("\n")}`
      : "Recent chat context: none",
    profileSummary.length
      ? `Profile summary: ${profileSummary.join(", ")}`
      : "Profile summary: none",
    visibleVacancies.length
      ? `Visible matched vacancies:\n${visibleVacancies.join("\n")}`
      : "Visible matched vacancies: none",
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

const RECRUITER_AGENT_SYSTEM = [
  "You are JumysAI, an employer-side hiring copilot for Kazakhstan (Aktau / Mangystau).",
  "Answer in Russian by default. Be concise, practical, and honest.",
  "Never invent candidate employers, exact salaries, or contact details not supplied in the prompt.",
  "Do not encourage illegal discrimination; flag vague or risky wording instead of repeating it as advice.",
].join("\n");

export function recruiterAgentSystemPrompt(): string {
  return RECRUITER_AGENT_SYSTEM;
}

export function buildRecruiterRouterPrompt(input: {
  vacancySnapshot: string | null;
  recentMessages: string[];
  userMessage: string;
}): string {
  return [
    RECRUITER_AGENT_SYSTEM,
    "Classify the employer's latest message for the next tool step.",
    "match_candidates: they want to find or rank people (ideal hire, who fits, similar profiles, «найди кандидатов»).",
    "improve_job_post: they want to polish the posting (title, requirements, tone, salary wording, missing fields, bias check).",
    "both: they clearly want both in one turn.",
    "clarify: you need one short disambiguation question before running matching or vacancy edits.",
    "If improve_job_post or both is chosen but no vacancy snapshot is provided, you MUST use mode=clarify and ask them to open the assistant from a specific vacancy page or paste key fields.",
    "quickReplies: up to 4 very short Russian tap replies when clarifying; otherwise [].",
    input.vacancySnapshot
      ? `Current native vacancy snapshot (may be partial):\n${input.vacancySnapshot}`
      : "Vacancy snapshot: none (vacancy context not loaded).",
    input.recentMessages.length
      ? `Recent chat:\n${input.recentMessages.join("\n")}`
      : "Recent chat: none",
    `Employer message: ${input.userMessage}`,
  ].join("\n\n");
}

export function buildRecruiterMatchPackPrompt(input: {
  roleOrUserMessage: string;
  vacancySnapshot: string | null;
  profilesJson: string;
}): string {
  return [
    RECRUITER_AGENT_SYSTEM,
    "You rank candidate PROFILE SNIPPETS for an employer. Use only provided profiles JSON.",
    "Return assistantMessage in Russian: brief intro + how to interpret scores + invite clarifying filters next.",
    "For each candidate: reasons must be 1-5 short bullets in Russian tied to skills/city/experience vs the role text.",
    "matchScore is your qualitative fit 0-100 (independent of vector order). profileId MUST copy exactly from input.",
    `Role / employer message:\n${input.roleOrUserMessage}`,
    input.vacancySnapshot
      ? `Vacancy snapshot:\n${input.vacancySnapshot}`
      : "Vacancy snapshot: none.",
    `Profiles JSON:\n${input.profilesJson}`,
  ].join("\n\n");
}

export function buildRecruiterVacancyCoachPrompt(input: {
  vacancyJson: string;
  userMessage: string;
}): string {
  return [
    RECRUITER_AGENT_SYSTEM,
    "Review and improve this job post for clarity, completeness, and inclusive tone.",
    "assistantMessage: Russian summary for the employer (what you changed mentally, what to fix next).",
    "titleSuggestion / rewrites: null if the original is already strong; otherwise concrete Russian text.",
    "salaryWording: suggest compliant, non-deceptive phrasing; null if salary already clear.",
    "missingFields: bullet codes like salary_range, schedule, location, employment_type.",
    "issues: discriminatory/vague/risky phrases with severity (block=likely illegal discrimination, warn=fix, info=nice-to-have).",
    `Vacancy JSON:\n${input.vacancyJson}`,
    `Employer instruction: ${input.userMessage}`,
  ].join("\n\n");
}
