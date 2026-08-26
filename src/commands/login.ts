import { createInterface } from "node:readline";
import { api, ApiError } from "../api.js";
import { activeProfileName, loadConfig, resolveApiUrl, saveConfig, type GlobalOptions } from "../config.js";
import { color, fail, print, resolveMode, type OutputOptions } from "../output.js";
import { maskToken } from "../context.js";

export async function login(opts: GlobalOptions & OutputOptions): Promise<void> {
  const mode = resolveMode(opts);
  const config = loadConfig();
  const apiUrl = resolveApiUrl(config, opts);
  const profile = activeProfileName(config, opts.profile);

  const token = opts.token || (mode === "human" ? await promptSecret("Paste your Tolt API key (Settings → API): ") : "");
  if (!token) {
    fail(mode, "No API key provided. Pass --token or run this in an interactive terminal.");
  }

  try {
    await api("/v2/programs", { token, apiUrl, query: { limit: 1 } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) fail(mode, "That API key was rejected. Check Settings → API and try again.");
    fail(mode, err instanceof Error ? err.message : "Could not verify the API key.");
  }

  config.profiles ??= {};
  config.profiles[profile] = { ...config.profiles[profile], token, ...(opts.apiUrl ? { apiUrl } : {}) };
  config.activeProfile = profile;
  saveConfig(config);

  print(mode, { ok: true, profile, apiUrl, token: maskToken(token) }, () =>
    `${color.green("✓")} Logged in. Profile ${color.bold(profile)} → ${color.dim(apiUrl)} (${maskToken(token)})`,
  );
}

function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    // Mute the echo so the pasted key is not shown.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}
