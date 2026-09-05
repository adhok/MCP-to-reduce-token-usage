import assert from "node:assert/strict";
import { SessionStats } from "../dist/index/sessionStats.js";

const stats = new SessionStats();
stats.record("run_command", {
  estimationMethod: "approximate-characters-per-token",
  sourceCharacters: 400,
  returnedCharacters: 100,
  sourceTokens: 100,
  returnedTokens: 25,
  estimatedTokensSaved: 75,
  estimatedSavingsPercent: 75,
});
stats.recordFullOutput("x".repeat(40));
assert.deepEqual(stats.snapshot(), {
  calls: 1,
  byTool: { run_command: 1, read_relevant: 0, code_search: 0 },
  originalTokens: 100,
  returnedTokens: 25,
  estimatedTokensSaved: 75,
  fullOutputRetrievals: 1,
  fullOutputTokens: 10,
  netEstimatedTokensSaved: 65,
  savingsPercent: 75,
  netSavingsPercent: 65,
  estimationMethod: "approximate-characters-per-token",
});
stats.reset();
assert.equal(stats.snapshot().calls, 0);
console.log("session stats checks passed");
