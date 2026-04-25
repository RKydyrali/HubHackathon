const PITCH_KEY = "jumysai.interviewTrainer.pitch.v1";
const QUESTIONS_KEY = "jumysai.interviewTrainer.questions.v1";

export type StoredPitchState = {
  inputText: string;
  result: {
    score: number;
    variants: { short: string; neutral: string; confident: string };
  } | null;
};

export type StoredQuestionsState = {
  activeIndex: number;
  answers: Record<
    string,
    { text: string; submitted: boolean; score?: number; suggestion?: string }
  >;
};

export function loadPitchState(): StoredPitchState | null {
  try {
    const raw = window.localStorage.getItem(PITCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPitchState>;
    return {
      inputText: typeof parsed.inputText === "string" ? parsed.inputText : "",
      result: parsed.result ?? null,
    };
  } catch {
    return null;
  }
}

export function savePitchState(state: StoredPitchState) {
  try {
    window.localStorage.setItem(PITCH_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadQuestionsState(): StoredQuestionsState | null {
  try {
    const raw = window.localStorage.getItem(QUESTIONS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredQuestionsState>;
    return {
      activeIndex: typeof parsed.activeIndex === "number" ? parsed.activeIndex : 0,
      answers:
        parsed.answers && typeof parsed.answers === "object"
          ? (parsed.answers as StoredQuestionsState["answers"])
          : {},
    };
  } catch {
    return null;
  }
}

export function saveQuestionsState(state: StoredQuestionsState) {
  try {
    window.localStorage.setItem(QUESTIONS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

