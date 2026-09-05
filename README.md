# token-saver-mcp

A minimal Model Context Protocol server using the official MCP SDK and stdio transport.

## Security model

This server is designed for trusted local use by a developer's coding assistant. It is not a sandbox and must not be exposed as a shared or remote service without adding an authorization and isolation layer.

- `run_command` executes arbitrary commands through the user's shell with the user's operating-system permissions.
- `read_relevant` and `code_search` can read any path that the server process can read.
- Cached command output is stored locally in `.token-saver-cache/session.db` and may contain secrets printed by commands.
- The stdio transport is local, but any client configured to launch this server should be treated as trusted.
- Use a dedicated low-privilege account, avoid running the server from sensitive environments, and do not pass secrets in commands or output when possible.

Workspace restrictions are intentionally not enabled by default because coding assistants commonly need to inspect and operate on multiple project directories. If this server is used in a shared, automated, or remote environment, add workspace allowlisting, command restrictions, authentication, process isolation, and cache encryption before deployment.

## Development

```sh
npm install
npm run build
npm test
npm start
npm run verify:release
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions and [RELEASE.md](RELEASE.md) for versioning, tagging, and publishing steps.

The repository includes `AGENTS.md` guidance that helps Codex prefer the token-saving MCP tools automatically for command execution, source search, and focused source retrieval.

For Codex, this guidance explicitly asks the agent to call `token-saver-mcp` whenever the matching tools are exposed. The executable starts the MCP stdio server directly, so its configuration uses `args: []`; unlike some MCP packages, it does not require an `mcp_serve` subcommand.

## Installation

Installation has two separate steps: install the server package, then register it with an MCP client. Registering a client does not install the npm package.

### 1. Install the server

macOS/Linux:

```sh
npm install --global token-saver-mcp
```

Windows PowerShell:

```powershell
npm install --global token-saver-mcp
```

For local development, run `npm install`, `npm run build`, and use `node dist/server.js` instead of the global command.

### 2. Check and register clients

Run the read-only diagnostic first:

```sh
token-saver-mcp --doctor --json
```

After reviewing the reported configuration paths, register one or more clients:

```sh
token-saver-mcp --install --codex --yes
token-saver-mcp --install --claudecode --yes
token-saver-mcp --install --antigravity --yes
```

Use `--all` to configure every supported client. `--yes` is required because registration changes user-level configuration. Restart the client afterward and run `--doctor --json` again to verify it.

To remove only this server’s registration:

```sh
token-saver-mcp --uninstall --all --yes
```

On Windows, configuration paths are resolved from the Windows user profile by Node.js. Set `TOKEN_SAVER_ANTIGRAVITY_CONFIG`, `TOKEN_SAVER_CLAUDE_CONFIG`, or `TOKEN_SAVER_CODEX_CONFIG` to override a path when a client uses a non-default location.

### Automatic installation into AI environments

You can automatically register `token-saver-mcp` with your AI coding tools:

```sh
# Install into all detected environments (Antigravity, Codex CLI, Claude Code)
npx token-saver-mcp --all

# Or target specific environments:
npx token-saver-mcp --antigravity
npx token-saver-mcp --codex
npx token-saver-mcp --claudecode
```

The package exposes the `token-saver-mcp` executable. If the package is not published, clone this repository, run `npm install && npm run build`, and use `node dist/server.js <flags>`.

### Install and test from this repository

```sh
git clone <repository-url>
cd token-saver-mcp
npm ci
npm run build
npm test
npm link
command -v token-saver-mcp
npm run verify:release
```

After `npm link`, verify that the executable can complete the MCP handshake:

```sh
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"verification","version":"1"}}}' | token-saver-mcp
```

The response should include `serverInfo.name` set to `token-saver-mcp`. If global linking is unavailable, replace `token-saver-mcp` in client configuration with `node /absolute/path/to/token-saver-mcp/dist/server.js`.

For Codex, register the local executable with:

```sh
codex mcp add token-saver-mcp -- token-saver-mcp
codex mcp list
```

Claude Code and Antigravity use the JSON configuration examples below. Restart or reload each client after registration.

The server exposes these tools:

- `ping(message?: string)` → `pong: <message>`
- `run_command(command, cwd?, timeoutMs?, maxTokens?)` → execute a command in the trusted local environment, return a concise summary with token metadata, and cache its full output
- `get_full_output(fullOutputKey)` → retrieve complete output cached by `run_command`
- `cache_stats()` → report local cache size and oldest-entry age
- `prune_cache(maxAgeMs?)` → remove old local cache entries
- `clear_cache(confirm: true)` → remove all local cache entries
- `read_relevant(filePath, query, contextLines?, maxTokens?)` → read source around a matching symbol with token metadata
- `code_search(query, directory?, filePattern?, maxResults?, maxTokens?)` → search source files with ranked snippets and token metadata

### Installation diagnostics

Check the local installation and supported client configuration without changing anything:

```sh
token-saver-mcp --doctor
token-saver-mcp --doctor --json
```

Installation and removal require an explicit confirmation flag because they modify user-level configuration:

```sh
token-saver-mcp --install --all --yes
token-saver-mcp --uninstall --all --yes
```

Use `--codex`, `--claudecode`, or `--antigravity` instead of `--all` to target one environment. An `AGENTS.md` file may recommend these commands, but the agent should explain the changes and obtain user approval before running them.

Token metadata is an estimate based on approximately four characters per token. It reports source size, returned size, estimated tokens saved, and savings percentage. `maxTokens` is an approximate response-content budget; exact client/model tokenization may differ.

## MCP configuration

After global installation, use the following configuration in each client. Restart or reload the client after adding it.

If you are running from a cloned repository instead, build it first and use the absolute path to `dist/server.js`:

```sh
npm ci
npm run build
```

Do not leave `/absolute/path/to/...` as a literal placeholder in client configuration.

The cache directory defaults to `.token-saver-cache/session.db` under the server working directory. Set `TOKEN_SAVER_CACHE_DIR` to change the directory, and `TOKEN_SAVER_CACHE_TTL_MS` to change the default seven-day inactivity TTL.

### Claude Code (`.mcp.json` or Claude config)

```json
{
  "mcpServers": {
    "token-saver-mcp": {
      "command": "token-saver-mcp",
      "args": []
    }
  }
}
```

For a local clone, replace the command and arguments with:

```json
{
  "mcpServers": {
    "token-saver-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/token-saver-mcp/dist/server.js"]
    }
  }
}
```

### Codex CLI

```sh
codex mcp add token-saver-mcp -- token-saver-mcp
codex mcp list
```

For a local clone, use:

```sh
codex mcp add token-saver-mcp -- node /absolute/path/to/token-saver-mcp/dist/server.js
codex mcp list
```

### Antigravity (`mcp_config.json`)

```json
{
  "mcpServers": {
    "token-saver-mcp": {
      "command": "token-saver-mcp",
      "args": []
    }
  }
}
```

For a local clone, use the same `node` command and absolute `dist/server.js` path shown in the Claude Code example.

## How token saving works

The server does not intercept every operation or automatically rewrite context already sent to a model. It exposes compacting tools, and the client chooses when to call them. The included `AGENTS.md` encourages Codex to use them for this repository; equivalent client instructions can be added for other assistants.

- Command output is summarized and the complete output is retained behind `fullOutputKey`.
- Source retrieval returns a focused symbol or bounded text instead of an entire file.
- Code search returns ranked snippets with enclosing symbols when AST parsing is available.
- Every context-producing response includes approximate token metadata.
- Use `maxTokens` when a hard response-content budget is needed.

## Supported languages and limits

AST symbol extraction currently supports TypeScript, JavaScript, and Python. Text search also works for other readable files. Defaults and maximums include:

- `timeoutMs`: 1–600,000 ms; default 60,000 ms.
- `maxTokens`: 1–100,000 approximate tokens when provided.
- `contextLines`: 0–100; default 2.
- `maxResults`: 0–1,000; default 20.
- Cache inactivity TTL: seven days by default, configurable with `TOKEN_SAVER_CACHE_TTL_MS`.

Token counts use an approximate four-characters-per-token estimate and may differ from the tokenizer used by Codex, Claude, or Antigravity.

## Troubleshooting

- If a client cannot find `token-saver-mcp`, run `command -v token-saver-mcp` and ensure the npm global bin directory is on `PATH`.
- If the package is only cloned locally, use `node /absolute/path/to/token-saver-mcp/dist/server.js` in the client configuration.
- After changing MCP configuration or `AGENTS.md`, restart the client or start a new session.
- Confirm Codex registration with `codex mcp list` and `codex mcp get token-saver-mcp`.
- Run `npm test` to verify the build, MCP utilities, cache, token budgets, AST parsing, and search behavior.

## Publishing

The package is currently prepared for npm publication but is not published automatically. Before publishing, verify the package name is available, authenticate with npm, and run:

```sh
npm login
npm whoami
npm run verify:release
npm publish
```

The package version must be incremented for every subsequent publication. See [RELEASE.md](RELEASE.md) for the full release process.
