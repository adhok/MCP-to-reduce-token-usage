import assert from "node:assert/strict";
import { test } from "node:test";
import { readRelevant } from "../dist/tools/readRelevant.js";

test("read_relevant finds top-level variables in server files", async () => {
  const result = await readRelevant({ filePath: "src/server.ts", query: "server", contextLines: 2 });

  assert.equal(result.matched, true);
  assert.equal(result.symbol.name, "server");
  assert.match(result.content, /new Server/);
});

test("read_relevant returns a symbol table instead of empty content on a miss", async () => {
  const result = await readRelevant({ filePath: "src/server.ts", query: "does-not-exist" });

  assert.equal(result.matched, false);
  assert.ok(result.symbols.length > 0);
  assert.ok(result.tokenMetadata.returnedTokens > 0);
});
