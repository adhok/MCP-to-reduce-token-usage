import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readRelevant } from "../dist/tools/readRelevant.js";

const sourceFile = fileURLToPath(new URL("../src/tools/runAndSummarize.ts", import.meta.url));
const matched = await readRelevant({ filePath: sourceFile, query: "genericSummary" });
console.log("Matched symbol:\n", matched);
assert.equal(matched.matched, true);
assert.equal(matched.symbol.name, "genericSummary");

const toc = await readRelevant({ filePath: sourceFile, query: "xyz_nonexistent" });
console.log("Table of contents fallback:\n", toc);
assert.equal(toc.matched, false);
assert.equal(toc.astAvailable, true);
assert.ok(toc.symbols.some(({ name }) => name === "genericSummary"));

const readme = fileURLToPath(new URL("../README.md", import.meta.url));
const raw = await readRelevant({ filePath: readme, query: "anything" });
console.log("Raw-text fallback:\n", raw);
assert.equal(raw.matched, false);
assert.equal(raw.astAvailable, false);
assert.match(raw.content, /^# token-saver-mcp/);

console.log("read_relevant ad-hoc checks passed");
