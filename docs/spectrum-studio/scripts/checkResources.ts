// Copyright 2026 Adobe. All rights reserved.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export interface ProcessSample {
  pid: number;
  parent: number;
  group: number;
  rssBytes: number;
  started: string;
}

export function processSamples(): ProcessSample[] {
  if (process.platform === "win32") {
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize,CreationDate)",
      ],
      { encoding: "utf8", timeout: 5000, maxBuffer: 8 * 1024 * 1024 },
    );
    const data: {
      ProcessId: number;
      ParentProcessId: number;
      WorkingSetSize: number;
      CreationDate: string;
    }[] = JSON.parse(output);
    return data.map((row) => ({
      pid: row.ProcessId,
      parent: row.ParentProcessId,
      group: 0,
      rssBytes: Number(row.WorkingSetSize),
      started: String(row.CreationDate),
    }));
  }
  return execFileSync("ps", ["-axo", "pid=,ppid=,pgid=,rss=,lstart="], {
    encoding: "utf8",
    timeout: 3000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, LC_ALL: "C", TZ: "UTC" },
  })
    .trim()
    .split("\n")
    .map((line) => {
      const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/.exec(line);
      if (!match) throw new Error("Cannot read process resource accounting.");
      return {
        pid: Number(match[1]),
        parent: Number(match[2]),
        group: Number(match[3]),
        rssBytes: Number(match[4]) * 1024,
        started: match[5],
      };
    });
}

export function ownedProcesses(
  samples: readonly ProcessSample[],
  root: number,
  known: ReadonlyMap<number, string>,
): ProcessSample[] {
  const rootReused = samples.some(
    (row) =>
      row.pid === root && known.has(root) && known.get(root) !== row.started,
  );
  const owned = new Set(
    samples
      .filter(
        (row) =>
          known.get(row.pid) === row.started ||
          (!rootReused && process.platform !== "win32" && row.group === root),
      )
      .map((row) => row.pid),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of samples) {
      if (!owned.has(row.pid) && owned.has(row.parent)) {
        owned.add(row.pid);
        changed = true;
      }
    }
  }
  return samples.filter((row) => owned.has(row.pid));
}

export const defaultLeaseDirectory = join(
  homedir(),
  ".cache",
  "spectrum-studio",
  "check-lease",
);

interface LeaseOwner {
  runId: string;
  pid: number;
  started: string;
  resourceClass: CheckResourceClass;
  reservedBytes: number;
  checks: readonly string[];
  cleanupConfirmed?: false;
}

export type CheckResourceClass = "small" | "heavy" | "ci";
export const smallCheckBytes = 256 * 1024 ** 2;
export const heavyCheckBytes = 1024 ** 3;

export class CheckBusyError extends Error {
  readonly code = "STUDIO_CHECK_BUSY";
}

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function acquireCheckLease(
  directory = defaultLeaseDirectory,
  sample: () => ProcessSample[] = processSamples,
  options: {
    resourceClass?: CheckResourceClass;
    reservedBytes?: number;
    checks?: readonly string[];
  } = {},
): { runId: string; release: (cleanupConfirmed?: boolean) => void } {
  const resourceClass = options.resourceClass ?? "heavy";
  const maximum = resourceClass === "small" ? smallCheckBytes : heavyCheckBytes;
  const reservedBytes = options.reservedBytes ?? maximum;
  if (
    !["small", "heavy", "ci"].includes(resourceClass) ||
    !Number.isFinite(reservedBytes) ||
    reservedBytes <= 0 ||
    (resourceClass !== "ci" && reservedBytes > maximum)
  )
    throw new Error("Invalid Studio admission resource reservation.");
  const samples = sample();
  const self = samples.find((row) => row.pid === process.pid);
  if (!self) throw new Error("Cannot establish check-runner process identity.");
  const owner: LeaseOwner = {
    runId: randomUUID(),
    pid: process.pid,
    started: self.started,
    resourceClass,
    reservedBytes,
    checks: options.checks ?? [],
  };
  mkdirSync(dirname(directory), { recursive: true, mode: 0o700 });
  try {
    mkdirSync(directory, { mode: 0o700 });
    writeFileSync(join(directory, "pool.json"), '{"version":2}', {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST"))
      throw error;
  }
  const gate = join(directory, "admitting");
  try {
    mkdirSync(gate, { mode: 0o700 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST"))
      throw error;
    throw new CheckBusyError(
      `Studio checks not run: admission is busy or incomplete at ${gate}. Continue independent work; do not wait or retry automatically.`,
    );
  }
  let slot: string;
  try {
    if (!existsSync(join(directory, "pool.json")))
      throw new CheckBusyError(
        `Studio checks not run: incomplete or legacy lease at ${directory}. Inspect ownership before recovery.`,
      );
    if (readFileSync(join(directory, "pool.json"), "utf8") !== '{"version":2}')
      throw new CheckBusyError(
        `Studio checks not run: invalid admission pool at ${directory}.`,
      );
    // Older runners use owner.json directly. Never bypass an older live lease.
    try {
      readFileSync(join(directory, "owner.json"), "utf8");
      throw new CheckBusyError(
        `Studio checks not run: a legacy lease exists at ${directory}. Inspect ownership; do not remove another run's lease.`,
      );
    } catch (error) {
      if (!missing(error)) throw error;
    }
    const active: { name: string; owner: LeaseOwner }[] = [];
    for (const name of ["small-1", "small-2", "exclusive"]) {
      let previous: LeaseOwner;
      try {
        previous = JSON.parse(
          readFileSync(join(directory, name, "owner.json"), "utf8"),
        );
      } catch (error) {
        if (missing(error) && !existsSync(join(directory, name))) continue;
        throw new CheckBusyError(
          `Studio checks not run: incomplete reservation at ${join(directory, name)}. Inspect ownership before recovery.`,
        );
      }
      if (
        !previous ||
        typeof previous.runId !== "string" ||
        !previous.runId ||
        !Number.isSafeInteger(previous.pid) ||
        previous.pid <= 0 ||
        typeof previous.started !== "string" ||
        !previous.started ||
        !["small", "heavy", "ci"].includes(previous.resourceClass) ||
        !Number.isFinite(previous.reservedBytes) ||
        previous.reservedBytes <= 0 ||
        !Array.isArray(previous.checks) ||
        !previous.checks.every((id) => typeof id === "string") ||
        (name === "exclusive"
          ? previous.resourceClass === "small"
          : previous.resourceClass !== "small") ||
        (previous.resourceClass === "small" &&
          previous.reservedBytes > smallCheckBytes) ||
        (previous.resourceClass === "heavy" &&
          previous.reservedBytes > heavyCheckBytes)
      )
        throw new CheckBusyError(
          `Studio checks not run: invalid reservation at ${join(directory, name)}.`,
        );
      if (
        previous.cleanupConfirmed === false ||
        !samples.some(
          (row) => row.pid === previous.pid && row.started === previous.started,
        )
      )
        throw new CheckBusyError(
          `Studio checks not run: run ${previous.runId} has unconfirmed cleanup at ${join(directory, name)}. Owner exit alone does not prove descendant exit.`,
        );
      active.push({ name, owner: previous });
    }
    const available =
      resourceClass === "small" &&
      active.every((entry) => entry.owner.resourceClass === "small") &&
      active.reduce(
        (sum, entry) => sum + entry.owner.reservedBytes,
        reservedBytes,
      ) <=
        2 * smallCheckBytes
        ? ["small-1", "small-2"].find(
            (name) => !active.some((entry) => entry.name === name),
          )
        : resourceClass !== "small" && !active.length
          ? "exclusive"
          : undefined;
    if (!available)
      throw new CheckBusyError(
        `Studio checks not run: busy with ${active.map((entry) => `${entry.owner.runId} (PID ${entry.owner.pid}; ${entry.owner.checks.join(", ") || entry.owner.resourceClass})`).join("; ")}. Continue independent work; do not wait or retry automatically.`,
      );
    slot = join(directory, available);
    mkdirSync(slot, { mode: 0o700 });
    writeFileSync(join(slot, "owner.json"), JSON.stringify(owner), {
      flag: "wx",
      mode: 0o600,
    });
  } finally {
    rmSync(gate, { recursive: true });
  }
  return {
    runId: owner.runId,
    release: (cleanupConfirmed = true) => {
      const ownerPath = join(slot, "owner.json");
      const current: LeaseOwner = JSON.parse(readFileSync(ownerPath, "utf8"));
      if (current.runId !== owner.runId)
        throw new Error("Studio lease ownership changed; refusing cleanup.");
      if (!cleanupConfirmed) {
        writeFileSync(
          ownerPath,
          JSON.stringify({ ...current, cleanupConfirmed: false }),
          { mode: 0o600 },
        );
        return;
      }
      rmSync(slot, { recursive: true });
    },
  };
}
