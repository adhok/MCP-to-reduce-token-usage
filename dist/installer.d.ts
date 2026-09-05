export interface InstallOptions {
    antigravity?: boolean;
    codex?: boolean;
    claudecode?: boolean;
    all?: boolean;
}
export interface DoctorResult {
    packageOnPath: boolean;
    clients: Record<string, {
        configPath: string;
        configured: boolean;
        configExists: boolean;
    }>;
}
export declare function runInstaller(options: InstallOptions): boolean;
export declare function getDoctorResult(): DoctorResult;
export declare function runDoctor(json?: boolean): boolean;
export declare function runUninstaller(options: InstallOptions): boolean;
export declare function installForAntigravity(customConfigPath?: string): boolean;
export declare function installForClaudeCode(customConfigPath?: string): boolean;
export declare function installForCodex(): boolean;
