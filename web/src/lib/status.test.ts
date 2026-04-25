import { describe, expect, test } from "vitest";

import {
  ALLOWED_TRANSITIONS,
  APPLICATION_TRANSITIONS,
  canMoveApplicationStatus,
  canWithdrawApplicationStatus,
  getAllowedApplicationActionsForRole,
  getAllowedApplicationActions,
} from "./status";

describe("application status transitions", () => {
  test("exposes the shared product state machine exactly", () => {
    expect(APPLICATION_TRANSITIONS).toEqual({
      submitted: ["reviewing", "withdrawn"],
      reviewing: ["shortlisted", "interview", "rejected", "withdrawn"],
      shortlisted: ["interview", "rejected", "withdrawn"],
      interview: ["offer_sent", "hired", "rejected"],
      offer_sent: ["hired", "rejected"],
      rejected: [],
      hired: [],
      withdrawn: [],
    });
  });

  test("keeps employer actions as a role-specific subset of the shared machine", () => {
    expect(ALLOWED_TRANSITIONS.submitted).toEqual(["reviewing"]);
    expect(getAllowedApplicationActionsForRole("employer", "reviewing")).toEqual([
      "shortlisted",
      "interview",
      "rejected",
    ]);
    expect(getAllowedApplicationActionsForRole("seeker", "reviewing")).toEqual(["withdrawn"]);
    expect(getAllowedApplicationActionsForRole("admin", "reviewing")).toContain("withdrawn");
  });

  test("returns only valid next actions for the current status", () => {
    expect(getAllowedApplicationActions("reviewing")).toEqual([
      "shortlisted",
      "interview",
      "rejected",
    ]);
    expect(canMoveApplicationStatus("reviewing", "hired")).toBe(false);
    expect(canMoveApplicationStatus("interview", "hired")).toBe(true);
    expect(canMoveApplicationStatus("interview", "offer_sent")).toBe(true);
    expect(canMoveApplicationStatus("reviewing", "withdrawn")).toBe(true);
    expect(canWithdrawApplicationStatus("offer_sent")).toBe(false);
  });
});
