# Codex MCP Usage

When working in this repository, explicitly use the `token-saver-mcp` MCP tools for context-producing operations whenever the server is exposed in the current Codex session. Do not substitute native shell, broad search, or whole-file reads when the corresponding MCP tool is available:

- Use `run_command` for shell, build, test, lint, and diagnostic commands.
- Use `code_search` instead of broad recursive source searches.
- Use `read_relevant` instead of reading entire source files when a symbol or focused context is sufficient.
- Use `maxTokens` for potentially large command, search, or source responses.
- Use the returned token metadata to report estimated tokens saved when relevant.
- Use `get_full_output` only when the concise command summary is insufficient.
- Use `cache_stats`, `prune_cache`, and `clear_cache` for cache lifecycle management when needed.

If `token-saver-mcp` is not listed as an available MCP server, say that it is unavailable instead of claiming to have used it. The executable is already an MCP stdio server and requires no `mcp_serve` argument.

The MCP is trusted-local only. Do not pass credentials or sensitive output through commands unnecessarily.
