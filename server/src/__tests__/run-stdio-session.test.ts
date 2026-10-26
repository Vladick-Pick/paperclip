import { afterEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { hasRunStdioSession, RUN_STDIO_IDLE_TTL_MS, shutdownRunStdioSessions, stopRunStdioSession, useRunStdioSession } from "../services/run-stdio-session.js";

const keys = new Set<string>();
const script = `
const rl = require("node:readline").createInterface({ input: process.stdin });
let count = 0, busy = false;
rl.on("line", line => {
  const m = JSON.parse(line);
  const reply = result => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result }) + "\\n");
  if (m.method === "initialize") reply({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "counter", version: "1" } });
  if (m.method === "tools/call") {
    if (m.params.arguments?.hang) return;
    const text = m.params.name === "env" ? JSON.stringify({ home: process.env.HOME ?? null, user: process.env.USER ?? null, allowed: process.env.ALLOWED ?? null }) : busy ? "overlap" : String(++count);
    busy = true;
    setTimeout(() => { busy = false; reply({ content: [{ type: "text", text }] }); }, 20);
  }
});`;
function input(key: string, timeoutMs = 1000) {
  keys.add(key);
  return { companyId: "company", key, command: process.execPath, args: ["-e", script], env: {}, timeoutMs,
    onIdle: () => stopRunStdioSession(key, async () => undefined) };
}
const count = (key: string) => useRunStdioSession(input(key), call => call({ name: "count", arguments: {} }));
afterEach(async () => {
  for (const key of keys) await stopRunStdioSession(key, async () => undefined);
  keys.clear();
  vi.restoreAllMocks();
});

it("serializes calls in one process and isolates another run", async () => {
  const results = await Promise.all([count("company:agent:run1"), count("company:agent:run1")]);
  expect(results).toMatchObject([{ content: [{ text: "1" }] }, { content: [{ text: "2" }] }]);
  expect(await count("company:agent:run2")).toMatchObject({ content: [{ text: "1" }] });
  await stopRunStdioSession("company:agent:run1", async () => undefined);
  expect(hasRunStdioSession("company:agent:run1")).toBe(false);
  expect(await count("company:agent:run1")).toMatchObject({ content: [{ text: "1" }] });
});

it("closes a timed-out process and starts a clean retry", async () => {
  await expect(useRunStdioSession(input("timeout", 200), call => call({ name: "count", arguments: { hang: true } }))).rejects.toThrow();
  expect(hasRunStdioSession("timeout")).toBe(false);
  expect(await count("timeout")).toMatchObject({ content: [{ text: "1" }] });
});

it("schedules idle cleanup and closes the actual session", async () => {
  const timers = vi.spyOn(globalThis, "setTimeout");
  await count("idle");
  const timer = timers.mock.calls.find(([, delay]) => delay === RUN_STDIO_IDLE_TTL_MS);
  expect(timer).toBeDefined();
  timer![0]();
  await vi.waitFor(() => expect(hasRunStdioSession("idle")).toBe(false));
});

it("reserves capacity before concurrent starts", async () => {
  const results = await Promise.allSettled([1, 2, 3, 4, 5].map(n => count(`capacity:${n}`)));
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(4);
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
});

it("keeps the explicit environment allowlist in run mode", async () => {
  expect(await useRunStdioSession({ ...input("env"), env: { ALLOWED: "approved" } }, call => call({ name: "env", arguments: {} })))
    .toMatchObject({ content: [{ text: JSON.stringify({ home: null, user: null, allowed: "approved" }) }] });
});

it("operator stop fences queued calls and shutdown drains active ownership", async () => {
  await count("close-failure");
  const close = Client.prototype.close;
  let failedCloseFinished = false;
  vi.spyOn(Client.prototype, "close").mockImplementationOnce(async function (this: Client) {
    await close.call(this);
    failedCloseFinished = true;
    throw new Error("Fixture close failure");
  });
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const first = useRunStdioSession(input("queued"), async call => { entered(); await gate; return call({ name: "count", arguments: {} }); });
  await started;
  const queued = count("queued").catch(error => error);
  const stopping = shutdownRunStdioSessions();
  await vi.waitFor(() => expect(failedCloseFinished).toBe(true));
  await expect(count("new-during-shutdown")).rejects.toThrow("shutting down");
  release();
  expect(await first).toMatchObject({ content: [{ text: "1" }] });
  expect((await queued).message).toContain("stopped before");
  await stopping;
  expect(hasRunStdioSession("queued")).toBe(false);
  expect(await count("queued")).toMatchObject({ content: [{ text: "1" }] });
});
