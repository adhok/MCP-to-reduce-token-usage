import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("server completes MCP handshake and serves tools", async () => {
  const cacheDirectory = mkdtempSync(join(tmpdir(), "token-saver-mcp-protocol-"));
  const serverPath = join(process.cwd(), "dist", "server.js");
  const client = new Client({ name: "token-saver-mcp-test-client", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: process.cwd(),
    env: { ...process.env, TOKEN_SAVER_CACHE_DIR: cacheDirectory },
  });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);
    assert.ok(toolNames.includes("run_command"));
    assert.ok(toolNames.includes("session_stats"));

    const ping = await client.callTool({ name: "ping", arguments: { message: "integration" } });
    assert.equal(ping.content[0].text, "pong: integration");

    const command = await client.callTool({
      name: "run_command",
      arguments: { command: "node -e \"console.log('integration output')\"" },
    });
    assert.match(command.content[0].text, /integration output/);

    const stats = await client.callTool({ name: "session_stats", arguments: {} });
    const session = JSON.parse(stats.content[0].text);
    assert.equal(session.calls, 1);
    assert.equal(session.byTool.run_command, 1);
  } finally {
    await client.close();
    rmSync(cacheDirectory, { recursive: true, force: true });
  }
});
