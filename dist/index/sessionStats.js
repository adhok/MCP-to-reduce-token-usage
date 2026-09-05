import { estimateTokens } from "./tokenBudget.js";
export class SessionStats {
    calls = 0;
    fullOutputRetrievals = 0;
    sourceTokens = 0;
    returnedTokens = 0;
    fullOutputTokens = 0;
    byTool = { run_command: 0, read_relevant: 0, code_search: 0 };
    record(tool, metadata) {
        this.calls++;
        this.byTool[tool]++;
        this.sourceTokens += metadata.sourceTokens;
        this.returnedTokens += metadata.returnedTokens;
    }
    recordFullOutput(content) {
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
            estimationMethod: "approximate-characters-per-token",
        };
    }
    reset() {
        this.calls = 0;
        this.fullOutputRetrievals = 0;
        this.sourceTokens = 0;
        this.returnedTokens = 0;
        this.fullOutputTokens = 0;
        this.byTool = { run_command: 0, read_relevant: 0, code_search: 0 };
    }
}
