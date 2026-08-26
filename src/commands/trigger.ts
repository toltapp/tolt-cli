import { api } from "../api.js";
import type { GlobalOptions } from "../config.js";
import { color, fail, print, type OutputOptions } from "../output.js";
import { requireAuth } from "../context.js";
import { readListenState } from "../state.js";

export async function trigger(eventType: string, opts: GlobalOptions & OutputOptions): Promise<void> {
  const ctx = requireAuth(opts);
  if (!eventType) fail(ctx.mode, "Pass an event type, e.g. `tolt trigger commission.created`.");

  const active = readListenState();
  if (!active) fail(ctx.mode, "No running `tolt listen` session. Start one first, then trigger from another terminal.");

  const result = await api<{ delivered: boolean; type: string }>("/v2/listen/trigger", {
    token: ctx.token,
    apiUrl: active.apiUrl,
    method: "POST",
    body: { session_id: active.sessionId, event: eventType },
  }).catch((err: Error) => fail(ctx.mode, err.message));

  print(ctx.mode, { triggered: result.type }, () => `${color.green("✓")} Triggered ${color.bold(result.type)}`);
}
