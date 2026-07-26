import assert from "node:assert/strict";
import { codeSearch } from "../dist/tools/codeSearch.js";
import { readRelevant } from "../dist/tools/readRelevant.js";
import { runAndSummarize } from "../dist/tools/runAndSummarize.js";

await assert.rejects(() => runAndSummarize({ command: "   " }), /command must be a non-empty string/);
await assert.rejects(() => runAndSummarize({ command: "true", timeoutMs: 0 }), /timeoutMs must be an integer/);
await assert.rejects(() => readRelevant({ filePath: "README.md", query: "title", contextLines: -1 }), /contextLines must be an integer/);
await assert.rejects(() => readRelevant({ filePath: "missing-file.txt", query: "title" }), /Unable to read file/);
await assert.rejects(() => codeSearch({ query: "[" }), /query must be a valid regular expression/);
await assert.rejects(() => codeSearch({ query: "text", maxResults: 1001 }), /maxResults must be an integer/);

console.log("validation checks passed");
