import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseFile } from "../dist/index/astParser.js";

const here = dirname(fileURLToPath(import.meta.url));
const files = [
  resolve(here, "../src/tools/runAndSummarize.ts"),
  resolve(here, "ast-parser-sample.ts"),
  resolve(here, "ast-parser-sample.py"),
];

for (const filePath of files) {
  const sourceLines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const result = parseFile(filePath);
  console.log(`\n${filePath} (${result.language})`);
  for (const symbol of result.symbols) {
    console.log(`${symbol.kind} ${symbol.name} [${symbol.startLine}-${symbol.endLine}] ${symbol.signature}`);
    for (let line = symbol.startLine; line <= symbol.endLine; line += 1) {
      console.log(`  ${line}: ${sourceLines[line - 1]}`);
    }
  }
}

const sample = parseFile(resolve(here, "ast-parser-sample.ts"));
assert(sample.symbols.some(({ name, kind }) => name === "fetchUser" && kind === "function"));
assert(sample.symbols.some(({ name, kind }) => name === "User" && kind === "type"));
assert(sample.symbols.some(({ name, kind }) => name === "save" && kind === "method"));
console.log("AST coverage checks passed");
