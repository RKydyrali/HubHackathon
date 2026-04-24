// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { Doc, Id } from "@/lib/convex-api";
import { AiChatHistorySidebar } from "./AiChatHistorySidebar";

describe("AiChatHistorySidebar", () => {
  afterEach(() => cleanup());

  test("renders new chat, rename, delete, and active chat controls", () => {
    render(
      <MemoryRouter>
        <AiChatHistorySidebar
          chats={[
            {
              _id: "chat_1" as Id<"aiJobChats">,
              _creationTime: 1,
              userId: "user_1" as Id<"users">,
              title: "Frontend Aktau",
              extractedCriteria: {
                roles: ["Frontend"],
                skills: ["React"],
                city: "Aktau",
                district: null,
                schedule: null,
                workType: null,
                experienceLevel: null,
                salaryMin: null,
                urgency: null,
                sourcePreference: "any",
              },
              matchedVacancyIds: ["vacancy_1" as Id<"vacancies">],
              createdAt: 1,
              updatedAt: 2,
            },
          ] as Array<Doc<"aiJobChats">>}
          activeChatId={"chat_1"}
          onNewChat={vi.fn()}
          onRenameChat={vi.fn()}
          onDeleteChat={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /new chat/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Frontend Aktau/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /rename/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });
});
