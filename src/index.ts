import { Command } from "commander";
import { login } from "./commands/login.js";
import { logout } from "./commands/logout.js";
import { whoami } from "./commands/whoami.js";
import { listen } from "./commands/listen.js";
import { trigger } from "./commands/trigger.js";

const VERSION = "0.1.0";

const program = new Command();

program
  .name("tolt")
  .description("The Tolt command line: stream webhooks to localhost, trigger sample events, and talk to the API.")
  .version(VERSION, "-v, --version")
  .option("--token <key>", "API key to use for this command")
  .option("--api-url <url>", "override the API base url")
  .option("--profile <name>", "config profile to use")
  .option("--json", "machine-readable JSON output")
  .option("--human", "force human-readable output");

program
  .command("login")
  .description("Store and verify your Tolt API key")
  .action((_opts, cmd) => login(cmd.optsWithGlobals()));

program
  .command("logout")
  .description("Remove the stored API key for a profile")
  .action((_opts, cmd) => logout(cmd.optsWithGlobals()));

program
  .command("whoami")
  .description("Show the active profile and verify the key")
  .action((_opts, cmd) => whoami(cmd.optsWithGlobals()));

program
  .command("listen")
  .description("Stream your Tolt webhooks to a local URL")
  .option("-f, --forward-to <url>", "local URL to POST events to, e.g. http://localhost:3000/api/webhooks/tolt")
  .option("-e, --events <list>", "comma-separated event types, e.g. commission.created,customer.created")
  .action((_opts, cmd) => listen(cmd.optsWithGlobals()));

program
  .command("trigger")
  .argument("<event>", "event type to send, e.g. commission.created")
  .description("Send a sample event through your webhooks")
  .action((event, _opts, cmd) => trigger(event, cmd.optsWithGlobals()));

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

void main();
