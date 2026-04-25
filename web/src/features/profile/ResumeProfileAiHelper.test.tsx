// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAction, useMutation } from "convex/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ResumeProfileAiHelper } from "./ResumeProfileAiHelper";

vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
}));

const useActionMock = vi.mocked(useAction);
const useMutationMock = vi.mocked(useMutation);

const longResumeText = [
  "Алия Нурланова",
  "Актау, 12 мкр",
  "Администратор с опытом работы с клиентами, CRM, Excel и продажами.",
  "Ищу стабильную работу рядом с домом и готова к сменному графику.",
].join("\n");

const extractedDraft = {
  fullName: "Алия Нурланова",
  city: "Aktau",
  district: "12 мкр",
  skills: ["CRM", "Excel", "продажи"],
  bio: "Администратор с опытом клиентского сервиса.",
  resumeText: longResumeText,
};

describe("ResumeProfileAiHelper", () => {
  let extractResumeProfileDraft: ReturnType<typeof vi.fn>;
  let upsertMyProfile: ReturnType<typeof vi.fn>;

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    extractResumeProfileDraft = vi.fn().mockResolvedValue({
      ok: true,
      aiFailed: false,
      draft: extractedDraft,
    });
    upsertMyProfile = vi.fn().mockResolvedValue(null);
    useActionMock.mockReturnValue(extractResumeProfileDraft as unknown as ReturnType<typeof useAction>);
    useMutationMock.mockReturnValue(upsertMyProfile as unknown as ReturnType<typeof useMutation>);
  });

  test("shows an editable preview after extraction without saving automatically", async () => {
    render(<ResumeProfileAiHelper profile={null} />);

    fireEvent.change(screen.getByLabelText("Вставьте текст резюме"), {
      target: { value: longResumeText },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подготовить черновик" }));

    expect(await screen.findByDisplayValue("Алия Нурланова")).toBeInTheDocument();
    expect(screen.getByText("AI подготовил черновик — проверьте перед сохранением.")).toBeInTheDocument();
    expect(screen.getByLabelText("Навыки из черновика")).toHaveValue("CRM, Excel, продажи");
    expect(upsertMyProfile).not.toHaveBeenCalled();
  });

  test("persists through profile upsert only after confirmation", async () => {
    render(<ResumeProfileAiHelper profile={null} />);

    fireEvent.change(screen.getByLabelText("Вставьте текст резюме"), {
      target: { value: longResumeText },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подготовить черновик" }));
    await screen.findByDisplayValue("Алия Нурланова");

    fireEvent.change(screen.getByLabelText("О себе из черновика"), {
      target: { value: "Готова работать с клиентами и документами." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить этот черновик" }));

    await waitFor(() => {
      expect(upsertMyProfile).toHaveBeenCalledWith({
        fullName: "Алия Нурланова",
        city: "Aktau",
        district: "12 мкр",
        bio: "Готова работать с клиентами и документами.",
        skills: ["CRM", "Excel", "продажи"],
        resumeText: longResumeText,
      });
    });
  });

  test("handles too-short text and allows retry after AI failure", async () => {
    extractResumeProfileDraft.mockRejectedValueOnce(new Error("AI unavailable"));
    render(<ResumeProfileAiHelper profile={null} />);

    fireEvent.change(screen.getByLabelText("Вставьте текст резюме"), {
      target: { value: "коротко" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подготовить черновик" }));

    expect(screen.getByText("Добавьте больше текста резюме: минимум 80 символов.")).toBeInTheDocument();
    expect(extractResumeProfileDraft).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Вставьте текст резюме"), {
      target: { value: longResumeText },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подготовить черновик" }));

    expect(await screen.findByText("AI не смог подготовить черновик. Попробуйте ещё раз.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByDisplayValue("Алия Нурланова")).toBeInTheDocument();
  });
});
