import { describe, expect, it } from "vitest";
import { shouldSkipIssueScopedWakeForTerminalStatus } from "../services/heartbeat.js";

describe("shouldSkipIssueScopedWakeForTerminalStatus", () => {
  it("skips retries for done issues", () => {
    expect(
      shouldSkipIssueScopedWakeForTerminalStatus({
        issueStatus: "done",
        reason: "retry_failed_run",
      }),
    ).toBe(true);
  });

  it("skips wakes for cancelled issues", () => {
    expect(
      shouldSkipIssueScopedWakeForTerminalStatus({
        issueStatus: "cancelled",
        wakeReason: "resume_process_lost_run",
      }),
    ).toBe(true);
  });

  it("allows reopened comment wakes to proceed on closed issues", () => {
    expect(
      shouldSkipIssueScopedWakeForTerminalStatus({
        issueStatus: "done",
        wakeReason: "issue_reopened_via_comment",
      }),
    ).toBe(false);
  });

  it("does not skip open issues", () => {
    expect(
      shouldSkipIssueScopedWakeForTerminalStatus({
        issueStatus: "in_progress",
        reason: "retry_failed_run",
      }),
    ).toBe(false);
  });
});
