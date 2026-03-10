import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execute } from "@paperclipai/adapter-codex-local/server";

async function writeFakeCodexCommand(commandPath: string): Promise<void> {
  const script = `#!/usr/bin/env node
const fs = require("node:fs");

const capturePath = process.env.PAPERCLIP_TEST_CAPTURE_PATH;
const payload = {
  argv: process.argv.slice(2),
  agentHome: process.env.AGENT_HOME ?? null,
  cwd: process.cwd(),
  prompt: fs.readFileSync(0, "utf8"),
  workspaceCwd: process.env.PAPERCLIP_WORKSPACE_CWD ?? null,
  paperclipEnvKeys: Object.keys(process.env)
    .filter((key) => key.startsWith("PAPERCLIP_"))
    .sort(),
};
if (capturePath) {
  fs.writeFileSync(capturePath, JSON.stringify(payload), "utf8");
}
console.log(JSON.stringify({ type: "thread.started", thread_id: "thread-1" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }));
console.log(JSON.stringify({
  type: "turn.completed",
  usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 4 },
}));
`;
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
}

type CapturePayload = {
  argv: string[];
  agentHome: string | null;
  cwd: string;
  prompt: string;
  workspaceCwd: string | null;
  paperclipEnvKeys: string[];
};

describe("codex execute", () => {
  it("prepends runtime task context and attached issue knowledge", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-"));
    const workspace = path.join(root, "workspace");
    const agentHome = path.join(root, "agent-home");
    const commandPath = path.join(root, "agent");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(agentHome, { recursive: true });
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    let invocationPrompt = "";
    let invocationEnv: Record<string, string> | undefined;
    try {
      const result = await execute({
        runId: "run-1",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          issueId: "issue-123",
          taskId: "issue-123",
          wakeReason: "issue_assigned",
          paperclipWorkspace: {
            cwd: agentHome,
            source: "agent_home",
          },
          paperclipKnowledgeItems: [
            {
              id: "knowledge-1",
              title: "Delegation runbook",
              kind: "note",
              summary: "What the assignee needs on first wake.",
              body: "Start by checking attached knowledge before the issue thread.",
            },
          ],
        },
        authToken: "run-jwt-token",
        onLog: async () => {},
        onMeta: async (meta) => {
          invocationPrompt = meta.prompt ?? "";
          invocationEnv = meta.env;
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();
      expect(result.sessionId).toBe("thread-1");

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      const normalizedAgentHome = await fs.realpath(agentHome);
      const normalizedCwd = await fs.realpath(capture.cwd);
      expect(capture.argv).toEqual(expect.arrayContaining(["exec", "--json", "-"]));
      expect(normalizedCwd).toBe(normalizedAgentHome);
      expect(capture.agentHome).toBe(agentHome);
      expect(capture.workspaceCwd).toBe(agentHome);
      expect(capture.paperclipEnvKeys).toEqual(
        expect.arrayContaining([
          "PAPERCLIP_AGENT_ID",
          "PAPERCLIP_API_KEY",
          "PAPERCLIP_API_URL",
          "PAPERCLIP_COMPANY_ID",
          "PAPERCLIP_RUN_ID",
          "PAPERCLIP_TASK_ID",
          "PAPERCLIP_WAKE_REASON",
          "PAPERCLIP_WORKSPACE_CWD",
          "PAPERCLIP_WORKSPACE_SOURCE",
        ]),
      );
      expect(invocationEnv?.AGENT_HOME).toBe(agentHome);
      expect(capture.prompt).toContain("Paperclip runtime note:");
      expect(capture.prompt).toContain("Paperclip task context:");
      expect(capture.prompt).toContain("wakeReason: issue_assigned");
      expect(capture.prompt).toContain("issueId: issue-123");
      expect(capture.prompt).toContain("Attached issue knowledge:");
      expect(capture.prompt).toContain("Delegation runbook");
      expect(capture.prompt).toContain("Start by checking attached knowledge");
      expect(invocationPrompt).toContain("Attached issue knowledge:");
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
