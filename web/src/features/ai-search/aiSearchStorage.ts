import { emptyCriteria, type TemporaryAssistantState } from "./aiSearchTypes";

const STORAGE_KEY = "jumysai.aiJobAssistant.temporary";

export function loadTemporaryAssistantState(): TemporaryAssistantState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TemporaryAssistantState;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      criteria: { ...emptyCriteria, ...parsed.criteria },
      matchedVacancyIds: Array.isArray(parsed.matchedVacancyIds)
        ? parsed.matchedVacancyIds
        : [],
    };
  } catch {
    return null;
  }
}

export function saveTemporaryAssistantState(state: TemporaryAssistantState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearTemporaryAssistantState() {
  window.localStorage.removeItem(STORAGE_KEY);
}
