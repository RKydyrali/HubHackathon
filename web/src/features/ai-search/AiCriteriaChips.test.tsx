// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AiCriteriaChips } from "./AiCriteriaChips";
import type { AiJobCriteria } from "./aiSearchTypes";

const criteria: AiJobCriteria = {
  roles: ["cashier"],
  skills: ["sales"],
  city: "Aktau",
  district: "12 mkr",
  schedule: "evening",
  workType: "part_time",
  experienceLevel: "none",
  salaryMin: 150000,
  urgency: "today",
  sourcePreference: "native",
};

describe("AiCriteriaChips", () => {
  afterEach(() => cleanup());

  test("renders criteria from props and lets users remove, reset, and run again", async () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const onRunAgain = vi.fn();

    render(
      <AiCriteriaChips
        criteria={criteria}
        onChange={onChange}
        onReset={onReset}
        onRunAgain={onRunAgain}
      />,
    );

    expect(screen.getByText("cashier")).toBeInTheDocument();
    expect(screen.getByText("sales")).toBeInTheDocument();
    expect(screen.getByText("12 mkr")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cashier/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ roles: [] }));

    fireEvent.click(screen.getByRole("button", { name: /reset|сброс|тазарту/i }));
    expect(onReset).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /again|снова|қайта/i }));
    expect(onRunAgain).toHaveBeenCalled();
  });
});
