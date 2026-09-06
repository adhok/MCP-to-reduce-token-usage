import assert from "node:assert/strict";
import { test } from "node:test";
import { runAndSummarize, summarizeOutput } from "../dist/tools/runAndSummarize.js";

test("large generic output is reduced and reports omitted content", async () => {
  const result = await runAndSummarize({
    command: "node -e \"for (let i = 1; i <= 200; i++) console.log('diagnostic line ' + i)\"",
    maxTokens: 120,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.originalLineCount, 200);
  assert.equal(result.wasSummarized, true);
  assert.ok(result.summaryLineCount < result.originalLineCount);
  assert.match(result.summary, /omitted|truncated/i);
  assert.ok(result.tokenMetadata.estimatedTokensSaved > 0);
});

test("failing commands preserve exit status and error text", async () => {
  const result = await runAndSummarize({
    command: "node -e \"console.error('fatal database connection error'); process.exit(7)\"",
  });

  assert.equal(result.exitCode, 7);
  assert.equal(result.timedOut, false);
  assert.match(result.summary, /fatal database connection error/);
});

test("test summaries preserve counts and failures", () => {
  const result = summarizeOutput(
    "pytest",
    "========================= test session starts =========================\n2 passed, 1 failed\nFAILED tests/login.py::test_invalid_token - Expected 401\nE AssertionError: Expected 401\n",
  );

  assert.match(result.text, /Tests:.*2 passed.*1 failed/);
  assert.match(result.text, /tests\/login.py::test_invalid_token/);
  assert.match(result.text, /Expected 401/);
});
