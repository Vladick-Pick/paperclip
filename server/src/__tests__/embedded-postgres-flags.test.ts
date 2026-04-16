import { describe, expect, it } from "vitest";
import { resolveEmbeddedPostgresFlags } from "../embedded-postgres-flags.js";

describe("resolveEmbeddedPostgresFlags", () => {
  it("uses mmap dynamic shared memory on linux by default", () => {
    expect(resolveEmbeddedPostgresFlags({ platform: "linux", env: {} })).toEqual([
      "-c",
      "dynamic_shared_memory_type=mmap",
    ]);
  });

  it("allows overriding the dynamic shared memory type from env", () => {
    expect(
      resolveEmbeddedPostgresFlags({
        platform: "linux",
        env: {
          PAPERCLIP_EMBEDDED_POSTGRES_DYNAMIC_SHARED_MEMORY_TYPE: "posix",
        },
      }),
    ).toEqual(["-c", "dynamic_shared_memory_type=posix"]);
  });

  it("keeps existing defaults on non-linux platforms", () => {
    expect(resolveEmbeddedPostgresFlags({ platform: "darwin", env: {} })).toEqual([]);
  });
});
