import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDoctorResult } from "../dist/installer.js";

test("doctor detects configured client files without using default paths", () => {
  const directory = mkdtempSync(join(tmpdir(), "token-saver-doctor-test-"));
  const paths = {
    antigravity: join(directory, "antigravity.json"),
    claude: join(directory, "claude.json"),
    codex: join(directory, "codex.json"),
  };
  writeFileSync(paths.antigravity, JSON.stringify({ mcpServers: { "token-saver-mcp": {} } }));
  writeFileSync(paths.claude, JSON.stringify({ mcpServers: {} }));
  writeFileSync(paths.codex, JSON.stringify({ mcpServers: {} }));

  const previous = {
    antigravity: process.env.TOKEN_SAVER_ANTIGRAVITY_CONFIG,
    claude: process.env.TOKEN_SAVER_CLAUDE_CONFIG,
    codex: process.env.TOKEN_SAVER_CODEX_CONFIG,
  };
  process.env.TOKEN_SAVER_ANTIGRAVITY_CONFIG = paths.antigravity;
  process.env.TOKEN_SAVER_CLAUDE_CONFIG = paths.claude;
  process.env.TOKEN_SAVER_CODEX_CONFIG = paths.codex;
  try {
    const result = getDoctorResult();
    assert.equal(result.clients.antigravity.configured, true);
    assert.equal(result.clients.claudeCode.configured, false);
    assert.equal(result.clients.codex.configured, false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      const name = { antigravity: "TOKEN_SAVER_ANTIGRAVITY_CONFIG", claude: "TOKEN_SAVER_CLAUDE_CONFIG", codex: "TOKEN_SAVER_CODEX_CONFIG" }[key];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
