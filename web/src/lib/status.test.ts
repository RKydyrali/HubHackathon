import { describe, expect, test } from "vitest";

import {
  ALLOWED_TRANSITIONS,
  canMoveApplicationStatus,
  getAllowedApplicationActions,
} from "./status";

describe("application status transitions", () => {
  test("exposes the product state machine exactly", () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      submitted: ["reviewing"],
      reviewing: ["interview", "rejected"],
      interview: ["hired", "rejected"],
      rejected: [],
      hired: [],
    });
  });

  test("returns only valid next actions for the current status", () => {
    expect(getAllowedApplicationActions("reviewing")).toEqual(["interview", "rejected"]);
    expect(canMoveApplicationStatus("reviewing", "hired")).toBe(false);
    expect(canMoveApplicationStatus("interview", "hired")).toBe(true);
  });
});
