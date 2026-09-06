import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionCache } from "../dist/index/cache.js";

const cacheDirectory = mkdtempSync(join(tmpdir(), "token-saver-cache-test-"));
const cache = new SessionCache(join(cacheDirectory, "session.db"));
try {
  cache.set("one", "first", "first summary");
  cache.set("two", "second", "second summary");
  assert.equal(cache.stats().totalEntries, 2);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.equal(cache.getFullContent("one"), "first");
  assert.equal(cache.prune(500), 1);
  assert.equal(cache.getFullContent("one"), "first");
  assert.equal(cache.getFullContent("two"), undefined);

  assert.equal(cache.clear(), 1);
  assert.equal(cache.stats().totalEntries, 0);
} finally {
  cache.close();
  rmSync(cacheDirectory, { recursive: true, force: true });
}

console.log("cache lifecycle checks passed");
