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

test("generic summaries preserve critical errors in the middle of noisy output", () => {
  const lines = Array.from({ length: 200 }, (_, index) => `routine log line ${index + 1}`);
  lines[119] = "ERROR: database migration failed at step 7";
  lines[120] = "DETAIL: column customer_status does not exist";
  const result = summarizeOutput("custom_pipeline", lines.join("\n"));

  assert.match(result.text, /database migration failed/);
  assert.match(result.text, /customer_status does not exist/);
  assert.ok(result.text.length < lines.join("\n").length / 3);
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
