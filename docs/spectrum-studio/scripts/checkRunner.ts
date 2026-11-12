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
import { totalmem } from "node:os";
import { createHash } from "node:crypto";
import {
  acquireCheckLease,
  CheckBusyError,
  heavyCheckBytes,
  ownedProcesses,
  processSamples,
  smallCheckBytes,
  type CheckResourceClass,
  type ProcessSample,
} from "./checkResources";

export interface CheckLimits {
  timeoutMs: number;
  runTimeoutMs: number;
  maxRssBytes: number;
  maxProcesses: number;
  maxLogBytes: number;
}

export const localCheckLimits: CheckLimits = {
  timeoutMs: 30_000,
  runTimeoutMs: 30_000,
  maxRssBytes: smallCheckBytes,
  maxProcesses: 16,
  maxLogBytes: 2 * 1024 ** 2,
};

export const heavyCheckLimits: CheckLimits = {
  ...localCheckLimits,
  timeoutMs: 60_000,
  runTimeoutMs: 60_000,
  maxRssBytes: heavyCheckBytes,
  maxProcesses: 48,
};

export const ciCheckLimits: CheckLimits = {
  ...heavyCheckLimits,
  timeoutMs: 240_000,
  runTimeoutMs: 3_600_000,
  maxRssBytes: Math.min(2 * 1024 ** 3, Math.floor(totalmem() * 0.15)),
};

export interface CheckCommand {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  requires?: string[];
  timeoutMs?: number;
  kind?: "domain" | "performance" | "sdk" | "build" | "typing";
  scope?: "element" | "integration" | "project";
  resources?: "small" | "heavy";
}

export function localCheckClass(
  checks: readonly CheckCommand[],
  options: { heavyApproved?: boolean; projectApproved?: boolean } = {},
): "small" | "heavy" {
  if (!checks.length) throw new Error("Select at least one check.");
  if (
    checks.some((check) => check.scope !== "element") &&
    !options.projectApproved
  )
    throw new Error(
      "This selection includes integration, project-wide or unclassified work. Explicit user scope approval is required; then add --scope-approved.",
    );
  const heavy = checks.some((check) => check.resources !== "small");
  if (heavy && !options.heavyApproved)
    throw new Error(
      "This selection includes heavy or unclassified work. Explicit user approval is required; then add --heavy-approved.",
    );
  return heavy ? "heavy" : "small";
}

export interface CheckResult {
  id: string;
  command: string[];
  env: Record<string, string>;
  status:
    | "passed"
    | "failed"
    | "timed-out"
    | "blocked"
    | "cancelled"
    | "resource-exceeded"
    | "cleanup-incomplete";
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  log: string;
  reason?: string;
  interrupted?: boolean;
  peakRssBytes?: number;
  peakProcesses?: number;
  resourceSamples?: number;
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
  limits: CheckLimits,
  sample: () => ProcessSample[],
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
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      });
      let completed = false;
      let timedOut = false;
      let interrupted = false;
      let cleanup = Promise.resolve();
      let cleanupFailure: string | undefined;
      let resourceFailure: string | undefined;
      let peakRssBytes = 0;
      let peakProcesses = 0;
      let resourceSamples = 0;
      let logBytes = 0;
      const known = new Map<number, string>();
      const appendLog = (chunk: Buffer | string) => {
        const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        const remaining = Math.max(0, limits.maxLogBytes - logBytes);
        try {
          if (remaining) {
            appendFileSync(descriptor, bytes.subarray(0, remaining));
            logBytes += Math.min(bytes.length, remaining);
          }
        } catch (failure) {
          cleanupFailure = `Check log write failed: ${failure instanceof Error ? failure.message : String(failure)}`;
          cleanUp();
        }
        if (bytes.length > remaining && !resourceFailure) {
          resourceFailure = `Log output exceeded ${limits.maxLogBytes} bytes; output truncated.`;
          cleanUp();
        }
      };
      const writeLog = (chunk: Buffer) => appendLog(chunk);
      child.stdout.on("data", writeLog);
      child.stderr.on("data", writeLog);
      const measure = () => {
        if (!child.pid) return [];
        const rows = sample();
        const root = rows.find((row) => row.pid === child.pid);
        const runner = rows.find((row) => row.pid === process.pid);
        if (!runner) throw new Error("Cannot account for the runner process.");
        if (root && !known.size) known.set(root.pid, root.started);
        const owned = ownedProcesses(rows, child.pid, known);
        if (owned.length) resourceSamples++;
        for (const row of owned) known.set(row.pid, row.started);
        peakRssBytes = Math.max(
          peakRssBytes,
          owned.reduce((sum, row) => sum + row.rssBytes, runner.rssBytes),
        );
        peakProcesses = Math.max(peakProcesses, owned.length + 1);
        return owned;
      };
      const terminate = (signal: NodeJS.Signals) => {
        if (!child.pid) return;
        try {
          if (process.platform === "win32") {
            const killWindows = (pids: number[]) => {
              if (!pids.length) return;
              const result = spawnSync(
                "taskkill",
                [...pids.flatMap((pid) => ["/PID", String(pid)]), "/T", "/F"],
                { stdio: "ignore", timeout: 5000 },
              );
              if (result.error) throw result.error;
              if (result.status !== 0)
                throw new Error(`taskkill exited ${result.status}`);
            };
            let owned: ProcessSample[];
            try {
              owned = measure();
            } catch (failure) {
              if (child.exitCode === null && child.signalCode === null)
                killWindows([child.pid]);
              throw failure;
            }
            const pids = new Set(owned.map((row) => row.pid));
            const currentByPid = new Map(sample().map((row) => [row.pid, row]));
            killWindows(
              owned
                .filter(
                  (row) =>
                    !pids.has(row.parent) &&
                    currentByPid.get(row.pid)?.started === row.started,
                )
                .map((row) => row.pid),
            );
          } else {
            let owned: ProcessSample[];
            try {
              owned = measure();
            } catch (failure) {
              // The live ChildProcess still identifies our own process group.
              if (child.exitCode === null && child.signalCode === null)
                process.kill(-child.pid, signal);
              throw failure;
            }
            if (owned.some((row) => row.group === child.pid))
              process.kill(-child.pid, signal);
            const escaped = owned.filter((row) => row.group !== child.pid);
            const currentByPid = new Map<number, ProcessSample>(
              escaped.length ? sample().map((row) => [row.pid, row]) : [],
            );
            for (const row of escaped) {
              const current = currentByPid.get(row.pid);
              if (current?.started === row.started)
                process.kill(row.pid, signal);
            }
          }
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ESRCH"
          )
            return;
          cleanupFailure = `Child cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
          appendLog(`\n${cleanupFailure}\n`);
        }
      };
      let cleaning = false;
      const cleanUp = () => {
        if (cleaning) return;
        cleaning = true;
        terminate("SIGTERM");
        cleanup = new Promise((finish) => {
          setTimeout(() => {
            terminate("SIGKILL");
            finish();
            if (!completed)
              setTimeout(
                () => void complete(child.exitCode, child.signalCode),
                100,
              );
          }, 250);
        });
      };
      const interrupt = () => {
        if (interrupted) return;
        interrupted = true;
        appendLog("\nCheck runner interrupted.\n");
        clearTimeout(timer);
        if (!timedOut) cleanUp();
      };
      process.once("SIGINT", interrupt);
      process.once("SIGTERM", interrupt);
      const poll = setInterval(() => {
        try {
          measure();
          if (
            peakRssBytes > limits.maxRssBytes ||
            peakProcesses > limits.maxProcesses
          ) {
            resourceFailure = `Resource cutoff: ${peakRssBytes} RSS bytes / ${limits.maxRssBytes}; ${peakProcesses} processes / ${limits.maxProcesses}. Approval is required before retrying.`;
            cleanUp();
          }
        } catch (failure) {
          resourceFailure = `Resource accounting failed: ${failure instanceof Error ? failure.message : String(failure)}`;
          cleanUp();
        }
      }, 500);
      const timer = setTimeout(
        () => {
          timedOut = true;
          appendLog(
            `\nTimed out after ${Math.min(check.timeoutMs ?? limits.timeoutMs, limits.timeoutMs)}ms. Approval is required before retrying.\n`,
          );
          cleanUp();
        },
        Math.min(check.timeoutMs ?? limits.timeoutMs, limits.timeoutMs),
      );
      const complete = async (
        code: number | null,
        signal: NodeJS.Signals | null,
        error?: Error,
      ) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        clearInterval(poll);
        child.stdout.removeListener("data", writeLog);
        child.stderr.removeListener("data", writeLog);
        child.stdout.destroy();
        child.stderr.destroy();
        if (error) appendLog(`${error.message}\n`);
        cleanUp();
        await cleanup;
        try {
          const remaining = measure();
          if (remaining.length)
            cleanupFailure = `Cleanup could not confirm exit of ${remaining.length} owned processes.`;
        } catch (failure) {
          cleanupFailure = `Cleanup accounting failed: ${failure instanceof Error ? failure.message : String(failure)}`;
        }
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", interrupt);
        resolve({
          ...base,
          status: cleanupFailure
            ? "cleanup-incomplete"
            : timedOut
              ? "timed-out"
              : interrupted
                ? "cancelled"
                : resourceFailure
                  ? "resource-exceeded"
                  : code === 0 && !error && !cleanupFailure && !interrupted
                    ? "passed"
                    : "failed",
          durationMs: performance.now() - start,
          exitCode: code,
          signal,
          resourceSamples,
          ...(resourceSamples > 0 && { peakRssBytes, peakProcesses }),
          ...(interrupted && { interrupted: true }),
          ...(error || cleanupFailure || resourceFailure || interrupted
            ? {
                reason:
                  cleanupFailure ??
                  resourceFailure ??
                  error?.message ??
                  "Check runner interrupted.",
              }
            : {}),
        });
      };
      child.once("spawn", () => {
        try {
          measure();
        } catch (failure) {
          resourceFailure = `Resource accounting failed: ${failure instanceof Error ? failure.message : String(failure)}`;
          cleanUp();
        }
      });
      child.once("error", (error) => void complete(null, null, error));
      child.once("exit", () => cleanUp());
      child.once("close", (code, signal) => void complete(code, signal));
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
    limits?: CheckLimits;
    leaseDirectory?: string;
    sample?: () => ProcessSample[];
    stopOnFailure?: boolean;
    profile?: string;
    resourceClass?: CheckResourceClass;
  },
) {
  const selected = selectChecks(inventory, options.selected);
  if (!selected.length) throw new Error("Select at least one check.");
  const resourceClass = options.resourceClass ?? "heavy";
  const limits =
    options.limits ??
    (resourceClass === "ci"
      ? ciCheckLimits
      : resourceClass === "small"
        ? localCheckLimits
        : heavyCheckLimits);
  for (const [name, value] of Object.entries(limits))
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`Invalid check resource limit: ${name}`);
  const sample = options.sample ?? processSamples;
  let lease: ReturnType<typeof acquireCheckLease>;
  try {
    lease = acquireCheckLease(options.leaseDirectory, sample, {
      resourceClass,
      reservedBytes: limits.maxRssBytes,
      checks: selected.map((check) => check.id),
    });
  } catch (error) {
    if (!(error instanceof CheckBusyError)) throw error;
    return {
      status: "busy" as const,
      reason: error.message,
      results: [],
      exitCode: 2,
    };
  }
  const metadata = {
    status: "completed" as const,
    runId: lease.runId,
    selectionFingerprint: createHash("sha256")
      .update(JSON.stringify(selected))
      .digest("hex"),
    toolchain: process.version,
    profile: options.profile ?? "custom",
    resourceClass,
    limits,
  };
  const deadline = performance.now() + limits.runTimeoutMs;
  let cleanupConfirmed = true;
  try {
    mkdirSync(options.logDirectory, { recursive: true });
    const results: CheckResult[] = [];
    let interrupted = false;
    let stopped: string | undefined;
    for (const check of selected) {
      const blocked = (check.requires ?? []).filter(
        (id) => results.find((result) => result.id === id)?.status !== "passed",
      );
      const log = join(options.logDirectory, `${check.id}.log`);
      const shouldBlock =
        blocked.length ||
        interrupted ||
        stopped ||
        performance.now() >= deadline;
      if (!shouldBlock) cleanupConfirmed = false;
      const result: CheckResult = shouldBlock
        ? {
            id: check.id,
            command: [check.command, ...check.args],
            env: check.env ?? {},
            status: "blocked",
            durationMs: 0,
            exitCode: null,
            signal: null,
            log,
            reason:
              stopped ??
              (performance.now() >= deadline
                ? "Whole-run deadline reached. Approval is required before retrying."
                : interrupted
                  ? "Not run because the check runner was interrupted."
                  : `Unsuccessful prerequisites: ${blocked.join(", ")}`),
          }
        : await executeCheck(
            check,
            options.cwd,
            log,
            {
              ...limits,
              timeoutMs: Math.min(
                limits.timeoutMs,
                Math.max(1, deadline - performance.now()),
              ),
            },
            sample,
          );
      if (!shouldBlock)
        cleanupConfirmed = result.status !== "cleanup-incomplete";
      if (result.status === "blocked") writeFileSync(log, `${result.reason}\n`);
      interrupted ||= result.interrupted ?? false;
      if (
        [
          "timed-out",
          "resource-exceeded",
          "cleanup-incomplete",
          "cancelled",
        ].includes(result.status)
      )
        stopped = `Not run after ${check.id}: ${result.status}. Approval is required before retrying.`;
      else if (options.stopOnFailure && result.status === "failed")
        stopped = `Not run after ${check.id}: failed. Fix this task's regression before rerunning affected checks; report unrelated failures.`;
      results.push(result);
      writeFileSync(
        join(options.logDirectory, "results.json"),
        `${JSON.stringify({ ...metadata, exitCode: results.some((row) => row.status !== "passed") ? 1 : 0, results }, null, 2)}\n`,
      );
      options.onResult?.(result);
    }
    return {
      ...metadata,
      results,
      exitCode: results.some((row) => row.status !== "passed") ? 1 : 0,
    };
  } finally {
    lease.release(cleanupConfirmed);
  }
}
