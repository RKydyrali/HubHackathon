import { z } from "zod";

import { DEFAULT_CITY, EMBEDDING_DIMENSION } from "./constants";

function formatExternalError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type OpenRouterStructuredSuccess<T> = { ok: true; data: T };
export type OpenRouterStructuredFailure = { ok: false; error: string };
export type OpenRouterStructuredResult<T> =
  | OpenRouterStructuredSuccess<T>
  | OpenRouterStructuredFailure;

export type OpenRouterEmbeddingSuccess = { ok: true; embedding: number[] };
export type OpenRouterEmbeddingFailure = { ok: false; error: string };
export type OpenRouterEmbeddingResult =
  | OpenRouterEmbeddingSuccess
  | OpenRouterEmbeddingFailure;

export function createZeroEmbedding(): number[] {
  return new Array(EMBEDDING_DIMENSION).fill(0);
}

const openRouterBaseUrl =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

function requireOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return apiKey;
}

export function getChatModel(complex = false): string {
  return complex
    ? process.env.OPENROUTER_COMPLEX_MODEL ?? "openai/gpt-4o"
    : process.env.OPENROUTER_CHAT_MODEL ?? "openai/gpt-4o-mini";
}

export function getEmbeddingModel(): string {
  return process.env.OPENROUTER_EMBEDDING_MODEL ?? "text-embedding-3-small";
}

/** OpenRouter model fallback chain for mock interview (see model fallbacks guide). */
export const MOCK_INTERVIEW_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash-001",
] as const;

export type MockInterviewChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function mockInterviewChatRequestBody(
  messages: MockInterviewChatMessage[],
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const models = [...MOCK_INTERVIEW_MODELS];
  return {
    model: models[0],
    models,
    route: "fallback",
    messages,
    ...extra,
  };
}

async function openRouterFetch<T>(
  path: string,
  body: Record<string, unknown>,
  parser: (json: unknown) => T,
): Promise<T> {
  const response = await fetch(`${openRouterBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenRouterApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed with ${response.status}: ${await response.text()}`,
    );
  }

  const json = await response.json();
  return parser(json);
}

const structuredOutputEnvelopeSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1),
        }),
      }),
    )
    .min(1),
});

export async function requestStructuredJson<T>(
  schemaName: string,
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: { complex?: boolean; systemPrompt?: string },
): Promise<T> {
  const messages = options?.systemPrompt
    ? [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: prompt },
      ]
    : [{ role: "user", content: prompt }];
  const raw = await openRouterFetch(
    "/chat/completions",
    {
      model: getChatModel(options?.complex ?? false),
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: z.toJSONSchema(schema),
        },
      },
    },
    (json) => structuredOutputEnvelopeSchema.parse(json),
  );

  const content = raw.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty structured response");
  }
  return schema.parse(JSON.parse(content));
}

const embeddingEnvelopeSchema = z.object({
  data: z
    .array(
      z.object({
        embedding: z.array(z.number()),
      }),
    )
    .min(1),
});

export async function requestEmbedding(text: string): Promise<number[]> {
  const raw = await openRouterFetch(
    "/embeddings",
    {
      model: getEmbeddingModel(),
      input: text,
      dimensions: EMBEDDING_DIMENSION,
      encoding_format: "float",
    },
    (json) => embeddingEnvelopeSchema.parse(json),
  );

  const embedding = raw.data[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenRouter embeddings response was empty");
  }
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding length ${embedding.length} does not match ${EMBEDDING_DIMENSION}`,
    );
  }
  return embedding;
}

export async function tryRequestStructuredJson<T>(
  schemaName: string,
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: { complex?: boolean; systemPrompt?: string },
): Promise<OpenRouterStructuredResult<T>> {
  try {
    const data = await requestStructuredJson(
      schemaName,
      prompt,
      schema,
      options,
    );
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: formatExternalError(error) };
  }
}

export async function requestChatCompletionWithMockInterviewModels(
  messages: MockInterviewChatMessage[],
): Promise<string> {
  const raw = await openRouterFetch(
    "/chat/completions",
    mockInterviewChatRequestBody(messages, {}),
    (json) => structuredOutputEnvelopeSchema.parse(json),
  );
  const content = raw.choices[0]?.message.content;
  if (!content?.trim()) {
    throw new Error("OpenRouter returned an empty chat response");
  }
  return content;
}

export async function requestStructuredJsonWithMockInterviewModels<T>(
  schemaName: string,
  prompt: string,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const raw = await openRouterFetch(
    "/chat/completions",
    mockInterviewChatRequestBody(messagesUserOnly(prompt), {
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: z.toJSONSchema(schema),
        },
      },
    }),
    (json) => structuredOutputEnvelopeSchema.parse(json),
  );
  const content = raw.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty structured response");
  }
  return schema.parse(JSON.parse(content));
}

function messagesUserOnly(prompt: string): MockInterviewChatMessage[] {
  return [{ role: "user", content: prompt }];
}

export async function tryRequestChatCompletionWithMockInterviewModels(
  messages: MockInterviewChatMessage[],
): Promise<OpenRouterStructuredResult<string>> {
  try {
    const data = await requestChatCompletionWithMockInterviewModels(messages);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: formatExternalError(error) };
  }
}

export async function tryRequestStructuredJsonWithMockInterviewModels<T>(
  schemaName: string,
  prompt: string,
  schema: z.ZodSchema<T>,
): Promise<OpenRouterStructuredResult<T>> {
  try {
    const data = await requestStructuredJsonWithMockInterviewModels(
      schemaName,
      prompt,
      schema,
    );
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: formatExternalError(error) };
  }
}

export async function tryRequestEmbedding(
  text: string,
): Promise<OpenRouterEmbeddingResult> {
  try {
    const embedding = await requestEmbedding(text);
    return { ok: true, embedding };
  } catch (error) {
    return { ok: false, error: formatExternalError(error) };
  }
}

export const vacancyGenerationSchema = z.object({
  source: z.literal("native").default("native"),
  title: z.string().min(1),
  description: z.string().min(1),
  city: z.string().min(1).default(DEFAULT_CITY),
  salaryMin: z.number().int().nonnegative().nullable(),
  salaryMax: z.number().int().nonnegative().nullable(),
  salaryCurrency: z.string().min(1).nullable(),
});

export const screeningQuestionsSchema = z.object({
  questions: z.array(z.string().min(1)).length(3),
});

export const screeningAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(1),
});

export const mockInterviewDebriefSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string().min(1)),
  improvements: z.array(z.string().min(1)),
  hiringRecommendation: z.string().min(1),
});

export const elevatorPitchSchema = z.object({
  score: z.number().min(0).max(100),
  neutral: z.string().min(1),
  short: z.string().min(1),
  confident: z.string().min(1),
  notes: z.array(z.string().min(1)).optional(),
});

export const answerFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  suggestion: z.string().min(1),
});

export const interviewScenarioDraftSchema = z.object({
  context: z.string().min(1),
  tasks: z.array(z.object({ prompt: z.string().min(1) })).min(1).max(8),
  constraints: z.array(z.string().min(1)).max(10),
  rubric: z
    .array(
      z.object({
        criterion: z.string().min(1),
        description: z.string().min(1),
        maxScore: z.number().min(1).max(100),
      }),
    )
    .min(1)
    .max(8),
});

export const interviewScenarioEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  criterionScores: z
    .array(
      z.object({
        criterion: z.string().min(1),
        score: z.number().min(0).max(100),
        maxScore: z.number().min(1).max(100),
        evidence: z.string().min(1),
      }),
    )
    .min(1),
  riskNotes: z.array(z.string().min(1)).max(8),
  recommendation: z.string().min(1),
});
