import { createRequire } from "node:module";
import path from "node:path";
import { asString } from "@paperclipai/adapter-utils/server-utils";

export function resolveCodexCliCommand(config: Record<string, unknown>, targetIsRemote: boolean): string {
  const configured = asString(config.command, "");
  if (configured || !config.managedAiConnection || targetIsRemote || process.platform === "win32") {
    return configured || "codex";
  }
  const acpRequire = createRequire(createRequire(import.meta.url).resolve("@agentclientprotocol/codex-acp/package.json"));
  return path.join(path.dirname(acpRequire.resolve("@openai/codex/package.json")), "bin", "codex.js");
}
