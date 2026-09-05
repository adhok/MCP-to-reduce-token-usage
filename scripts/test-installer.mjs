import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installForAntigravity, installForClaudeCode } from "../dist/installer.js";

const testDir = join(tmpdir(), `token-saver-installer-test-${Date.now()}`);

try {
  // Test Antigravity installation
  const antigravityConfig = join(testDir, "antigravity", "mcp_config.json");
  const res1 = installForAntigravity(antigravityConfig);
  assert.equal(res1, true, "Antigravity installer should return true");
  assert.equal(existsSync(antigravityConfig), true, "Antigravity config file should be created");

  const content1 = JSON.parse(readFileSync(antigravityConfig, "utf8"));
  assert.ok(content1.mcpServers["token-saver-mcp"], "token-saver-mcp key should exist");
  assert.ok(
    content1.mcpServers["token-saver-mcp"].command === "token-saver-mcp" ||
    content1.mcpServers["token-saver-mcp"].command === "node",
    "command should be token-saver-mcp or node"
  );

  // Test Claude Code installation
  const claudeConfig = join(testDir, "claude", ".claude.json");
  const res2 = installForClaudeCode(claudeConfig);
  assert.equal(res2, true, "Claude Code installer should return true");
  assert.equal(existsSync(claudeConfig), true, "Claude Code config file should be created");

  const content2 = JSON.parse(readFileSync(claudeConfig, "utf8"));
  assert.ok(content2.mcpServers["token-saver-mcp"], "token-saver-mcp key should exist");

  console.log("Installer unit tests passed!");
} finally {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}
