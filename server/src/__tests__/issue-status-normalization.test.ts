import { describe, expect, it } from "vitest";
import { normalizeAssignedIssueStatus } from "../services/issues.js";

describe("normalizeAssignedIssueStatus", () => {
  it("promotes assigned backlog issues to todo", () => {
    expect(
      normalizeAssignedIssueStatus({
        status: "backlog",
        assigneeAgentId: "agent-1",
        assigneeUserId: null,
      }),
    ).toBe("todo");
  });

  it("promotes default backlog to todo when an assignee is present", () => {
    expect(
      normalizeAssignedIssueStatus({
        assigneeAgentId: "agent-1",
        assigneeUserId: null,
      }),
    ).toBe("todo");
  });

  it("keeps backlog when the issue is unassigned", () => {
    expect(
      normalizeAssignedIssueStatus({
        status: "backlog",
        assigneeAgentId: null,
        assigneeUserId: null,
      }),
    ).toBe("backlog");
  });

  it("preserves explicit actionable statuses for assigned issues", () => {
    expect(
      normalizeAssignedIssueStatus({
        status: "blocked",
        assigneeAgentId: "agent-1",
        assigneeUserId: null,
      }),
    ).toBe("blocked");
  });

  it("repairs legacy assigned backlog state during updates", () => {
    expect(
      normalizeAssignedIssueStatus(
        {
          assigneeAgentId: "agent-1",
          assigneeUserId: null,
        },
        "backlog",
      ),
    ).toBe("todo");
  });
});
