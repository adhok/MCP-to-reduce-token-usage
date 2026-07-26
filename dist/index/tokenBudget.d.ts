export interface TokenBudgetMetadata {
    estimationMethod: "approximate-characters-per-token";
    sourceCharacters: number;
    returnedCharacters: number;
    sourceTokens: number;
    returnedTokens: number;
    estimatedTokensSaved: number;
    estimatedSavingsPercent: number;
    maxTokens?: number;
}
export declare function estimateTokens(text: string): number;
export declare function tokenMetadata(source: string, returned: string, maxTokens?: number): TokenBudgetMetadata;
export declare function applyTokenBudget(text: string, maxTokens?: number): string;
