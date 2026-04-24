// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { useMutation } from "convex/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "@/lib/convex-api";
import { ProfileEditor } from "./ProfileEditor";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

const useMutationMock = vi.mocked(useMutation);

describe("ProfileEditor", () => {
  beforeEach(() => {
    const mockedRefs = [api.profiles.upsertMyProfile];
    expect(mockedRefs).toHaveLength(1);
    const mutation = Object.assign(vi.fn(), {
      withOptimisticUpdate: vi.fn(),
    }) as unknown as ReturnType<typeof useMutation>;
    useMutationMock.mockReturnValue(mutation);
  });

  test("renders inline labeled profile sections", () => {
    render(<ProfileEditor profile={null} />);

    expect(screen.getByRole("heading", { name: "Личные данные" })).toBeInTheDocument();
    expect(screen.getByLabelText("Имя и фамилия")).toBeInTheDocument();
    expect(screen.getByLabelText("Добавить навык")).toBeInTheDocument();
    expect(screen.getByLabelText("Текст резюме")).toBeInTheDocument();
  });
});
