import { loadConfig, resolveApiUrl, resolveToken, type Config, type GlobalOptions } from "./config.js";
import { fail, resolveMode, type OutputMode, type OutputOptions } from "./output.js";

export type Context = {
  mode: OutputMode;
  config: Config;
  token: string;
  apiUrl: string;
};

/** Resolve output mode, config, token, and API url; exit cleanly if no token is available. */
export function requireAuth(opts: GlobalOptions & OutputOptions): Context {
  const mode = resolveMode(opts);
  const config = loadConfig();
  const apiUrl = resolveApiUrl(config, opts);
  const token = resolveToken(config, opts);
  if (!token) {
    fail(mode, "Not logged in. Run `tolt login`, pass --token, or set TOLT_API_KEY.");
  }
  return { mode, config, token, apiUrl };
}

export function maskToken(token: string): string {
  if (token.length <= 12) return "****";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}
