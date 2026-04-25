import { describe, expect, test } from "vitest";

import { getApplicationTimeline, getSourceMeta, getStatusMeta } from "@/lib/status-ui";

describe("status UI metadata", () => {
  test("returns consistent bilingual labels and semantic tones", () => {
    expect(getStatusMeta("submitted", "ru")).toMatchObject({
      label: "Отправлено",
      tone: "muted",
    });
    expect(getStatusMeta("published", "kk")).toMatchObject({
      label: "Жарияланған",
      tone: "success",
    });
    expect(getStatusMeta("failed", "ru")).toMatchObject({
      label: "Ошибка",
      tone: "danger",
    });
  });

  test("distinguishes JumysAI and HH sources without relying on color alone", () => {
    expect(getSourceMeta("native", "ru")).toMatchObject({
      label: "JumysAI",
      fullLabel: "Вакансия JumysAI",
      helper: "Отклик внутри сервиса",
      actionHint: "Отклик и статус будут в JumysAI.",
    });
    expect(getSourceMeta("hh", "kk")).toMatchObject({
      label: "HH.kz",
      fullLabel: "HH.kz сыртқы вакансиясы",
      helper: "Өтініш сыртқы сайтта",
      actionHint: "Өтініш HH.kz сайтында жалғасады.",
    });
  });

  test("builds a readable application timeline with next employer actions", () => {
    const timeline = getApplicationTimeline("interview", "ru");

    expect(timeline.current.label).toBe("Интервью");
    expect(timeline.steps.map((step) => [step.status, step.state])).toEqual([
      ["submitted", "done"],
      ["reviewing", "done"],
      ["shortlisted", "done"],
      ["interview", "current"],
      ["offer_sent", "upcoming"],
    ]);
    expect(timeline.nextActions.map((action) => action.status)).toEqual([
      "offer_sent",
      "hired",
      "rejected",
    ]);
  });

  test("marks terminal application states and stops action prompts", () => {
    const timeline = getApplicationTimeline("rejected", "kk");

    expect(timeline.isTerminal).toBe(true);
    expect(timeline.current.label).toBe("Бас тартылды");
    expect(timeline.nextActions).toEqual([]);
    expect(timeline.steps.at(-1)).toMatchObject({
      status: "rejected",
      state: "terminal",
    });
  });
});
