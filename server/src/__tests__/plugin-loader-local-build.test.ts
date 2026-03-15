import { describe, expect, it, vi } from "vitest";
import { ensureRepoLocalPluginBuildArtifacts } from "../services/plugin-loader.js";

describe("ensureRepoLocalPluginBuildArtifacts", () => {
  it("builds a repo-local plugin package when the manifest output is missing", async () => {
    const runCommand = vi.fn(async () => undefined);

    await ensureRepoLocalPluginBuildArtifacts(
      "/repo/packages/plugins/examples/plugin-hello-world-example",
      {
        paperclipPlugin: {
          manifest: "./dist/manifest.js",
        },
        scripts: {
          build: "tsc",
        },
      },
      {
        repoRoot: "/repo",
        pathExists: () => false,
        runCommand,
      },
    );

    expect(runCommand).toHaveBeenCalledWith(
      "pnpm",
      ["--dir", "/repo/packages/plugins/examples/plugin-hello-world-example", "build"],
      expect.objectContaining({ timeout: 120_000 }),
    );
  });

  it("does not build when the package is outside the repo root", async () => {
    const runCommand = vi.fn(async () => undefined);

    await ensureRepoLocalPluginBuildArtifacts(
      "/external/plugin",
      {
        paperclipPlugin: {
          manifest: "./dist/manifest.js",
        },
        scripts: {
          build: "tsc",
        },
      },
      {
        repoRoot: "/repo",
        pathExists: () => false,
        runCommand,
      },
    );

    expect(runCommand).not.toHaveBeenCalled();
  });
});
