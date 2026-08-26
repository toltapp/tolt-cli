import { createHmac } from "node:crypto";
import { api } from "../api.js";
import type { GlobalOptions } from "../config.js";
import { color, fail, note, print, type OutputOptions } from "../output.js";
import { requireAuth } from "../context.js";
import { clearListenState, writeListenState } from "../state.js";

export type ListenOptions = GlobalOptions &
  OutputOptions & {
    forwardTo?: string;
    events?: string;
  };

type Session = {
  session_id: string;
  stream_url: string;
  webhook_secret: string;
  events: string[];
  expires_at: string;
};

type Frame = {
  svix_id: string;
  svix_timestamp: string;
  type: string;
  body: string;
};

export async function listen(opts: ListenOptions): Promise<void> {
  const ctx = requireAuth(opts);
  const events = opts.events?.split(",").map((e) => e.trim()).filter(Boolean);

  const session = await api<Session>("/v2/listen/sessions", {
    token: ctx.token,
    apiUrl: ctx.apiUrl,
    method: "POST",
    body: { events },
  }).catch((err: Error) => fail(ctx.mode, err.message));

  const streamUrl = session.stream_url.startsWith("http") ? session.stream_url : `${ctx.apiUrl}${session.stream_url}`;
  writeListenState({ sessionId: session.session_id, apiUrl: ctx.apiUrl });

  print(
    ctx.mode,
    { session_id: session.session_id, webhook_secret: session.webhook_secret, forward_to: opts.forwardTo ?? null, events: session.events },
    () =>
      [
        `${color.green("✓")} Ready. Streaming ${events ? events.join(", ") : "all"} events` +
          (opts.forwardTo ? ` to ${color.bold(opts.forwardTo)}` : " (printing only)"),
        `  ${color.dim("signing secret")} ${session.webhook_secret}`,
        `  ${color.dim("Ctrl+C to stop")}`,
      ].join("\n"),
  );

  const shutdown = async () => {
    clearListenState();
    await api(`/v2/listen/sessions/${session.session_id}`, { token: ctx.token, apiUrl: ctx.apiUrl, method: "DELETE" }).catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await streamEvents(streamUrl, ctx.token, async (frame) => {
    if (!opts.forwardTo) {
      print(ctx.mode, { received: frame.type, id: frame.svix_id }, () => `${color.dim("←")} ${color.bold(frame.type)} ${color.dim(frame.svix_id)}`);
      return;
    }
    const signature = signSvix(session.webhook_secret, frame);
    try {
      const res = await fetch(opts.forwardTo, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "svix-id": frame.svix_id,
          "svix-timestamp": frame.svix_timestamp,
          "svix-signature": signature,
        },
        body: frame.body,
      });
      print(
        ctx.mode,
        { forwarded: frame.type, id: frame.svix_id, status: res.status },
        () => `${res.ok ? color.green("→") : color.red("→")} ${color.bold(frame.type)} ${color.dim(frame.svix_id)} ${res.status}`,
      );
    } catch (err) {
      note(ctx.mode, `forward failed: ${(err as Error).message}`);
    }
  });
}

function signSvix(secret: string, frame: Frame): string {
  const key = Buffer.from(secret.split("_")[1] ?? secret, "base64");
  const signed = `${frame.svix_id}.${frame.svix_timestamp}.${frame.body}`;
  return `v1,${createHmac("sha256", key).update(signed).digest("base64")}`;
}

async function streamEvents(url: string, token: string, onEvent: (frame: Frame) => Promise<void>): Promise<void> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" } });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      if (!/^event:\s*webhook/m.test(chunk)) continue;
      const data = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        await onEvent(JSON.parse(data) as Frame);
      } catch {
        continue;
      }
    }
  }
}
