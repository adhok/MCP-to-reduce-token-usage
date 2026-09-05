# token-saver-mcp

An MCP server that helps coding agents use less context when working with command output and source files.

It provides compact command summaries, focused file reads, ranked code search, AST-aware context, and cached full output when needed.

## Quick start

This repository is not currently published to npm. Install it locally:

```sh
git clone https://github.com/adhok/MCP-to-reduce-token-usage.git
cd MCP-to-reduce-token-usage
npm install
npm run build
```

The server is now at `dist/server.js`. Use its absolute path when configuring a client. On Windows, use the same commands in PowerShell and a Windows path such as `C:\Users\you\MCP-to-reduce-token-usage\dist\server.js`.

## Install for an AI coding tool

Check the setup first. This command is read-only:

```sh
node dist/server.js --doctor --json
```

Register the server with the tools you use. Registration changes user-level configuration, so `--yes` is required.

### Codex CLI

```sh
node dist/server.js --install --codex --yes
codex mcp list
```

If the installer cannot find the Codex CLI, register the local server directly:

```sh
codex mcp add token-saver-mcp -- node /absolute/path/to/MCP-to-reduce-token-usage/dist/server.js
```

### Claude Code

```sh
node dist/server.js --install --claudecode --yes
```

### Antigravity

```sh
node dist/server.js --install --antigravity --yes
```

Use `--all` to configure every supported client:

```sh
node dist/server.js --install --all --yes
```

The installer registers an already-built local server; it does not run `npm install`. Restart the AI coding tool after registration.

## Check that it works

Run the diagnostic again:

```sh
node dist/server.js --doctor --json
```

Each client you configured should show `configured: true`. Then ask the coding tool to call `ping`; it should return a `pong` response.

To check the repository implementation itself:

```sh
npm test
```

To remove this server from client configuration:

```sh
node dist/server.js --uninstall --all --yes
```

## Windows

The installer uses Windows-compatible Node.js path and executable lookup APIs. If a client uses a non-default configuration path, set an override before running `--doctor` or `--install`:

```powershell
$env:TOKEN_SAVER_CODEX_CONFIG = "C:\path\to\mcp.json"
$env:TOKEN_SAVER_CLAUDE_CONFIG = "C:\path\to\.claude.json"
$env:TOKEN_SAVER_ANTIGRAVITY_CONFIG = "C:\path\to\mcp_config.json"
node dist/server.js --doctor --json
```

## How it saves context

The server does not rewrite context already sent to a model. The coding tool chooses when to call its MCP tools:

- `run_command` returns a compact summary and a key for retrieving full output.
- `read_relevant` returns a focused symbol or bounded text instead of an entire file.
- `code_search` returns ranked snippets and enclosing symbols.
- `ping`, `get_full_output`, `cache_stats`, `prune_cache`, and `clear_cache` provide supporting operations.
- `session_stats` reports estimated savings for the current MCP process; `reset_session_stats` starts the measurement over.

Token counts are approximate, based on roughly four characters per token. AST extraction currently supports TypeScript, JavaScript, and Python.

## Security

This server is intended for trusted local use. `run_command` executes shell commands with the server process’s permissions, and the file tools can read any path the process can read. Cached output may contain secrets. Do not expose the server remotely without authentication, isolation, workspace restrictions, command restrictions, and cache protection.

## Development

```sh
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions and [RELEASE.md](RELEASE.md) for publishing instructions.
