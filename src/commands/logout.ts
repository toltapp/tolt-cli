import { activeProfileName, loadConfig, saveConfig, type GlobalOptions } from "../config.js";
import { color, print, resolveMode, type OutputOptions } from "../output.js";

export async function logout(opts: GlobalOptions & OutputOptions): Promise<void> {
  const mode = resolveMode(opts);
  const config = loadConfig();
  const profile = activeProfileName(config, opts.profile);

  const existed = Boolean(config.profiles?.[profile]?.token);
  if (config.profiles?.[profile]) {
    delete config.profiles[profile].token;
  }
  saveConfig(config);

  print(mode, { ok: true, profile, removed: existed }, () =>
    existed
      ? `${color.green("✓")} Logged out of profile ${color.bold(profile)}.`
      : `${color.dim("•")} Profile ${color.bold(profile)} had no stored key.`,
  );
}
