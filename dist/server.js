#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { SessionCache } from "./index/cache.js";
import { runAndSummarize } from "./tools/runAndSummarize.js";
import { readRelevant } from "./tools/readRelevant.js";
import { codeSearch } from "./tools/codeSearch.js";
import { runDoctor, runInstaller, runUninstaller } from "./installer.js";
import { SessionStats } from "./index/sessionStats.js";
const argv = process.argv.slice(2);
if (argv.includes("--doctor")) {
    runDoctor(argv.includes("--json"));
    process.exit(0);
}
if (argv.includes("--uninstall")) {
    if (!argv.includes("--yes")) {
        console.error("Uninstallation changes user configuration. Re-run with --yes after reviewing the target environments.");
        process.exit(2);
    }
    runUninstaller({
        antigravity: argv.includes("--antigravity"),
        codex: argv.includes("--codex"),
        claudecode: argv.includes("--claudecode"),
        all: argv.includes("--all") || !["--antigravity", "--codex", "--claudecode"].some((flag) => argv.includes(flag)),
    });
    process.exit(0);
}
const hasInstallFlag = argv.some((arg) => ["--install", "--antigravity", "--codex", "--claudecode", "--all", "-i"].includes(arg));
if (hasInstallFlag) {
    if (!argv.includes("--yes")) {
        console.error("Installation changes user configuration. Re-run with --yes after reviewing the target environments.");
        process.exit(2);
    }
    const options = {
        antigravity: argv.includes("--antigravity"),
        codex: argv.includes("--codex"),
        claudecode: argv.includes("--claudecode"),
        all: argv.includes("--all") || argv.includes("--install") || argv.includes("-i"),
    };
    runInstaller(options);
    process.exit(0);
}
const cache = new SessionCache();
const sessionStats = new SessionStats();
const packageJson = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"));
const server = new Server({
    name: "token-saver-mcp",
    version: packageJson.version,
}, {
    capabilities: {
        tools: {},
    },
});
function withSessionStatsFooter(response) {
    const snapshot = sessionStats.snapshot();
    return {
        ...response,
        sessionTokensSaved: snapshot.netEstimatedTokensSaved,
        sessionSavingsPercent: snapshot.netSavingsPercent,
    };
}
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "ping",
            description: "Respond with a pong message.",
            inputSchema: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "Optional message to include in the response.",
                    },
                },
                additionalProperties: false,
            },
        },
        {
            name: "run_command",
            description: "Trusted-local only: execute any shell, build, test, or lint command with the server user's permissions. Returns a concise summary and caches full output for later retrieval via get_full_output.",
            inputSchema: {
                type: "object",
                properties: {
                    command: { type: "string" },
                    cwd: { type: "string" },
                    timeoutMs: { type: "number" },
                    maxTokens: { type: "number" },
                },
                required: ["command"],
                additionalProperties: false,
            },
        },
        {
            name: "get_full_output",
            description: "Retrieve complete locally cached output from a trusted-local run_command invocation.",
            inputSchema: {
                type: "object",
                properties: { fullOutputKey: { type: "string" } },
                required: ["fullOutputKey"],
                additionalProperties: false,
            },
        },
        {
            name: "cache_stats",
            description: "Return the number and age of locally cached command outputs.",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
            name: "prune_cache",
            description: "Delete locally cached outputs older than maxAgeMs, or the configured cache TTL.",
            inputSchema: {
                type: "object",
                properties: { maxAgeMs: { type: "number" } },
                additionalProperties: false,
            },
        },
        {
            name: "clear_cache",
            description: "Delete all locally cached command outputs. Requires confirm: true.",
            inputSchema: {
                type: "object",
                properties: { confirm: { type: "boolean" } },
                required: ["confirm"],
                additionalProperties: false,
            },
        },
        {
            name: "session_stats",
            description: "Report estimated context tokens saved during this server session.",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
            name: "reset_session_stats",
            description: "Reset estimated token savings counters for this server session.",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
            name: "read_relevant",
            description: "Read the source around a symbol matching a query, or return a symbol table of contents.",
            inputSchema: {
                type: "object",
                properties: {
                    filePath: { type: "string" },
                    query: { type: "string" },
                    contextLines: { type: "number", default: 2 },
                    maxTokens: { type: "number" },
                },
                required: ["filePath", "query"],
                additionalProperties: false,
            },
        },
        {
            name: "code_search",
            description: "Search source files and return ranked matching snippets with enclosing symbols.",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string" },
                    directory: { type: "string", default: "." },
                    filePattern: { type: "string" },
                    maxResults: { type: "number", default: 20 },
                    maxTokens: { type: "number" },
                },
                required: ["query"],
                additionalProperties: false,
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "run_command") {
        const args = (request.params.arguments ?? {});
        const result = await runAndSummarize(args);
        const { rawOutput: _rawOutput, ...response } = result;
        cache.set(result.fullOutputKey, result.rawOutput, result.summary);
        sessionStats.record("run_command", result.tokenMetadata);
        return { content: [{ type: "text", text: JSON.stringify(withSessionStatsFooter(response)) }] };
    }
    if (request.params.name === "get_full_output") {
        const args = (request.params.arguments ?? {});
        if (typeof args.fullOutputKey !== "string" || args.fullOutputKey.trim().length === 0) {
            throw new Error("fullOutputKey must be a non-empty string.");
        }
        const fullOutput = cache.getFullContent(args.fullOutputKey);
        if (fullOutput === undefined)
            throw new Error(`No cached output found for key: ${args.fullOutputKey}`);
        sessionStats.recordFullOutput(fullOutput);
        const snapshot = sessionStats.snapshot();
        return {
            content: [
                { type: "text", text: fullOutput },
                {
                    type: "text",
                    text: JSON.stringify({
                        sessionTokensSaved: snapshot.netEstimatedTokensSaved,
                        sessionSavingsPercent: snapshot.netSavingsPercent,
                    }),
                },
            ],
        };
    }
    if (request.params.name === "cache_stats") {
        return { content: [{ type: "text", text: JSON.stringify(cache.stats()) }] };
    }
    if (request.params.name === "prune_cache") {
        const args = (request.params.arguments ?? {});
        const deletedEntries = args.maxAgeMs === undefined ? cache.prune() : cache.prune(args.maxAgeMs);
        return { content: [{ type: "text", text: JSON.stringify({ deletedEntries, ...cache.stats() }) }] };
    }
    if (request.params.name === "clear_cache") {
        const args = (request.params.arguments ?? {});
        if (args.confirm !== true)
            throw new Error("clear_cache requires confirm: true.");
        const deletedEntries = cache.clear();
        return { content: [{ type: "text", text: JSON.stringify({ deletedEntries }) }] };
    }
    if (request.params.name === "session_stats") {
        return { content: [{ type: "text", text: JSON.stringify(sessionStats.snapshot()) }] };
    }
    if (request.params.name === "reset_session_stats") {
        sessionStats.reset();
        return { content: [{ type: "text", text: JSON.stringify(sessionStats.snapshot()) }] };
    }
    if (request.params.name === "read_relevant") {
        const args = (request.params.arguments ?? {});
        const result = await readRelevant(args);
        sessionStats.record("read_relevant", result.tokenMetadata);
        return { content: [{ type: "text", text: JSON.stringify(withSessionStatsFooter(result)) }] };
    }
    if (request.params.name === "code_search") {
        const args = (request.params.arguments ?? {});
        const result = await codeSearch(args);
        sessionStats.record("code_search", result.tokenMetadata);
        return { content: [{ type: "text", text: JSON.stringify(withSessionStatsFooter(result)) }] };
    }
    if (request.params.name !== "ping") {
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
    const args = request.params.arguments;
    const message = args?.message ?? "";
    return {
        content: [{ type: "text", text: `pong: ${message}` }],
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
