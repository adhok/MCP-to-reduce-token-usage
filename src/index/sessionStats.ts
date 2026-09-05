import { estimateTokens, type TokenBudgetMetadata } from "./tokenBudget.js";

export type SessionTool = "run_command" | "read_relevant" | "code_search";

export class SessionStats {
  private calls = 0;
  private fullOutputRetrievals = 0;
  private sourceTokens = 0;
  private returnedTokens = 0;
  private fullOutputTokens = 0;
  private byTool: Record<SessionTool, number> = { run_command: 0, read_relevant: 0, code_search: 0 };

  record(tool: SessionTool, metadata: TokenBudgetMetadata): void {
    this.calls++;
    this.byTool[tool]++;
    this.sourceTokens += metadata.sourceTokens;
    this.returnedTokens += metadata.returnedTokens;
  }

  recordFullOutput(content: string): void {
    this.fullOutputRetrievals++;
    this.fullOutputTokens += estimateTokens(content);
  }

  snapshot() {
    const estimatedTokensSaved = Math.max(0, this.sourceTokens - this.returnedTokens);
    const netEstimatedTokensSaved = Math.max(0, estimatedTokensSaved - this.fullOutputTokens);
    return {
      calls: this.calls,
      byTool: { ...this.byTool },
      originalTokens: this.sourceTokens,
      returnedTokens: this.returnedTokens,
      estimatedTokensSaved,
      fullOutputRetrievals: this.fullOutputRetrievals,
      fullOutputTokens: this.fullOutputTokens,
      netEstimatedTokensSaved,
      savingsPercent: this.sourceTokens === 0 ? 0 : Math.round((estimatedTokensSaved / this.sourceTokens) * 10000) / 100,
      netSavingsPercent: this.sourceTokens === 0 ? 0 : Math.round((netEstimatedTokensSaved / this.sourceTokens) * 10000) / 100,
      estimationMethod: "approximate-characters-per-token" as const,
    };
  }

  reset(): void {
    this.calls = 0;
    this.fullOutputRetrievals = 0;
    this.sourceTokens = 0;
    this.returnedTokens = 0;
    this.fullOutputTokens = 0;
    this.byTool = { run_command: 0, read_relevant: 0, code_search: 0 };
  }
}
