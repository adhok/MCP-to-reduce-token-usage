import { readFileSync } from "node:fs";
import { parseFile } from "../index/astParser.js";
import { boundedInteger, requiredString } from "../index/validation.js";
import { applyTokenBudget, tokenMetadata } from "../index/tokenBudget.js";

export interface ReadRelevantOptions {
  filePath: string;
  query: string;
  contextLines?: number;
  maxTokens?: number;
}

export async function readRelevant({
  filePath,
  query,
  contextLines = 2,
  maxTokens,
}: ReadRelevantOptions) {
  filePath = requiredString(filePath, "filePath");
  query = requiredString(query, "query");
  contextLines = boundedInteger(contextLines, "contextLines", 2, 0, 100);
  maxTokens = maxTokens === undefined ? undefined : boundedInteger(maxTokens, "maxTokens", 0, 1, 100000);

  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    throw new Error(`Unable to read file: ${filePath}`);
  }
  const lines = source.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const totalFileLines = lines.length;
  const padding = Math.max(0, Math.floor(contextLines));
  const parsed = parseFile(filePath);

  if (!parsed.parsed) {
    const content = applyTokenBudget(lines.slice(0, 100).join("\n"), maxTokens);
    return {
      matched: false,
      astAvailable: false,
      note: "AST parsing wasn't available for this file type or file content.",
      content,
      totalFileLines,
      tokenMetadata: tokenMetadata(source, content, maxTokens),
    };
  }

  if (query === "*") {
    const content = applyTokenBudget(source, maxTokens);
    const symbols = parsed.symbols.map(({ name, kind, startLine, endLine }) => ({ name, kind, startLine, endLine }));
    return {
      matched: true,
      symbols,
      content,
      totalFileLines,
      tokenMetadata: tokenMetadata(source, content, maxTokens),
    };
  }

  const normalizedQuery = query.toLowerCase();
  const symbol = parsed.symbols.find(({ name }) => name.toLowerCase().includes(normalizedQuery));
  if (symbol) {
    const start = Math.max(1, symbol.startLine - padding);
    const end = Math.min(totalFileLines, symbol.endLine + padding);
    const content = applyTokenBudget(lines.slice(start - 1, end).join("\n"), maxTokens);
    return {
      matched: true,
      symbol: {
        name: symbol.name,
        kind: symbol.kind,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
      },
      content,
      totalFileLines,
      tokenMetadata: tokenMetadata(source, content, maxTokens),
    };
  }

  const symbols = parsed.symbols.map(({ name, kind, startLine, endLine }) => ({ name, kind, startLine, endLine }));
  return {
    matched: false,
    astAvailable: true,
    note: "No symbol name matched the query. Use a more specific symbol name.",
    symbols,
    totalFileLines,
    tokenMetadata: tokenMetadata(source, JSON.stringify(symbols), maxTokens),
  };
}
