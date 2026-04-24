import { describe, expect, test } from "vitest";

import { getSourceMeta, getStatusMeta } from "@/lib/status-ui";

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
      helper: "Отклик внутри сервиса",
    });
    expect(getSourceMeta("hh", "kk")).toMatchObject({
      label: "HH.kz",
      helper: "Өтініш сыртқы сайтта",
    });
  });
});
