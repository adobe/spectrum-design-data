// Copyright 2026 Adobe. All rights reserved.
import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

export interface CheckCommand {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  requires?: string[];
  timeoutMs?: number;
}

export interface CheckResult {
  id: string;
  command: string[];
  env: Record<string, string>;
  status: "passed" | "failed" | "timed-out" | "blocked";
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  log: string;
  reason?: string;
  interrupted?: boolean;
}

export function selectChecks(
  inventory: readonly CheckCommand[],
  selected: readonly string[] = inventory.map((check) => check.id),
): CheckCommand[] {
  const byId = new Map<string, CheckCommand>();
  for (const check of inventory) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(check.id) || byId.has(check.id))
      throw new Error(`Invalid or duplicate check ID: ${check.id}`);
    if (
      !check.command ||
      (check.timeoutMs !== undefined &&
        (!Number.isFinite(check.timeoutMs) || check.timeoutMs <= 0))
    )
      throw new Error(`Invalid check command or timeout: ${check.id}`);
    byId.set(check.id, check);
  }
  const ordered: CheckCommand[] = [];
  const visited = new Set<string>();
  const active = new Set<string>();
  const visit = (id: string) => {
    const check = byId.get(id);
    if (!check) throw new Error(`Unknown check: ${id}`);
    if (active.has(id)) throw new Error(`Cyclic check prerequisite: ${id}`);
    if (visited.has(id)) return;
    active.add(id);
    for (const prerequisite of check.requires ?? []) visit(prerequisite);
    active.delete(id);
    visited.add(id);
    ordered.push(check);
  };
  for (const check of inventory)
    for (const prerequisite of check.requires ?? [])
      if (!byId.has(prerequisite))
        throw new Error(
          `Unknown prerequisite for ${check.id}: ${prerequisite}`,
        );
  for (const selector of selected) {
    if (!selector.endsWith("*")) visit(selector);
    else {
      const matches = inventory.filter((check) =>
        check.id.startsWith(selector.slice(0, -1)),
      );
      if (!matches.length)
        throw new Error(`Unknown check selection: ${selector}`);
      for (const check of matches) visit(check.id);
    }
  }
  return ordered;
}

async function executeCheck(
  check: CheckCommand,
  cwd: string,
  log: string,
): Promise<CheckResult> {
  const start = performance.now();
  const descriptor = openSync(log, "w");
  const base = {
    id: check.id,
    command: [check.command, ...check.args],
    env: check.env ?? {},
    log,
  };
  try {
    return await new Promise<CheckResult>((resolve) => {
      const child = spawn(check.command, check.args, {
        cwd,
        env: { ...process.env, NO_COLOR: "1", ...check.env },
        stdio: ["ignore", descriptor, descriptor],
        detached: process.platform !== "win32",
      });
      let completed = false;
      let timedOut = false;
      let interrupted = false;
      let cleanup = Promise.resolve();
      let cleanupFailure: string | undefined;
      const terminate = (signal: NodeJS.Signals) => {
        if (!child.pid) return;
        try {
          if (process.platform === "win32") {
            const result = spawnSync(
              "taskkill",
              ["/PID", String(child.pid), "/T", "/F"],
              { stdio: "ignore" },
            );
            if (result.error) throw result.error;
            if (result.status !== 0)
              throw new Error(`taskkill exited ${result.status}`);
          } else process.kill(-child.pid, signal);
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ESRCH"
          )
            return;
          cleanupFailure = `Child cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
          appendFileSync(log, `\n${cleanupFailure}\n`);
        }
      };
      const cleanUp = () => {
        terminate("SIGTERM");
        cleanup = new Promise((finish) => {
          setTimeout(() => {
            terminate("SIGKILL");
            finish();
          }, 250);
        });
      };
      const interrupt = () => {
        if (interrupted) return;
        interrupted = true;
        appendFileSync(log, "\nCheck runner interrupted.\n");
        clearTimeout(timer);
        if (!timedOut) cleanUp();
      };
      process.once("SIGINT", interrupt);
      process.once("SIGTERM", interrupt);
      const timer = setTimeout(() => {
        timedOut = true;
        appendFileSync(
          log,
          `\nTimed out after ${check.timeoutMs ?? 240_000}ms.\n`,
        );
        cleanUp();
      }, check.timeoutMs ?? 240_000);
      const finish = async (
        code: number | null,
        signal: NodeJS.Signals | null,
        error?: Error,
      ) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        if (error) appendFileSync(log, `${error.message}\n`);
        await cleanup;
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", interrupt);
        resolve({
          ...base,
          status: timedOut
            ? "timed-out"
            : code === 0 && !error && !cleanupFailure && !interrupted
              ? "passed"
              : "failed",
          durationMs: performance.now() - start,
          exitCode: code,
          signal,
          ...(interrupted && { interrupted: true }),
          ...(error || cleanupFailure || interrupted
            ? {
                reason:
                  cleanupFailure ??
                  error?.message ??
                  "Check runner interrupted.",
              }
            : {}),
        });
      };
      child.once("error", (error) => void finish(null, null, error));
      child.once("close", (code, signal) => void finish(code, signal));
    });
  } finally {
    closeSync(descriptor);
  }
}

export async function runChecks(
  inventory: readonly CheckCommand[],
  options: {
    cwd: string;
    logDirectory: string;
    selected?: readonly string[];
    onResult?: (result: CheckResult) => void;
  },
) {
  const selected = selectChecks(inventory, options.selected);
  mkdirSync(options.logDirectory, { recursive: true });
  const results: CheckResult[] = [];
  let interrupted = false;
  for (const check of selected) {
    const blocked = (check.requires ?? []).filter(
      (id) => results.find((result) => result.id === id)?.status !== "passed",
    );
    const log = join(options.logDirectory, `${check.id}.log`);
    const result: CheckResult =
      blocked.length || interrupted
        ? {
            id: check.id,
            command: [check.command, ...check.args],
            env: check.env ?? {},
            status: "blocked",
            durationMs: 0,
            exitCode: null,
            signal: null,
            log,
            reason: interrupted
              ? "Not run because the check runner was interrupted."
              : `Unsuccessful prerequisites: ${blocked.join(", ")}`,
          }
        : await executeCheck(check, options.cwd, log);
    if (blocked.length || interrupted) writeFileSync(log, `${result.reason}\n`);
    interrupted ||= result.interrupted ?? false;
    results.push(result);
    writeFileSync(
      join(options.logDirectory, "results.json"),
      `${JSON.stringify({ exitCode: results.some((row) => row.status !== "passed") ? 1 : 0, results }, null, 2)}\n`,
    );
    options.onResult?.(result);
  }
  return {
    results,
    exitCode: results.some((row) => row.status !== "passed") ? 1 : 0,
  };
}
