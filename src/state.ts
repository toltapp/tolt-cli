import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

function stateDir(): string {
  const base = process.env.XDG_STATE_HOME || join(homedir(), ".config");
  return join(base, "tolt");
}

function listenStatePath(): string {
  return join(stateDir(), "listen.json");
}

export type ListenState = {
  sessionId: string;
  apiUrl: string;
};

export function writeListenState(state: ListenState): void {
  mkdirSync(stateDir(), { recursive: true });
  writeFileSync(listenStatePath(), `${JSON.stringify(state)}\n`, "utf8");
}

export function readListenState(): ListenState | undefined {
  try {
    return JSON.parse(readFileSync(listenStatePath(), "utf8")) as ListenState;
  } catch {
    return undefined;
  }
}

export function clearListenState(): void {
  try {
    rmSync(listenStatePath());
  } catch {
    /* noop */
  }
}
