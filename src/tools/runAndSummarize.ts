import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { optionalString, requiredString, boundedInteger } from "../index/validation.js";
import { applyTokenBudget, tokenMetadata, type TokenBudgetMetadata } from "../index/tokenBudget.js";

export interface RunAndSummarizeOptions {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  maxTokens?: number;
}

export interface RunAndSummarizeResult {
  exitCode: number | null;
  timedOut: boolean;
  summary: string;
  wasSummarized: boolean;
  originalLineCount: number;
  summaryLineCount: number;
  fullOutputKey: string;
  rawOutput: string;
  tokenMetadata: TokenBudgetMetadata;
  factsDetected: number;
  factsPreserved: number;
  factCoverage: number;
  importantOutputTruncated: boolean;
}

type Summary = { text: string; wasSummarized: boolean };

function terminateProcessTree(child: ReturnType<typeof spawn>): void {
  if (!child.pid) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

const linesOf = (text: string): string[] => {
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines.at(-1) === "") lines.pop();
  return text.length === 0 ? [] : lines;
};

function factMetadata(rawOutput: string, summary: string) {
  const facts = [...new Set(linesOf(rawOutput)
    .map((line) => line.trim())
    .filter((line) => /\b(?:error|failed|failure|warning|exception|traceback|fatal|panic)\b/i.test(line)
      || /(?:PIPELINE_STATUS|MAE\s*=|RMSE\s*=|Best model:|Cross-validation rows:|Forecast rows:|\d+[\d,]*\s+(?:passed|failed|skipped|errors?))/i.test(line)))];
  const preserved = facts.filter((fact) => summary.includes(fact)).length;
  return {
    factsDetected: facts.length,
    factsPreserved: preserved,
    factCoverage: facts.length === 0 ? 1 : Math.round((preserved / facts.length) * 10000) / 10000,
    importantOutputTruncated: preserved < facts.length,
  };
}

function genericSummary(lines: string[]): Summary {
  if (lines.length < 50) return { text: lines.join("\n"), wasSummarized: false };
  const importantIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /\b(?:error|failed|failure|warning|exception|traceback|fatal|panic)\b/i.test(line))
    .slice(0, 20)
    .map(({ index }) => index);
  const preservedIndexes = new Set<number>([
    ...Array.from({ length: 5 }, (_, index) => index),
    ...importantIndexes.flatMap((index) => [index - 1, index, index + 1]),
    ...Array.from({ length: 10 }, (_, index) => lines.length - 10 + index),
  ].filter((index) => index >= 0 && index < lines.length));
  const selected = [...preservedIndexes].sort((left, right) => left - right);
  const output: string[] = [];
  let previous = -2;
  for (const index of selected) {
    if (index > previous + 1) output.push(`... ${index - previous - 1} lines omitted ...`);
    output.push(lines[index]);
    previous = index;
  }
  const omitted = lines.length - selected.length;
  return {
    text: [...output, `Total omitted lines: ${omitted}`].join("\n"),
    wasSummarized: true,
  };
}

function testSummary(lines: string[], kind: "pytest" | "jest"): Summary {
  const text = lines.join("\n");
  const counts: string[] = [];
  const countPatterns: Array<[RegExp, string]> = kind === "pytest"
    ? [[/([\d,]+) passed/i, "passed"], [/([\d,]+) failed/i, "failed"], [/([\d,]+) error/i, "errors"], [/([\d,]+) skipped/i, "skipped"]]
    : [[/([\d,]+) passed/i, "passed"], [/([\d,]+) failed/i, "failed"], [/([\d,]+) todo/i, "todo"]];
  for (const [pattern, label] of countPatterns) {
    const match = text.match(pattern);
    if (match) counts.push(`${match[1]} ${label}`);
  }

  const failures: string[] = [];
  if (kind === "pytest") {
    for (const line of lines) {
      const match = line.match(/^FAILED\s+(.+?)(?:\s+-\s+(.*))?$/);
      if (match) failures.push(`- ${match[1]}${match[2] ? `: ${match[2]}` : ""}`);
    }
    for (const line of lines.filter((line) => /^E\s+/.test(line))) {
      if (failures.length > 0 && !failures.at(-1)?.includes(": ")) failures[failures.length - 1] += `: ${line.replace(/^E\s+/, "")}`;
    }
  } else {
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(/^\s*[✕×✗]\s+(.+?)(?:\s+\([\d.]+s\))?$/);
      if (match) {
        const reason = lines.slice(index + 1).find((line) => line.trim() && !/^[│|╭╰╮╯─—]+$/.test(line.trim()));
        failures.push(`- ${match[1]}${reason ? `: ${reason.trim()}` : ""}`);
      }
    }
  }

  const result = [...(counts.length ? [`Tests: ${counts.join(", ")}`] : []), ...(failures.length ? ["Failures:", ...failures] : [])];
  return result.length ? { text: result.join("\n"), wasSummarized: true } : genericSummary(lines);
}

function tscSummary(lines: string[]): Summary {
  const errors = lines.filter((line) =>
    /(?:^|\s).*?(?:\(\d+,\d+\)|:\d+:\d+).*?error\s+TS\d+:/i.test(line),
  );
  return errors.length
    ? { text: errors.join("\n"), wasSummarized: true }
    : genericSummary(lines);
}

function eslintSummary(lines: string[]): Summary {
  const violations: string[] = [];
  let currentFile = "";
  for (const line of lines) {
    if (line.trim() && !/^\s*\d+:\d+\s/.test(line) && !/^\s*✖/.test(line)) currentFile = line.trim();
    const match = line.match(/^\s*(\d+):(\d+)\s+(?:error|warning)\s+(.+?)\s+([\w/@.-]+)\s*$/);
    if (match) violations.push(`${currentFile}:${match[1]} ${match[4]}`);
  }
  return violations.length
    ? { text: violations.join("\n"), wasSummarized: true }
    : genericSummary(lines);
}

function forecastingSummary(lines: string[]): Summary {
  const important = lines.filter((line) =>
    /^(?:Loaded |Models:|Running rolling-origin|Cross-validation rows:|Forecast rows:|PIPELINE_STATUS=|Best model:|.*(?:MAE|RMSE)=)/i.test(line.trim()),
  );
  const result = [...new Set(important)];
  return result.length >= 2
    ? { text: result.join("\n"), wasSummarized: true }
    : genericSummary(lines);
}

export function summarizeOutput(command: string, output: string): Summary {
  const lines = linesOf(output);
  const commandName = command.toLowerCase();
  if (/\bpytest(?:\s|$)/.test(commandName) || /\d+ passed.*\d+ failed/i.test(output)) return testSummary(lines, "pytest");
  if (/\b(?:jest|vitest)(?:\s|$)/.test(commandName)) return testSummary(lines, "jest");
  if (/\btsc(?:\.js)?(?:\s|$)/.test(commandName) || /error TS\d+:/i.test(output)) return tscSummary(lines);
  if (/\beslint(?:\.js)?(?:\s|$)/.test(commandName)) return eslintSummary(lines);
  if (/(?:forecast|cross.?validation|statsforecast|nixtla)/i.test(commandName) || lines.some((line) => /PIPELINE_STATUS=.*|Cross-validation rows:|Forecast rows:/i.test(line))) return forecastingSummary(lines);
  return genericSummary(lines);
}

export async function runAndSummarize({ command, cwd = process.cwd(), timeoutMs = 60000, maxTokens }: RunAndSummarizeOptions): Promise<RunAndSummarizeResult> {
  command = requiredString(command, "command");
  cwd = optionalString(cwd, "cwd") ?? process.cwd();
  timeoutMs = boundedInteger(timeoutMs, "timeoutMs", 60000, 1, 600000);
  maxTokens = maxTokens === undefined ? undefined : boundedInteger(maxTokens, "maxTokens", 0, 1, 100000);
  const outputChunks: string[] = [];
  const child = spawn(command, {
    cwd,
    shell: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk: Buffer) => outputChunks.push(chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => outputChunks.push(chunk.toString()));

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    terminateProcessTree(child);
  }, timeoutMs);
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code));
  }).finally(() => clearTimeout(timeout));

  const rawOutput = outputChunks.join("");
  const commandHash = createHash("sha256").update(`${command}\0${cwd}`).digest("hex");
  const key = `${commandHash}-${randomUUID()}`;
  const result = timedOut
    ? (() => {
        const captured = genericSummary(linesOf(rawOutput)).text;
        return {
          text: [`Command timed out after ${timeoutMs}ms.`, captured].filter(Boolean).join("\n"),
          wasSummarized: true,
        };
      })()
    : summarizeOutput(command, rawOutput);
  const summary = applyTokenBudget(result.text, maxTokens);
  const outputLines = linesOf(summary);
  const facts = factMetadata(rawOutput, summary);
  return {
    exitCode: timedOut ? null : exitCode,
    timedOut,
    summary,
    wasSummarized: result.wasSummarized,
    originalLineCount: linesOf(rawOutput).length,
    summaryLineCount: outputLines.length,
    fullOutputKey: key,
    rawOutput,
    tokenMetadata: tokenMetadata(rawOutput, summary, maxTokens),
    ...facts,
  };
}
