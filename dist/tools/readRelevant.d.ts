export interface ReadRelevantOptions {
    filePath: string;
    query: string;
    contextLines?: number;
    maxTokens?: number;
}
export declare function readRelevant({ filePath, query, contextLines, maxTokens, }: ReadRelevantOptions): Promise<{
    matched: boolean;
    astAvailable: boolean;
    note: string;
    content: string;
    totalFileLines: number;
    tokenMetadata: import("../index/tokenBudget.js").TokenBudgetMetadata;
    symbol?: undefined;
    symbols?: undefined;
} | {
    matched: boolean;
    symbol: {
        name: string;
        kind: "function" | "class" | "method" | "interface" | "type" | "variable";
        startLine: number;
        endLine: number;
    };
    content: string;
    totalFileLines: number;
    tokenMetadata: import("../index/tokenBudget.js").TokenBudgetMetadata;
    astAvailable?: undefined;
    note?: undefined;
    symbols?: undefined;
} | {
    matched: boolean;
    astAvailable: boolean;
    note: string;
    symbols: {
        name: string;
        kind: "function" | "class" | "method" | "interface" | "type" | "variable";
        startLine: number;
        endLine: number;
    }[];
    totalFileLines: number;
    tokenMetadata: import("../index/tokenBudget.js").TokenBudgetMetadata;
    content?: undefined;
    symbol?: undefined;
}>;
