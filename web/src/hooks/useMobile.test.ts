// @vitest-environment jsdom

import { describe, expect, test } from "vitest";

import { isMobile, MOBILE_BREAKPOINT } from "./useMobile";

describe("mobile breakpoint helper", () => {
  test("uses a 768px breakpoint", () => {
    expect(MOBILE_BREAKPOINT).toBe(768);
  });

  test("detects mobile window widths below the breakpoint", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 767 });
    expect(isMobile()).toBe(true);

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 768 });
    expect(isMobile()).toBe(false);
  });
});
