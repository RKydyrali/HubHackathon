function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasNumbers(text: string) {
  return /\d/.test(text);
}

function hasAsk(text: string) {
  return /(ищу|хочу|готов|интересует|буду рад|могу|открыт)/i.test(text);
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function improvePitchHeuristic(rawText: string): {
  score: number;
  variants: { short: string; neutral: string; confident: string };
  notes: string[];
} {
  const raw = rawText.trim();
  const sentences = splitSentences(raw);
  const wordCount = normalizeWhitespace(raw).split(/\s+/).filter(Boolean).length;

  let score = 40;
  const notes: string[] = [];

  if (sentences.length >= 3 && sentences.length <= 6) score += 18;
  else {
    score -= 6;
    notes.push("Старайтесь уложиться в 3–5 предложений: так звучит увереннее.");
  }

  if (wordCount >= 45 && wordCount <= 120) score += 14;
  else if (wordCount < 30) {
    score -= 10;
    notes.push("Добавьте 1–2 конкретики: навыки, задачи или опыт (без лишних деталей).");
  } else if (wordCount > 160) {
    score -= 12;
    notes.push("Сократите: оставьте только то, что важно для роли и работодателя.");
  }

  if (hasNumbers(raw)) score += 8;
  else notes.push("Если можно — добавьте результат в цифрах (время, объём, %).");

  if (hasAsk(raw)) score += 6;
  else notes.push("Добавьте финальную фразу: что вы ищете и чем можете быть полезны.");

  score = clamp(score, 0, 100);

  const neutral = normalizeWhitespace(
    [
      sentences[0] ?? raw,
      sentences[1] ?? "",
      sentences[2] ?? "",
      sentences[3] ?? "",
      sentences[4] ?? "",
    ]
      .filter(Boolean)
      .slice(0, 5)
      .join(" "),
  );

  const confident = normalizeWhitespace(
    neutral
      .replace(/\bмогу\b/gi, "уверенно могу")
      .replace(/\bделал\b/gi, "успешно делал")
      .replace(/\bделала\b/gi, "успешно делала")
      .replace(/\bхочу\b/gi, "нацелен(а)")
      .trim(),
  );

  const short = normalizeWhitespace(
    [sentences[0], sentences[1]].filter(Boolean).join(" ").slice(0, 240),
  );

  const ensuredShort = short || neutral.slice(0, 220);

  return {
    score,
    variants: {
      short: ensuredShort,
      neutral: neutral || raw,
      confident: confident || neutral || raw,
    },
    notes: notes.slice(0, 4),
  };
}

function starSignals(text: string) {
  const t = text.toLowerCase();
  return {
    situation: /(ситуац|когда|в момент|в проекте|на работе)/i.test(t),
    task: /(задач|нужно было|цель)/i.test(t),
    action: /(сделал|сделала|выполнил|выполнила|организовал|организовала|внедрил|внедрила|настроил|настроила)/i.test(t),
    result: /(результ|итог|в итоге|получил|получила|удалось|рост|снизил|снизила)/i.test(t) || hasNumbers(text),
  };
}

export function scoreAnswerHeuristic(question: string, answer: string): {
  score: number;
  suggestion: string;
} {
  const a = answer.trim();
  const words = normalizeWhitespace(a).split(/\s+/).filter(Boolean);
  const wc = words.length;
  let score = 35;

  if (wc >= 60 && wc <= 160) score += 22;
  else if (wc < 35) score -= 8;
  else if (wc > 220) score -= 10;

  const star = starSignals(a);
  const starCount = Object.values(star).filter(Boolean).length;
  score += starCount * 7;

  const q = question.toLowerCase();
  const mentionsStrength = /(сильн|сторон|навык|умение)/i.test(q) ? /(навык|умение|сильн)/i.test(a) : true;
  const mentionsWhy = /(почему|зачем|мотивац)/i.test(q) ? /(потому|важно|интересно|хочу)/i.test(a) : true;
  if (mentionsStrength) score += 4;
  if (mentionsWhy) score += 4;

  score = clamp(score, 0, 100);

  let suggestion = "Добавьте 1–2 конкретных факта: что сделали и какой был результат.";
  if (!star.result) suggestion = "Добавьте результат: чем закончилась история и желательно в цифрах.";
  else if (!star.action) suggestion = "Добавьте действия: что именно сделали вы (глаголы + шаги).";
  else if (wc < 40) suggestion = "Раскройте ответ: 60–90 секунд — это 5–8 предложений с примером.";
  else if (wc > 220) suggestion = "Сократите: оставьте один пример по STAR и финальный вывод в 1 фразе.";
  else if (!hasAsk(a) && /(расскажите о себе|о себе)/i.test(q)) {
    suggestion = "В конце добавьте: какую роль ищете и чем будете полезны на этой позиции.";
  }

  return { score, suggestion };
}

