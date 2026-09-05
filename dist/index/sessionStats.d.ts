import { type TokenBudgetMetadata } from "./tokenBudget.js";
export type SessionTool = "run_command" | "read_relevant" | "code_search";
export declare class SessionStats {
    private calls;
    private fullOutputRetrievals;
    private sourceTokens;
    private returnedTokens;
    private fullOutputTokens;
    private byTool;
    record(tool: SessionTool, metadata: TokenBudgetMetadata): void;
    recordFullOutput(content: string): void;
    snapshot(): {
        calls: number;
        byTool: {
            run_command: number;
            read_relevant: number;
            code_search: number;
        };
        originalTokens: number;
        returnedTokens: number;
        estimatedTokensSaved: number;
        fullOutputRetrievals: number;
        fullOutputTokens: number;
        netEstimatedTokensSaved: number;
        savingsPercent: number;
        netSavingsPercent: number;
        estimationMethod: "approximate-characters-per-token";
    };
    reset(): void;
}
