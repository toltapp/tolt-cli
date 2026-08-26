import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";

export const DEFAULT_API_URL = "https://api.tolt.com";

export type Profile = {
  token?: string;
  apiUrl?: string;
};

export type Config = {
  activeProfile?: string;
  profiles?: Record<string, Profile>;
};

export type GlobalOptions = {
  token?: string;
  apiUrl?: string;
  profile?: string;
};

function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "tolt");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function loadConfig(): Config {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8")) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  // The file holds an API key, so keep it owner-readable only.
  chmodSync(configPath(), 0o600);
}

export function activeProfileName(config: Config, override?: string): string {
  return override || config.activeProfile || "default";
}

export function activeProfile(config: Config, override?: string): Profile {
  return config.profiles?.[activeProfileName(config, override)] ?? {};
}

export function resolveToken(config: Config, opts: GlobalOptions): string | undefined {
  return opts.token || process.env.TOLT_API_KEY || activeProfile(config, opts.profile).token;
}

export function resolveApiUrl(config: Config, opts: GlobalOptions): string {
  return (
    opts.apiUrl ||
    process.env.TOLT_API_URL ||
    activeProfile(config, opts.profile).apiUrl ||
    DEFAULT_API_URL
  ).replace(/\/$/, "");
}
