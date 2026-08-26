import pc from "picocolors";

export type OutputMode = "json" | "human";

export type OutputOptions = {
  json?: boolean;
  human?: boolean;
};

export function resolveMode(opts: OutputOptions): OutputMode {
  if (opts.json) return "json";
  if (opts.human) return "human";
  if (envTruthy(process.env.TOLT_JSON)) return "json";
  return process.stdout.isTTY ? "human" : "json";
}

function envTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

/** Print a successful result: raw JSON in json mode, otherwise the human rendering. */
export function print(mode: OutputMode, data: unknown, human: () => string): void {
  if (mode === "json") {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  } else {
    process.stdout.write(`${human()}\n`);
  }
}

/** Print an error and exit non-zero, honoring the output mode. */
export function fail(mode: OutputMode, message: string, code = 1): never {
  if (mode === "json") {
    process.stdout.write(`${JSON.stringify({ error: message })}\n`);
  } else {
    process.stderr.write(`${pc.red("✗")} ${message}\n`);
  }
  process.exit(code);
}

/** A status line that only shows in human mode (json stays clean for piping). */
export function note(mode: OutputMode, message: string): void {
  if (mode === "human") process.stderr.write(`${pc.dim(message)}\n`);
}

export const color = pc;
