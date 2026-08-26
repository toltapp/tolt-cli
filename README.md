# @tolt/cli

The Tolt command line. Stream your webhooks to localhost while you build, fire sample events, and talk to the API from your terminal.

## Install

```bash
npm install -g @tolt/cli
```

Or run it without installing:

```bash
npx @tolt/cli listen --forward-to http://localhost:3000/api/webhooks/tolt
```

## Get started

Log in once with an API key from your Tolt dashboard (Settings → API):

```bash
tolt login
```

Then point your webhooks at your local server:

```bash
tolt listen --forward-to http://localhost:3000/api/webhooks/tolt
```

`listen` prints a signing secret. Configure your local webhook handler to verify with it, and every event Tolt sends for your org is delivered straight to your machine, with the original signature intact. In another terminal, send a sample event to see it flow through:

```bash
tolt trigger commission.created
```

## Commands

| Command | What it does |
| --- | --- |
| `tolt login` | Verify an API key and store it. |
| `tolt whoami` | Show the active profile and confirm the key still works. |
| `tolt logout` | Remove the stored key for a profile. |
| `tolt listen` | Stream your webhooks to a local URL. `--forward-to <url>`, `--events a,b`. |
| `tolt trigger <event>` | Send a sample event of that type through your webhooks. |

## Configuration

The CLI resolves your API key in this order:

1. `--token <key>`
2. `TOLT_API_KEY`
3. the active profile in `~/.config/tolt/config.json`

Use `--profile <name>` to keep more than one account, and `--api-url <url>` (or `TOLT_API_URL`) to point at a non-production environment.

## Output

Every command prints human-readable text on a terminal and JSON when piped. Force either with `--json` / `--human`, or set `TOLT_JSON=true`. In JSON mode an error is exactly `{"error":"message"}` on stdout with exit code `1`.
