export type SupportedLanguage = "typescript" | "javascript" | "python";
export interface Symbol {
    name: string;
    kind: "function" | "class" | "method" | "interface" | "type" | "variable";
    startLine: number;
    endLine: number;
    signature: string;
}
export interface ParseResult {
    language: string;
    symbols: Symbol[];
    parsed: boolean;
}
export declare function detectLanguage(filePath: string): SupportedLanguage | null;
export declare function parseFile(filePath: string): ParseResult;
