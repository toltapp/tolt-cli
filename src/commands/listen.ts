import { api } from "../api.js";
import type { GlobalOptions } from "../config.js";
import { color, fail, note, print, type OutputOptions } from "../output.js";
import { requireAuth } from "../context.js";

export type ListenOptions = GlobalOptions &
  OutputOptions & {
    forwardTo?: string;
    events?: string;
  };

type Session = {
  sessionId: string;
  streamUrl: string;
  signingSecret: string;
};

type RelayEvent = {
  id: string;
  type: string;
  headers: Record<string, string>;
  body: string;
};

export async function listen(opts: ListenOptions): Promise<void> {
  const ctx = requireAuth(opts);
  const events = opts.events?.split(",").map((e) => e.trim()).filter(Boolean);

  const session = await api<Session>("/v2/webhooks/listen", {
    token: ctx.token,
    apiUrl: ctx.apiUrl,
    method: "POST",
    body: { events },
  }).catch((err: Error) => fail(ctx.mode, err.message));

  const streamUrl = session.streamUrl.startsWith("http") ? session.streamUrl : `${ctx.apiUrl}${session.streamUrl}`;

  print(
    ctx.mode,
    { sessionId: session.sessionId, signingSecret: session.signingSecret, forwardTo: opts.forwardTo ?? null },
    () =>
      [
        `${color.green("✓")} Ready. Streaming ${events ? events.join(", ") : "all"} events` +
          (opts.forwardTo ? ` to ${color.bold(opts.forwardTo)}` : " (printing only)"),
        `  ${color.dim("signing secret")} ${session.signingSecret}`,
        `  ${color.dim("Ctrl+C to stop")}`,
      ].join("\n"),
  );

  const cleanup = async () => {
    await api(`/v2/webhooks/listen/${session.sessionId}`, {
      token: ctx.token,
      apiUrl: ctx.apiUrl,
      method: "DELETE",
    }).catch(() => {});
  };
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });

  await streamEvents(streamUrl, ctx.token, async (event) => {
    if (!opts.forwardTo) {
      print(ctx.mode, { received: event.type, id: event.id }, () => `${color.dim("←")} ${color.bold(event.type)} ${color.dim(event.id)}`);
      return;
    }
    try {
      const res = await fetch(opts.forwardTo, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...event.headers },
        body: event.body,
      });
      print(
        ctx.mode,
        { forwarded: event.type, id: event.id, status: res.status },
        () => `${res.ok ? color.green("→") : color.red("→")} ${color.bold(event.type)} ${color.dim(event.id)} ${res.status}`,
      );
    } catch (err) {
      note(ctx.mode, `forward failed: ${(err as Error).message}`);
    }
  });
}

/** Consume an SSE stream, invoking onEvent for each relayed webhook. */
async function streamEvents(url: string, token: string, onEvent: (event: RelayEvent) => Promise<void>): Promise<void> {
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

      const data = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        await onEvent(JSON.parse(data) as RelayEvent);
      } catch {
        // ignore keepalives and malformed frames
      }
    }
  }
}
