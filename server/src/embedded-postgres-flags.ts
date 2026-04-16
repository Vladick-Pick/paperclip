const DYNAMIC_SHARED_MEMORY_TYPE_ENV = "PAPERCLIP_EMBEDDED_POSTGRES_DYNAMIC_SHARED_MEMORY_TYPE";

type SupportedDynamicSharedMemoryType = "posix" | "sysv" | "mmap";

type ResolveEmbeddedPostgresFlagsOptions = {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
};

function normalizeDynamicSharedMemoryType(
  value: string | undefined,
): SupportedDynamicSharedMemoryType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "posix" || normalized === "sysv" || normalized === "mmap") {
    return normalized;
  }
  return null;
}

export function resolveEmbeddedPostgresFlags(
  options: ResolveEmbeddedPostgresFlagsOptions = {},
): string[] {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const configuredType = normalizeDynamicSharedMemoryType(env[DYNAMIC_SHARED_MEMORY_TYPE_ENV]);

  if (configuredType) {
    return ["-c", `dynamic_shared_memory_type=${configuredType}`];
  }

  if (platform === "linux") {
    return ["-c", "dynamic_shared_memory_type=mmap"];
  }

  return [];
}
