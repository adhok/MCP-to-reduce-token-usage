import assert from "node:assert/strict";
import { codeSearch } from "../dist/tools/codeSearch.js";
import { readRelevant } from "../dist/tools/readRelevant.js";
import { runAndSummarize } from "../dist/tools/runAndSummarize.js";

const command = await runAndSummarize({
  command: "node -e \"for (let i = 0; i < 100; i++) console.log('output line ' + i)\"",
  maxTokens: 10,
});
assert.equal(command.tokenMetadata.maxTokens, 10);
assert.ok(command.tokenMetadata.estimatedTokensSaved > 0);
assert.ok(command.tokenMetadata.returnedTokens <= 10);

const relevant = await readRelevant({
  filePath: "src/tools/runAndSummarize.ts",
  query: "runAndSummarize",
  maxTokens: 20,
});
assert.equal(relevant.tokenMetadata.maxTokens, 20);
assert.ok(relevant.tokenMetadata.sourceTokens >= relevant.tokenMetadata.returnedTokens);

const search = await codeSearch({ query: "SessionCache", directory: "src", maxTokens: 20 });
assert.equal(search.tokenMetadata.maxTokens, 20);
assert.ok(search.tokenMetadata.estimatedTokensSaved >= 0);

console.log("token budget checks passed");
