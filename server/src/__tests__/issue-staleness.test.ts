import { describe, expect, it } from "vitest";
import { isIssueStale } from "../services/issues.js";

describe("isIssueStale", () => {
  const now = new Date("2026-03-13T12:00:00.000Z");

  it("counts long-running in-progress issues as stale by default", () => {
    expect(
      isIssueStale(
        {
          status: "in_progress",
          startedAt: "2026-03-13T10:30:00.000Z",
          parkedUntilAt: null,
          hiddenAt: null,
        },
        { now, minutes: 60 },
      ),
    ).toBe(true);
  });

  it("excludes future-dated parked lanes from stale alerts", () => {
    expect(
      isIssueStale(
        {
          status: "in_progress",
          startedAt: "2026-03-13T08:50:46.171Z",
          parkedUntilAt: "2026-03-16T00:00:00.000Z",
          hiddenAt: null,
        },
        { now, minutes: 60 },
      ),
    ).toBe(false);
  });

  it("counts parked lanes once their parked-until window expires", () => {
    expect(
      isIssueStale(
        {
          status: "in_progress",
          startedAt: "2026-03-13T08:50:46.171Z",
          parkedUntilAt: "2026-03-13T11:00:00.000Z",
          hiddenAt: null,
        },
        { now, minutes: 60 },
      ),
    ).toBe(true);
  });

  it("ignores hidden or non-in-progress issues", () => {
    expect(
      isIssueStale(
        {
          status: "done",
          startedAt: "2026-03-13T08:50:46.171Z",
          parkedUntilAt: null,
          hiddenAt: null,
        },
        { now, minutes: 60 },
      ),
    ).toBe(false);

    expect(
      isIssueStale(
        {
          status: "in_progress",
          startedAt: "2026-03-13T08:50:46.171Z",
          parkedUntilAt: null,
          hiddenAt: "2026-03-13T11:00:00.000Z",
        },
        { now, minutes: 60 },
      ),
    ).toBe(false);
  });
});
