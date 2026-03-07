import { describe, expect, it } from "vitest";

import { resolveBackupPaths } from "./backup-config.js";

describe("resolveBackupPaths", () => {
  it("uses project defaults when env overrides are missing", () => {
    const paths = resolveBackupPaths({
      projectRoot: "/repo",
      env: {},
    });

    expect(paths).toEqual({
      configFile: "/repo/.paperclip/config.json",
      backupDir: "/repo/data/backups",
    });
  });

  it("uses env overrides when provided", () => {
    const paths = resolveBackupPaths({
      projectRoot: "/repo",
      env: {
        PAPERCLIP_BACKUP_CONFIG_FILE: "/srv/paperclip/config.json",
        PAPERCLIP_BACKUP_DIR: "/srv/paperclip/backups",
      },
    });

    expect(paths).toEqual({
      configFile: "/srv/paperclip/config.json",
      backupDir: "/srv/paperclip/backups",
    });
  });
});
