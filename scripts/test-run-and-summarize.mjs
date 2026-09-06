import assert from "node:assert/strict";
import { runAndSummarize } from "../dist/tools/runAndSummarize.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionCache } from "../dist/index/cache.js";

const manyLines = await runAndSummarize({
  command: "node -e \"for (let i = 1; i <= 120; i++) console.log('line ' + i)\"",
});
assert.equal(manyLines.exitCode, 0);
assert.equal(manyLines.wasSummarized, true);
assert.equal(manyLines.originalLineCount, 120);
assert.match(manyLines.summary, /line 1/);
assert.match(manyLines.summary, /line 120/);
assert.match(manyLines.summary, /Total omitted lines:/);

const short = await runAndSummarize({ command: "node -e \"console.log('short output')\"" });
assert.equal(short.exitCode, 0);
assert.equal(short.wasSummarized, false);
assert.equal(short.summary, "short output");

const success = await runAndSummarize({ command: "node -e \"process.exit(0)\"" });
assert.equal(success.exitCode, 0);

const failure = await runAndSummarize({ command: "node -e \"console.error('failed'); process.exit(7)\"" });
assert.equal(failure.exitCode, 7);
assert.equal(failure.timedOut, false);
assert.match(failure.summary, /failed/);

const timeout = await runAndSummarize({
  command: "node -e \"console.log('before timeout'); setTimeout(() => {}, 5000)\"",
  timeoutMs: 100,
});
assert.equal(timeout.exitCode, null);
assert.equal(timeout.timedOut, true);
assert.match(timeout.summary, /Command timed out after 100ms/);
assert.match(timeout.summary, /before timeout/);

const identicalCommand = "node -e \"console.log('same command')\"";
const first = await runAndSummarize({ command: identicalCommand });
const second = await runAndSummarize({ command: identicalCommand });
assert.notEqual(first.fullOutputKey, second.fullOutputKey);

const cacheDirectory = mkdtempSync(join(tmpdir(), "token-saver-cache-test-"));
const cache = new SessionCache(join(cacheDirectory, "session.db"));
try {
  cache.set(first.fullOutputKey, "first", first.summary);
  cache.set(second.fullOutputKey, "second", second.summary);
  assert.equal(cache.getFullContent(first.fullOutputKey), "first");
  assert.equal(cache.getFullContent(second.fullOutputKey), "second");
} finally {
  cache.close();
  rmSync(cacheDirectory, { recursive: true, force: true });
}

console.log("run_command ad-hoc checks passed");
