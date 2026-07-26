import { type Symbol } from "../index/astParser.js";
import { tokenMetadata } from "../index/tokenBudget.js";
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
    enclosingSymbol?: {
        name: string;
        kind: Symbol["kind"];
    };
}
export interface CodeSearchResponse {
    totalMatches: number;
    resultsShown: number;
    searchMethod: "ripgrep" | "fallback";
    results: CodeSearchResult[];
    tokenMetadata: ReturnType<typeof tokenMetadata>;
}
export declare function codeSearch({ query, directory, filePattern, maxResults, maxTokens }: CodeSearchOptions): Promise<CodeSearchResponse>;
