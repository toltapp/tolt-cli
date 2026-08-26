import { api } from "../api.js";
import type { GlobalOptions } from "../config.js";
import { color, fail, print, type OutputOptions } from "../output.js";
import { requireAuth } from "../context.js";

export async function trigger(eventType: string, opts: GlobalOptions & OutputOptions): Promise<void> {
  const ctx = requireAuth(opts);
  if (!eventType) fail(ctx.mode, "Pass an event type, e.g. `tolt trigger commission.created`.");

  const result = await api<{ id: string; type: string }>("/v2/webhooks/trigger", {
    token: ctx.token,
    apiUrl: ctx.apiUrl,
    method: "POST",
    body: { type: eventType },
  }).catch((err: Error) => fail(ctx.mode, err.message));

  print(ctx.mode, { triggered: result.type, id: result.id }, () =>
    `${color.green("✓")} Triggered ${color.bold(result.type)} ${color.dim(result.id)}`,
  );
}
