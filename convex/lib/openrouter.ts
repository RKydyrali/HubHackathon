import { z } from "zod";

import { DEFAULT_CITY, EMBEDDING_DIMENSION } from "./constants";

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
  options?: { complex?: boolean },
): Promise<T> {
  const raw = await openRouterFetch(
    "/chat/completions",
    {
      model: getChatModel(options?.complex ?? false),
      messages: [{ role: "user", content: prompt }],
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
