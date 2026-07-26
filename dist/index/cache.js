import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export class SessionCache {
    db;
    ttlMs;
    constructor(dbPath = resolve(process.env.TOKEN_SAVER_CACHE_DIR ?? resolve(process.cwd(), ".token-saver-cache"), "session.db")) {
        this.ttlMs = SessionCache.readTtl();
        mkdirSync(dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        content_hash TEXT,
        full_content TEXT,
        summary TEXT,
        created_at INTEGER,
        last_accessed_at INTEGER
      )
    `);
        this.prune();
    }
    static readTtl() {
        const value = process.env.TOKEN_SAVER_CACHE_TTL_MS;
        if (value === undefined)
            return DEFAULT_TTL_MS;
        const ttl = Number(value);
        if (!Number.isInteger(ttl) || ttl <= 0) {
            throw new Error("TOKEN_SAVER_CACHE_TTL_MS must be a positive integer.");
        }
        return ttl;
    }
    get(key) {
        const entry = this.db
            .prepare("SELECT summary, full_content FROM cache_entries WHERE key = ?")
            .get(key);
        if (!entry)
            return { hit: false };
        this.db
            .prepare("UPDATE cache_entries SET last_accessed_at = ? WHERE key = ?")
            .run(Date.now(), key);
        return { hit: true, summary: entry.summary, fullContent: entry.full_content };
    }
    set(key, content, summary) {
        this.prune();
        const now = Date.now();
        const contentHash = createHash("sha256").update(content).digest("hex");
        this.db
            .prepare(`
        INSERT INTO cache_entries
          (key, content_hash, full_content, summary, created_at, last_accessed_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          content_hash = excluded.content_hash,
          full_content = excluded.full_content,
          summary = excluded.summary,
          last_accessed_at = excluded.last_accessed_at
      `)
            .run(key, contentHash, content, summary, now, now);
    }
    has(key) {
        const entry = this.db
            .prepare("SELECT 1 FROM cache_entries WHERE key = ? LIMIT 1")
            .get(key);
        return entry !== undefined;
    }
    getFullContent(key) {
        return this.get(key).fullContent;
    }
    stats() {
        this.prune();
        const result = this.db
            .prepare("SELECT COUNT(*) AS total_entries, MIN(created_at) AS oldest_created_at FROM cache_entries")
            .get();
        return {
            totalEntries: result.total_entries,
            oldestEntryAge: result.oldest_created_at === null ? 0 : Date.now() - result.oldest_created_at,
        };
    }
    prune(maxAgeMs = this.ttlMs) {
        if (!Number.isInteger(maxAgeMs) || maxAgeMs <= 0) {
            throw new Error("maxAgeMs must be a positive integer.");
        }
        const cutoff = Date.now() - maxAgeMs;
        return this.db.prepare("DELETE FROM cache_entries WHERE last_accessed_at < ?").run(cutoff).changes;
    }
    clear() {
        return this.db.prepare("DELETE FROM cache_entries").run().changes;
    }
    close() {
        this.db.close();
    }
}
