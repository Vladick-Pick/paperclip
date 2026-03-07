import { resolve } from "node:path";

export function resolveBackupPaths({
  projectRoot,
  env,
}: {
  projectRoot: string;
  env: NodeJS.ProcessEnv;
}): {
  configFile: string;
  backupDir: string;
} {
  return {
    configFile: env.PAPERCLIP_BACKUP_CONFIG_FILE
      ? resolve(env.PAPERCLIP_BACKUP_CONFIG_FILE)
      : resolve(projectRoot, ".paperclip/config.json"),
    backupDir: env.PAPERCLIP_BACKUP_DIR
      ? resolve(env.PAPERCLIP_BACKUP_DIR)
      : resolve(projectRoot, "data/backups"),
  };
}
