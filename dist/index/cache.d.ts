export declare class SessionCache {
    private readonly db;
    private readonly ttlMs;
    constructor(dbPath?: string);
    private static defaultDbPath;
    private static readTtl;
    get(key: string): {
        hit: boolean;
        summary?: string;
        fullContent?: string;
    };
    set(key: string, content: string, summary: string): void;
    has(key: string): boolean;
    getFullContent(key: string): string | undefined;
    stats(): {
        totalEntries: number;
        oldestEntryAge: number;
    };
    prune(maxAgeMs?: number): number;
    clear(): number;
    close(): void;
}
