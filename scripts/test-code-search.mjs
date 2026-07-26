import assert from "node:assert/strict";
import { codeSearch } from "../dist/tools/codeSearch.js";

const result = await codeSearch({
  query: "SessionCache",
  directory: "./src",
  filePattern: "*.ts",
  maxResults: 20,
});

console.log(JSON.stringify(result, null, 2));
assert.ok(result.totalMatches > 1);
assert.equal(result.resultsShown, result.results.length);
assert.ok(result.results.some(({ enclosingSymbol }) => enclosingSymbol?.name === "SessionCache"));
assert.ok(result.results.every(({ score }) => score > 0));
console.log("code_search ad-hoc checks passed");
