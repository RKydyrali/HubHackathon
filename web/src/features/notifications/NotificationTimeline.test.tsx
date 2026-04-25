// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Notification } from "@/types/domain";
import { NotificationTimeline } from "./NotificationTimeline";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

const useQueryMock = vi.mocked(useQuery);

const notification = {
  _id: "notification_1",
  _creationTime: 1,
  userId: "user_1",
  type: "status_change",
  dedupeKey: "status_change:user_1:application_1:base",
  payload: { applicationId: "application_1" },
  title: "Status changed",
  body: "Application status changed",
  deliveryStatus: "sent",
} as unknown as Notification;

describe("NotificationTimeline", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  test("waits for the current user before deriving role-specific links", () => {
    useQueryMock.mockReturnValue(undefined);

    render(
      <MemoryRouter>
        <NotificationTimeline notifications={[notification]} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
