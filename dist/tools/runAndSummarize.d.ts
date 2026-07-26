import { type TokenBudgetMetadata } from "../index/tokenBudget.js";
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
}
type Summary = {
    text: string;
    wasSummarized: boolean;
};
export declare function summarizeOutput(command: string, output: string): Summary;
export declare function runAndSummarize({ command, cwd, timeoutMs, maxTokens }: RunAndSummarizeOptions): Promise<RunAndSummarizeResult>;
export {};
