import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync, execSync } from "node:child_process";

export interface InstallOptions {
  antigravity?: boolean;
  codex?: boolean;
  claudecode?: boolean;
  all?: boolean;
}

export interface DoctorResult {
  packageOnPath: boolean;
  clients: Record<string, { configPath: string; configured: boolean; configExists: boolean }>;
}

function getServerCommand(): { command: string; args: string[] } {
  const serverPath = process.argv[1];
  let isGlobalInPath = false;
  try {
    execFileSync(process.platform === "win32" ? "where.exe" : "which", ["token-saver-mcp"], { stdio: "ignore" });
    isGlobalInPath = true;
  } catch {
    isGlobalInPath = false;
  }

  if (!isGlobalInPath && serverPath) {
    return { command: "node", args: [serverPath] };
  }
  return { command: "token-saver-mcp", args: [] };
}

function configPaths() {
  const userHome = homedir();
  return {
    antigravity: process.env.TOKEN_SAVER_ANTIGRAVITY_CONFIG || join(userHome, ".gemini", "config", "mcp_config.json"),
    claudeCode: process.env.TOKEN_SAVER_CLAUDE_CONFIG || join(userHome, ".claude.json"),
    codex: process.env.TOKEN_SAVER_CODEX_CONFIG || join(userHome, ".codex", "mcp.json"),
  };
}

export function runInstaller(options: InstallOptions): boolean {
  const isExplicit = options.antigravity || options.codex || options.claudecode;
  const isAll = options.all || !isExplicit;
  const installAntigravity = isAll || options.antigravity;
  const installCodex = isAll || options.codex;
  const installClaudeCode = isAll || options.claudecode;

  console.log("Installing token-saver-mcp configuration...");
  let installedCount = 0;

  if (installAntigravity) {
    if (installForAntigravity()) installedCount++;
  }

  if (installClaudeCode) {
    if (installForClaudeCode()) installedCount++;
  }

  if (installCodex) {
    if (installForCodex()) installedCount++;
  }

  console.log(`\nInstallation complete. Configured ${installedCount} environment(s).`);
  return true;
}

function configHasServer(configPath: string): boolean {
  if (!existsSync(configPath)) return false;
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { mcpServers?: Record<string, unknown> };
    return Boolean(config.mcpServers && Object.prototype.hasOwnProperty.call(config.mcpServers, "token-saver-mcp"));
  } catch {
    return false;
  }
}

export function getDoctorResult(): DoctorResult {
  const { antigravity, claudeCode, codex } = configPaths();
  const config = (configPath: string) => ({
    configPath,
    configured: configHasServer(configPath),
    configExists: existsSync(configPath),
  });
  let packageOnPath = false;
  try {
    execFileSync(process.platform === "win32" ? "where.exe" : "which", ["token-saver-mcp"], { stdio: "ignore" });
    packageOnPath = true;
  } catch {
    // The server may still be usable through node dist/server.js.
  }
  return {
    packageOnPath,
    clients: { antigravity: config(antigravity), claudeCode: config(claudeCode), codex: config(codex) },
  };
}

export function runDoctor(json = false): boolean {
  const result = getDoctorResult();
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`token-saver-mcp on PATH: ${result.packageOnPath ? "yes" : "no"}`);
    for (const [client, status] of Object.entries(result.clients)) {
      console.log(`${client}: ${status.configured ? "configured" : "not configured"} (${status.configPath})`);
    }
  }
  return true;
}

function removeFromConfig(configPath: string): boolean {
  if (!existsSync(configPath)) return false;
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { mcpServers?: Record<string, unknown> };
    if (!config.mcpServers || !Object.prototype.hasOwnProperty.call(config.mcpServers, "token-saver-mcp")) return false;
    delete config.mcpServers["token-saver-mcp"];
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export function runUninstaller(options: InstallOptions): boolean {
  const isExplicit = options.antigravity || options.codex || options.claudecode;
  const isAll = options.all || !isExplicit;
  const paths = [
    ["antigravity", configPaths().antigravity, isAll || options.antigravity],
    ["claudecode", configPaths().claudeCode, isAll || options.claudecode],
    ["codex", configPaths().codex, isAll || options.codex],
  ] as const;
  let removed = 0;
  for (const [name, path, selected] of paths) {
    if (selected && removeFromConfig(path)) {
      removed++;
      console.log(`Removed token-saver-mcp from ${name} (${path}).`);
    }
  }
  console.log(`Uninstallation complete. Updated ${removed} environment(s).`);
  return true;
}

export function installForAntigravity(customConfigPath?: string): boolean {
  const configPath = customConfigPath || configPaths().antigravity;
  console.log(`\nConfiguring Antigravity MCP (${configPath})...`);
  try {
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    let configData: { mcpServers?: Record<string, unknown> } = {};
    if (existsSync(configPath)) {
      try {
        configData = JSON.parse(readFileSync(configPath, "utf8"));
      } catch {
        configData = {};
      }
    }

    if (!configData.mcpServers || typeof configData.mcpServers !== "object") {
      configData.mcpServers = {};
    }

    const { command, args } = getServerCommand();
    configData.mcpServers["token-saver-mcp"] = {
      command,
      args,
    };

    writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
    console.log("  [SUCCESS] Antigravity MCP config updated successfully.");
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] Failed to update Antigravity config: ${msg}`);
    return false;
  }
}

export function installForClaudeCode(customConfigPath?: string): boolean {
  const configPath = customConfigPath || configPaths().claudeCode;
  console.log(`\nConfiguring Claude Code MCP (${configPath})...`);
  try {
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    let configData: { mcpServers?: Record<string, unknown> } = {};
    if (existsSync(configPath)) {
      try {
        configData = JSON.parse(readFileSync(configPath, "utf8"));
      } catch {
        configData = {};
      }
    }

    if (!configData.mcpServers || typeof configData.mcpServers !== "object") {
      configData.mcpServers = {};
    }

    const { command, args } = getServerCommand();
    configData.mcpServers["token-saver-mcp"] = {
      command,
      args,
    };

    writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
    console.log("  [SUCCESS] Claude Code MCP config updated successfully.");
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] Failed to update Claude Code config: ${msg}`);
    return false;
  }
}

export function installForCodex(): boolean {
  console.log("\nConfiguring Codex CLI MCP...");
  const { command, args } = getServerCommand();
  const codexCmd = args.length > 0 ? `codex mcp add token-saver-mcp -- ${command} ${args.join(" ")}` : "codex mcp add token-saver-mcp -- token-saver-mcp";
  try {
    execSync(codexCmd, { stdio: "pipe" });
    console.log(`  [SUCCESS] Added token-saver-mcp to Codex via \`${codexCmd}\`.`);
    return true;
  } catch {
    const codexConfigPath = configPaths().codex;
    try {
      const configDir = dirname(codexConfigPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      let configData: { mcpServers?: Record<string, unknown> } = {};
      if (existsSync(codexConfigPath)) {
        try {
          configData = JSON.parse(readFileSync(codexConfigPath, "utf8"));
        } catch {
          configData = {};
        }
      }
      if (!configData.mcpServers || typeof configData.mcpServers !== "object") {
        configData.mcpServers = {};
      }
      configData.mcpServers["token-saver-mcp"] = {
        command,
        args,
      };
      writeFileSync(codexConfigPath, JSON.stringify(configData, null, 2), "utf8");
      console.log(`  [SUCCESS] Updated Codex config directly at ${codexConfigPath}.`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [WARNING] Could not execute codex CLI or update config file: ${msg}`);
      console.log(`  Manual command: ${codexCmd}`);
      return false;
    }
  }
}
