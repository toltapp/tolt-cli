import { api, ApiError } from "../api.js";
import { activeProfileName, type GlobalOptions } from "../config.js";
import { color, fail, print, type OutputOptions } from "../output.js";
import { maskToken, requireAuth } from "../context.js";

export async function whoami(opts: GlobalOptions & OutputOptions): Promise<void> {
  const ctx = requireAuth(opts);
  const profile = activeProfileName(ctx.config, opts.profile);

  try {
    await api("/v2/programs", { token: ctx.token, apiUrl: ctx.apiUrl, query: { limit: 1 } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) fail(ctx.mode, "Your API key is no longer valid. Run `tolt login` again.");
    fail(ctx.mode, err instanceof Error ? err.message : "Could not verify the API key.");
  }

  print(
    ctx.mode,
    { authenticated: true, profile, apiUrl: ctx.apiUrl, token: maskToken(ctx.token) },
    () => `${color.green("✓")} Authenticated on profile ${color.bold(profile)} → ${color.dim(ctx.apiUrl)} (${maskToken(ctx.token)})`,
  );
}
