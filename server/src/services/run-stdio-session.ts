import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../middleware/logger.js";

export const RUN_STDIO_IDLE_TTL_MS = 120_000;

type Entry = {
  companyId?: string;
  fingerprint: string;
  tail: Promise<void>;
  users: number;
  closing: boolean;
  client?: Client;
  timer?: ReturnType<typeof setTimeout>;
};
// Keys contain company, connection, agent, run and grant identity; never share a browser between runs.
const sessions = new Map<string, Entry>();
let shutdown: Promise<void> | null = null;

export function shutdownRunStdioSessions(): Promise<void> {
  shutdown ??= Promise.allSettled([...sessions.keys()].map(key => stopRunStdioSession(key, async () => undefined)))
    .then(results => {
      if (results.some(result => result.status === "rejected")) logger.warn("Some local stdio clients did not close cleanly during shutdown");
    }).finally(() => { shutdown = null; });
  return shutdown;
}

export function hasRunStdioSession(key: string) {
  return sessions.has(key);
}

export async function stopRunStdioSession<T>(key: string, afterClose: () => Promise<T>): Promise<T> {
  let entry = sessions.get(key);
  if (!entry) {
    entry = { fingerprint: "", tail: Promise.resolve(), users: 0, closing: true };
    sessions.set(key, entry);
  }
  entry.closing = true;
  clearTimeout(entry.timer);
  entry.users++;
  const previous = entry.tail;
  let release!: () => void;
  entry.tail = new Promise<void>((resolve) => { release = resolve; });
  try {
    await previous;
    await entry.client?.close();
    entry.client = undefined;
    return await afterClose();
  } finally {
    release();
    if (--entry.users === 0 && sessions.get(key) === entry) sessions.delete(key);
  }
}

export async function useRunStdioSession<T>(input: {
  companyId: string;
  key: string;
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  onIdle: () => Promise<unknown>;
}, use: (call: (params: CallToolRequest["params"]) => Promise<unknown>) => Promise<T>): Promise<T> {
  if (shutdown) throw new Error("Local stdio sessions are shutting down");
  const fingerprint = createHash("sha256").update(JSON.stringify([input.command, input.args, input.env])).digest("hex");
  let entry = sessions.get(input.key);
  if (entry && entry.fingerprint !== fingerprint) {
    await stopRunStdioSession(input.key, async () => undefined);
    throw new Error("Local stdio configuration changed; retry with the current configuration");
  }
  if (entry?.closing) throw new Error("Local stdio session is closing; retry after it stops");
  if (!entry) {
    if (sessions.size >= 16 || [...sessions.values()].filter(value => value.companyId === input.companyId).length >= 4) {
      throw new Error("Local stdio session capacity reached; retry after idle sessions stop");
    }
    entry = { companyId: input.companyId, fingerprint, tail: Promise.resolve(), users: 0, closing: false };
    sessions.set(input.key, entry);
  }
  const current = entry;
  clearTimeout(current.timer);
  current.users++;
  const previous = current.tail;
  let release!: () => void;
  current.tail = new Promise<void>((resolve) => { release = resolve; });
  try {
    await previous;
    if (current.closing) throw new Error("Local stdio session stopped before this call");
    return await use(async (params) => {
      if (!current.client) {
        const env = Object.fromEntries(Object.entries(input.env).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
        // The SDK merges inherited defaults; undefined overrides omit them at spawn.
        for (const key of Object.keys(getDefaultEnvironment())) if (!(key in env)) Reflect.set(env, key, undefined);
        const transport = new StdioClientTransport({ command: input.command, args: input.args, env, stderr: "pipe" });
        // Drain provider stderr without logging credentials or page contents.
        transport.stderr?.on("data", () => undefined);
        const client = new Client({ name: "paperclip-tool-gateway", version: "0.3.1" });
        current.client = client;
        await client.connect(transport, { timeout: input.timeoutMs });
      }
      return current.client.callTool(params, undefined, { timeout: input.timeoutMs });
    });
  } catch (error) {
    current.closing = true;
    await current.client?.close();
    current.client = undefined;
    throw error;
  } finally {
    release();
    if (--current.users === 0) {
      if (current.closing) {
        if (sessions.get(input.key) === current) sessions.delete(input.key);
      } else {
        current.timer = setTimeout(() => {
          void input.onIdle().catch(() => stopRunStdioSession(input.key, async () => undefined));
        }, RUN_STDIO_IDLE_TTL_MS);
        current.timer.unref();
      }
    }
  }
}
