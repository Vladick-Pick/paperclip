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
};

const callOrder: string[] = [];
const issueStub: IssueStub = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "cmp-1",
  title: "Create with knowledge",
  identifier: "CMP-1",
  status: "backlog",
  assigneeAgentId: "22222222-2222-4222-8222-222222222222",
  assigneeUserId: null,
};

const issueServiceStub = {
  create: vi.fn(async (_companyId: string, data: Record<string, unknown>) => {
    callOrder.push("create");
    return {
      ...issueStub,
      title: String(data.title ?? issueStub.title),
      status: String(data.status ?? issueStub.status),
      assigneeAgentId: (data.assigneeAgentId as string | null | undefined) ?? null,
      assigneeUserId: (data.assigneeUserId as string | null | undefined) ?? null,
    };
  }),
};

const knowledgeServiceStub = {
  getById: vi.fn(async (knowledgeItemId: string) => ({
    id: knowledgeItemId,
    companyId: "cmp-1",
  })),
  attachToIssue: vi.fn(async (issueId: string, knowledgeItemId: string) => {
    callOrder.push(`attach:${knowledgeItemId}`);
    return {
      id: `attach-${knowledgeItemId}`,
      issueId,
      knowledgeItemId,
    };
  }),
};

const heartbeatServiceStub = {
  wakeup: vi.fn(async () => {
    callOrder.push("wakeup");
    return null;
  }),
};

const noopAsync = vi.fn(async () => null);
const logActivityMock = vi.fn(async () => undefined);

vi.mock("../services/index.js", () => ({
  accessService: () => ({ canUser: noopAsync, hasPermission: noopAsync }),
  agentService: () => ({ getById: noopAsync }),
  goalService: () => ({}),
  heartbeatService: () => heartbeatServiceStub,
  issueApprovalService: () => ({}),
  issueService: () => issueServiceStub,
  knowledgeService: () => knowledgeServiceStub,
  logActivity: logActivityMock,
  projectService: () => ({}),
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

describe("issue create knowledge routing", () => {
  beforeEach(() => {
    callOrder.length = 0;
    issueServiceStub.create.mockClear();
    knowledgeServiceStub.getById.mockClear();
    knowledgeServiceStub.attachToIssue.mockClear();
    heartbeatServiceStub.wakeup.mockClear();
    logActivityMock.mockClear();
  });

  it("attaches knowledge on the server before waking the assignee", async () => {
    const app = await createApp();

    const res = await request(app)
      .post("/companies/cmp-1/issues")
      .send({
        title: "Create with knowledge",
        status: "todo",
        assigneeAgentId: "22222222-2222-4222-8222-222222222222",
        knowledgeItemIds: [
          "33333333-3333-4333-8333-333333333333",
          "44444444-4444-4444-8444-444444444444",
        ],
      });

    expect(res.status).toBe(201);
    expect(knowledgeServiceStub.attachToIssue).toHaveBeenCalledTimes(2);
    expect(knowledgeServiceStub.attachToIssue).toHaveBeenNthCalledWith(
      1,
      issueStub.id,
      "33333333-3333-4333-8333-333333333333",
      expect.objectContaining({ userId: "local-board" }),
    );
    expect(knowledgeServiceStub.attachToIssue).toHaveBeenNthCalledWith(
      2,
      issueStub.id,
      "44444444-4444-4444-8444-444444444444",
      expect.objectContaining({ userId: "local-board" }),
    );
    expect(callOrder).toEqual([
      "create",
      "attach:33333333-3333-4333-8333-333333333333",
      "attach:44444444-4444-4444-8444-444444444444",
      "wakeup",
    ]);
  });
});
