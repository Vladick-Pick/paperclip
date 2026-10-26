import { describe, expect, it } from "vitest";
import { dynamicToolResponse } from "./codex-driver-values.js";

describe("Codex MCP image delivery", () => {
  it("delivers validated image blocks as images and keeps base64 out of text", () => {
    const image = { type: "image", mimeType: "image/png", data: "iVBORw0KGgo=" };
    const result = dynamicToolResponse({ content: "Screenshot", data: { transport: "local_stdio", content: [{ type: "text", text: "Screenshot" }, image] } });
    expect(result).toMatchObject({ success: true, contentItems: [{ type: "inputText" }, { type: "inputImage", imageUrl: "data:image/png;base64,iVBORw0KGgo=" }] });
    expect(JSON.stringify((result.contentItems as Array<{text?: string}>)[0])).not.toContain(image.data);
  });
  it.each([
    { type: "image", mimeType: "text/html", data: "aGVsbG8=" },
    { type: "image", mimeType: "image/png", data: "not base64" },
  ])("does not convert malformed or unsupported image content", (image) => {
    expect(dynamicToolResponse({ data: { transport: "local_stdio", content: [image] } })).toMatchObject({ contentItems: [{ type: "inputText" }] });
  });
});
