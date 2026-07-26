import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parseFile, type Symbol } from "../index/astParser.js";
import { boundedInteger, optionalString, requiredString, validRegex } from "../index/validation.js";
import { applyTokenBudget, estimateTokens, tokenMetadata } from "../index/tokenBudget.js";

const execFileAsync = promisify(execFile);

export interface CodeSearchOptions {
  query: string;
  directory?: string;
  filePattern?: string;
  maxResults?: number;
  maxTokens?: number;
}

export interface CodeSearchResult {
  file: string;
  line: number;
  snippet: string;
  score: number;
  enclosingSymbol?: { name: string; kind: Symbol["kind"] };
}

export interface CodeSearchResponse {
  totalMatches: number;
  resultsShown: number;
  searchMethod: "ripgrep" | "fallback";
  results: CodeSearchResult[];
  tokenMetadata: ReturnType<typeof tokenMetadata>;
}

type Match = { file: string; line: number };

async function hasRipgrep(): Promise<boolean> {
  try {
    await execFileAsync("rg", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

function globRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
}

function matchesFilePattern(filePath: string, filePattern?: string): boolean {
  return !filePattern || globRegex(filePattern).test(basename(filePath));
}

async function walk(directory: string, filePattern?: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path, filePattern));
    else if (entry.isFile() && matchesFilePattern(path, filePattern)) files.push(path);
  }
  return files;
}

async function searchWithRipgrep(query: string, directory: string, filePattern?: string): Promise<Match[]> {
  const args = ["--json", "--no-messages", "--color", "never"];
  if (filePattern) args.push("--glob", filePattern);
  args.push("--", query, directory);
  try {
    const { stdout } = await execFileAsync("rg", args, { maxBuffer: 32 * 1024 * 1024 });
    return stdout.split(/\r?\n/).flatMap((line) => {
      if (!line) return [];
      try {
        const event = JSON.parse(line) as { type?: string; data?: { path?: { text?: string }; line_number?: number } };
        if (event.type !== "match" || !event.data?.path?.text || !event.data.line_number) return [];
        return [{ file: event.data.path.text, line: event.data.line_number }];
      } catch {
        return [];
      }
    });
  } catch (error) {
    if ((error as { code?: number }).code === 1) return [];
    throw error;
  }
}

async function searchWithFallback(query: string, directory: string, filePattern?: string): Promise<Match[]> {
  const expression = new RegExp(query, "i");
  const matches: Match[] = [];
  for (const file of await walk(directory, filePattern)) {
    let lines: string[];
    try {
      lines = (await readFile(file, "utf8")).split(/\r?\n/);
    } catch {
      continue;
    }
    lines.forEach((text, index) => {
      expression.lastIndex = 0;
      if (expression.test(text)) matches.push({ file, line: index + 1 });
    });
  }
  return matches;
}

function resultForMatch(match: Match, directory: string, symbolsByFile: Map<string, Symbol[]>): CodeSearchResult | null {
  try {
    const lines = readFileSync(match.file, "utf8").split(/\r?\n/);
    let symbols = symbolsByFile.get(match.file);
    if (!symbols) {
      symbols = parseFile(match.file).symbols;
      symbolsByFile.set(match.file, symbols);
    }
    const enclosing = symbols.find((symbol) => symbol.startLine <= match.line && match.line <= symbol.endLine);
    const start = Math.max(0, match.line - 3);
    const end = Math.min(lines.length, match.line + 2);
    return {
      file: relative(directory, match.file) || basename(match.file),
      line: match.line,
      snippet: lines.slice(start, end).join("\n"),
      score: 0,
      ...(enclosing ? { enclosingSymbol: { name: enclosing.name, kind: enclosing.kind } } : {}),
    };
  } catch {
    return null;
  }
}

function rankResult(result: CodeSearchResult, query: string): CodeSearchResult {
  const normalizedQuery = query.toLowerCase();
  let score = 1;
  if (result.file.toLowerCase().includes(normalizedQuery)) score += 2;
  if (result.enclosingSymbol?.name.toLowerCase() === normalizedQuery) score += 10;
  else if (result.enclosingSymbol?.name.toLowerCase().includes(normalizedQuery)) score += 5;
  if (result.snippet.toLowerCase().includes(normalizedQuery)) score += 2;
  return { ...result, score };
}

export async function codeSearch({ query, directory = ".", filePattern, maxResults = 20, maxTokens }: CodeSearchOptions): Promise<CodeSearchResponse> {
  query = validRegex(requiredString(query, "query"), "query");
  directory = requiredString(directory, "directory");
  filePattern = optionalString(filePattern, "filePattern");
  const limit = boundedInteger(maxResults, "maxResults", 20, 0, 1000);
  maxTokens = maxTokens === undefined ? undefined : boundedInteger(maxTokens, "maxTokens", 0, 1, 100000);
  const useRipgrep = await hasRipgrep();
  const matches = useRipgrep
    ? await searchWithRipgrep(query, directory, filePattern)
    : await searchWithFallback(query, directory, filePattern);
  const symbolsByFile = new Map<string, Symbol[]>();
  const unboundedResults = matches
    .map((match) => resultForMatch(match, directory, symbolsByFile))
    .filter((result): result is CodeSearchResult => result !== null)
    .map((result) => rankResult(result, query))
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file) || left.line - right.line)
    .slice(0, limit);
  const unboundedText = JSON.stringify(unboundedResults);
  let results = unboundedResults;
  if (maxTokens !== undefined && estimateTokens(unboundedText) > maxTokens) {
    results = [];
    for (const result of unboundedResults) {
      const candidate = [...results, result];
      if (estimateTokens(JSON.stringify(candidate)) > maxTokens) break;
      results = candidate;
    }
  }
  const returnedText = applyTokenBudget(JSON.stringify(results), maxTokens);
  return {
    totalMatches: matches.length,
    resultsShown: results.length,
    searchMethod: useRipgrep ? "ripgrep" : "fallback",
    results,
    tokenMetadata: tokenMetadata(unboundedText, returnedText, maxTokens),
  };
}
