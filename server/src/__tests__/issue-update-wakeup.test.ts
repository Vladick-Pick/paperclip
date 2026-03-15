import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/error-handler.js";

type IssueStub = {
  id: string;
  companyId: string;
  title: string;
  identifier: string;
  status: string;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  createdByUserId: string | null;
};

const existingIssue: IssueStub = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "cmp-1",
  title: "Reopened scope correction",
  identifier: "CMP-99",
  status: "done",
  assigneeAgentId: "22222222-2222-4222-8222-222222222222",
  assigneeUserId: null,
  createdByUserId: null,
};

const updatedIssue: IssueStub = {
  ...existingIssue,
  status: "todo",
};

const issueServiceStub = {
  getById: vi.fn(async () => existingIssue),
  getByIdentifier: vi.fn(async () => null),
  update: vi.fn(async () => updatedIssue),
  addComment: vi.fn(async (_issueId: string, body: string) => ({
    id: "comment-1",
    body,
  })),
  findMentionedAgents: vi.fn(async () => []),
};

const heartbeatServiceStub = {
  wakeup: vi.fn(async () => null),
};

const noopAsync = vi.fn(async () => null);
const logActivityMock = vi.fn(async () => undefined);

vi.mock("../services/index.js", () => ({
  accessService: () => ({ canUser: noopAsync, hasPermission: noopAsync }),
  agentService: () => ({ getById: noopAsync }),
  goalService: () => ({ getById: noopAsync }),
  heartbeatService: () => heartbeatServiceStub,
  issueApprovalService: () => ({}),
  issueService: () => issueServiceStub,
  knowledgeService: () => ({}),
  logActivity: logActivityMock,
  projectService: () => ({ getById: noopAsync, listByIds: vi.fn(async () => []) }),
}));

async function createApp() {
  const { issueRoutes } = await import("../routes/issues.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.actor = {
      type: "board",
      userId: "local-board",
      source: "local_implicit",
      isInstanceAdmin: true,
      companyIds: ["cmp-1"],
    } as any;
    next();
  });
  app.use(issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issue update wakeups", () => {
  beforeEach(() => {
    issueServiceStub.getById.mockClear();
    issueServiceStub.getByIdentifier.mockClear();
    issueServiceStub.update.mockClear();
    issueServiceStub.addComment.mockClear();
    issueServiceStub.findMentionedAgents.mockClear();
    heartbeatServiceStub.wakeup.mockClear();
    logActivityMock.mockClear();
  });

  it("wakes the existing assignee when a closed issue is reopened via patch update", async () => {
    const app = await createApp();

    const res = await request(app)
      .patch(`/issues/${existingIssue.id}`)
      .send({
        status: "todo",
        comment: "Board correction accepted. Redo under the updated scope.",
      });

    expect(res.status).toBe(200);
    expect(issueServiceStub.update).toHaveBeenCalledWith(existingIssue.id, { status: "todo" });
    expect(issueServiceStub.addComment).toHaveBeenCalledWith(
      existingIssue.id,
      "Board correction accepted. Redo under the updated scope.",
      expect.objectContaining({ userId: "local-board" }),
    );
    expect(heartbeatServiceStub.wakeup).toHaveBeenCalledTimes(1);
    expect(heartbeatServiceStub.wakeup).toHaveBeenCalledWith(
      existingIssue.assigneeAgentId,
      expect.objectContaining({
        source: "automation",
        reason: "issue_status_changed",
        payload: expect.objectContaining({
          issueId: existingIssue.id,
          mutation: "update",
        }),
        contextSnapshot: expect.objectContaining({
          issueId: existingIssue.id,
          source: "issue.status_change",
        }),
      }),
    );
  });
});
