import assert from "node:assert/strict";
import { test } from "node:test";
import { SessionStats } from "../dist/index/sessionStats.js";

test("session stats aggregate compacted responses and full retrievals", () => {
  const stats = new SessionStats();
  const metadata = {
    estimationMethod: "approximate-characters-per-token",
    sourceCharacters: 400,
    returnedCharacters: 100,
    sourceTokens: 100,
    returnedTokens: 25,
    estimatedTokensSaved: 75,
    estimatedSavingsPercent: 75,
  };

  stats.record("run_command", metadata);
  stats.record("code_search", metadata);
  stats.recordFullOutput("x".repeat(40));
  const result = stats.snapshot();

  assert.equal(result.calls, 2);
  assert.equal(result.originalTokens, 200);
  assert.equal(result.returnedTokens, 50);
  assert.equal(result.estimatedTokensSaved, 150);
  assert.equal(result.fullOutputTokens, 10);
  assert.equal(result.netEstimatedTokensSaved, 140);
  assert.deepEqual(result.byTool, { run_command: 1, read_relevant: 0, code_search: 1 });

  stats.reset();
  assert.equal(stats.snapshot().calls, 0);
});
