import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agents, applyPendingMigrations, companies, createDb, documents, heartbeatRunEvents, heartbeatRuns, issueComments, issueDocuments, issues, issueThreadInteractions } from "@paperclipai/db";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "../../__tests__/helpers/embedded-postgres.js";
import { buildNativeSessionHandoff, NATIVE_HANDOFF_MAX_BYTES } from "./native-session-handoff.js";

const support = await getEmbeddedPostgresTestSupport();
(support.supported ? describe : describe.skip)("handoff database encoding", () => {
  let database: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
  let utf8: ReturnType<typeof createDb>;
  let ascii: ReturnType<typeof createDb>;
  let win1251: ReturnType<typeof createDb>;
  beforeAll(async () => {
    database = await startEmbeddedPostgresTestDatabase("paperclip-handoff-encoding-");
    utf8 = createDb(database.connectionString);
    await utf8.execute(sql`create database handoff_ascii template template0 encoding 'SQL_ASCII'`);
    const asciiUrl = new URL(database.connectionString);
    asciiUrl.pathname = "/handoff_ascii";
    await applyPendingMigrations(asciiUrl.href);
    ascii = createDb(asciiUrl.href);
    await utf8.execute(sql`create database handoff_win1251 template template0 encoding 'WIN1251'`);
    const win1251Url = new URL(database.connectionString);
    win1251Url.pathname = "/handoff_win1251";
    await applyPendingMigrations(win1251Url.href);
    win1251 = createDb(win1251Url.href);
  }, 90_000);
  afterAll(async () => database?.cleanup());

  it.each(["UTF8", "SQL_ASCII", "WIN1251"].flatMap(encoding => ["claude_local", "codex_local"].flatMap(adapterType =>
    ["in_progress", "in_review"].map(status => ({ encoding, adapterType, status })),
  )))("loads a prior $adapterType run on an $status issue using $encoding", async ({ encoding, adapterType, status }) => {
    const db = encoding === "SQL_ASCII" ? ascii : encoding === "WIN1251" ? win1251 : utf8;
    expect((await db.execute(sql`show server_encoding`))[0]).toMatchObject({ server_encoding: encoding });
    const companyId = randomUUID(), agentId = randomUUID(), issueId = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "Encoding regression", issuePrefix: `E${companyId.slice(0, 8)}` });
    await db.insert(agents).values({ id: agentId, companyId, name: "Executor", adapterType });
    await db.insert(issues).values({ id: issueId, companyId, title: "Continue", status, assigneeAgentId: agentId });
    // The ASCII database counts bytes: both excerpt edges split UTF-8 characters.
    const body = "a" + "Я".repeat(4_300) + "z";
    const [run] = await db.insert(heartbeatRuns).values({ companyId, agentId, status: "succeeded", runtimeMode: "legacy",
      contextSnapshot: { issueId }, runnerProfileJson: { adapterDispatch: { adapterType } }, resultJson: { summary: body },
      createdAt: new Date(1_000), finishedAt: new Date(2_000) }).returning({ id: heartbeatRuns.id });
    const handoff = await buildNativeSessionHandoff({ db, companyId, agentId, issueId, before: new Date(3_000) });
    expect(handoff).toContain(run.id);
    expect(handoff).toContain('"kind":"run_summary"');
    expect(handoff).toContain("aЯЯ");
    expect(handoff).toContain("ЯЯz");
    expect(Buffer.byteLength(handoff!)).toBeLessThanOrEqual(NATIVE_HANDOFF_MAX_BYTES);
    if (encoding !== "SQL_ASCII") {
      const packet = JSON.parse(handoff!.split("\n").at(-1)!);
      expect(packet.entries.find((entry: { kind: string }) => entry.kind === "run_summary").body)
        .toBe("a" + "Я".repeat(2_899) + "\n[content omitted]\n" + "Я".repeat(899) + "z");
    }

    if (encoding !== "SQL_ASCII") return;
    await db.insert(issueComments).values({ companyId, issueId, authorUserId: "board", body, createdAt: new Date(1_000) });
    await db.insert(issueThreadInteractions).values({ companyId, issueId, createdByAgentId: agentId, kind: "ask_user_questions",
      status: "answered", title: "a" + "Я".repeat(150), payload: { version: 1, questions: [] },
      result: { summaryMarkdown: body }, createdAt: new Date(1_000), resolvedAt: new Date(2_000) });
    const [document] = await db.insert(documents).values({ companyId, latestBody: body, updatedAt: new Date(2_000) }).returning({ id: documents.id });
    await db.insert(issueDocuments).values({ companyId, issueId, documentId: document.id, key: "plan", createdAt: new Date(1_000) });
    await db.insert(heartbeatRunEvents).values({ companyId, agentId, runId: run.id, seq: 1, eventType: "item.completed",
      payload: { prpEvent: { payload: { kind: "agentMessage", channel: "final", text: body } } }, createdAt: new Date(2_000) });
    const withHistory = await buildNativeSessionHandoff({ db, companyId, agentId, issueId, before: new Date(3_000) });
    for (const kind of ["original_request", "resolved_interaction", "document", "run_summary", "agent_reply"]) {
      expect(withHistory).toContain(`"kind":"${kind}"`);
    }
    expect(withHistory).toContain('"truncated":true');
    expect(Buffer.byteLength(withHistory!)).toBeLessThanOrEqual(NATIVE_HANDOFF_MAX_BYTES);
  });
});
