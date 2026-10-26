import express from "express";
import request from "supertest";
import { expect, it, vi } from "vitest";
import { mcpGatewayProtocolRoutes } from "../routes/tool-gateway.js";
import type { ToolGatewayService } from "../services/tool-gateway.js";

it("returns a provider screenshot as a native MCP image block", async () => {
  const image = { type: "image", mimeType: "image/png", data: "iVBORw0KGgo=" };
  const gateway = { executeTool: vi.fn().mockResolvedValue({ status: "completed", result: { content: "Screenshot", data: { transport: "local_stdio", content: [image] } } }) } as unknown as ToolGatewayService;
  const app = express().use(express.json()).use(mcpGatewayProtocolRoutes(gateway));
  const response = await request(app).post("/mcp/gateways/test-gateway").set("Authorization", "Bearer fixture-token")
    .send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "browser_take_screenshot", arguments: {} } });
  expect(response.status).toBe(200);
  expect(response.body.result.content).toEqual([{ type: "text", text: "Screenshot" }, image]);
});
