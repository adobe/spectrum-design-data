// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  acquireCheckLease,
  defaultLeaseDirectory,
  ownedProcesses,
  processSamples,
  smallCheckBytes,
} from "../scripts/checkResources";
import {
  localCheckLimits,
  runChecks,
  type CheckCommand,
} from "../scripts/checkRunner";
import {
  browserCheckInventory,
  checkInventory,
  checkKind,
  studioRoot,
} from "../scripts/checkInventory";
import {
  boundedBrowserOptions,
  requireBrowserSelection,
} from "../scripts/browserPolicy";

const directory = mkdtempSync(join(tmpdir(), "studio-resources-"));
const leaseDirectory = join(directory, "lease");
const node = (id: string, source: string): CheckCommand => ({
  id,
  command: process.execPath,
  args: ["-e", source],
});
const run = (check: CheckCommand, limits = localCheckLimits) =>
  runChecks([check, node("must-not-run", "throw Error('not admitted')")], {
    cwd: directory,
    logDirectory: join(directory, check.id),
    leaseDirectory,
    limits,
  });
try {
  const legacy = join(directory, "legacy-lease");
  mkdirSync(legacy);
  writeFileSync(
    join(legacy, "owner.json"),
    JSON.stringify({ runId: "legacy" }),
  );
  assert.throws(() => acquireCheckLease(legacy), /legacy lease/);
  assert(
    existsSync(join(legacy, "owner.json")),
    "An old runner's lease is never removed.",
  );
  const first = acquireCheckLease(leaseDirectory);
  assert.throws(() => acquireCheckLease(leaseDirectory), /busy/);
  const contender = spawnSync(
    process.execPath,
    [
      "--import",
      import.meta.resolve("tsx"),
      "--input-type=module",
      "-e",
      `import { acquireCheckLease, defaultLeaseDirectory } from ${JSON.stringify(pathToFileURL(join(studioRoot, "scripts/checkResources.ts")).href)}; console.log(JSON.stringify(defaultLeaseDirectory)); acquireCheckLease(${JSON.stringify(leaseDirectory)});`,
    ],
    {
      cwd: directory,
      env: {
        ...process.env,
        TMPDIR: directory,
        TSX_TSCONFIG_PATH: join(studioRoot, "tsconfig.app.json"),
      },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(contender.status, 1, contender.stderr);
  assert.match(
    contender.stderr,
    /busy/,
    "Another process/checkout shares admission.",
  );
  assert.equal(
    JSON.parse(contender.stdout),
    defaultLeaseDirectory,
    "TMPDIR and checkout differences do not split the shared lease.",
  );
  const ownerPath = join(leaseDirectory, "exclusive/owner.json");
  assert(existsSync(ownerPath));
  const original = JSON.parse(readFileSync(ownerPath, "utf8"));
  writeFileSync(
    ownerPath,
    JSON.stringify({ ...original, started: "previous process identity" }),
  );
  assert.throws(() => acquireCheckLease(leaseDirectory), /unconfirmed cleanup/);
  assert(
    existsSync(ownerPath),
    "A dead/reused owner does not authorize deleting its descendants' reservation.",
  );
  writeFileSync(
    ownerPath,
    JSON.stringify({ ...original, runId: "another-owner" }),
  );
  assert.throws(first.release, /ownership changed/);
  writeFileSync(ownerPath, JSON.stringify(original));
  first.release();
  assert(!existsSync(ownerPath));
  mkdirSync(join(leaseDirectory, "exclusive"));
  assert.throws(
    () => acquireCheckLease(leaseDirectory),
    /incomplete reservation/,
  );
  writeFileSync(
    ownerPath,
    JSON.stringify({ runId: "invalid", pid: 0, started: "invalid" }),
  );
  assert.throws(() => acquireCheckLease(leaseDirectory), /invalid reservation/);
  rmSync(join(leaseDirectory, "exclusive"), { recursive: true });
  const small = () =>
    acquireCheckLease(leaseDirectory, processSamples, {
      resourceClass: "small",
      reservedBytes: smallCheckBytes,
      checks: ["fixture"],
    });
  const smallOne = small();
  const smallTwo = small();
  assert.throws(small, /busy/);
  assert.throws(() => acquireCheckLease(leaseDirectory), /busy/);
  smallOne.release();
  assert.throws(() => acquireCheckLease(leaseDirectory), /busy/);
  smallTwo.release();
  const exclusive = acquireCheckLease(leaseDirectory);
  assert.throws(small, /busy/);
  exclusive.release(false);
  assert.throws(small, /unconfirmed cleanup/);
  exclusive.release();
  assert.throws(
    () =>
      acquireCheckLease(leaseDirectory, processSamples, {
        resourceClass: "small",
        reservedBytes: smallCheckBytes + 1,
      }),
    /Invalid.*reservation/,
  );

  const busyOwner = small();
  const busyOther = small();
  const busyStart = performance.now();
  const busyRun = await runChecks(
    [node("not-started-busy", "throw Error('must not start')")],
    {
      cwd: directory,
      logDirectory: join(directory, "busy"),
      leaseDirectory,
      resourceClass: "small",
    },
  );
  assert.equal(busyRun.status, "busy");
  assert.deepEqual(busyRun.results, []);
  assert.equal(existsSync(join(directory, "busy")), false);
  assert(performance.now() - busyStart < 1000, "Busy admission does not wait.");
  busyOwner.release();
  busyOther.release();

  const raceSource = `
    import { acquireCheckLease } from ${JSON.stringify(pathToFileURL(join(studioRoot, "scripts/checkResources.ts")).href)};
    let lease;
    process.on('message', message => {
      if (message === 'start') {
        try {
          lease = acquireCheckLease(${JSON.stringify(leaseDirectory)}, undefined, { resourceClass: process.env.FIXTURE_CLASS });
          process.send({ admitted: true, resourceClass: process.env.FIXTURE_CLASS });
        } catch (error) {
          process.send({ admitted: false, code: error.code });
        }
      } else {
        lease?.release();
        process.exit(0);
      }
    });
    process.send({ ready: true });
  `;
  const children = ["heavy", "small", "small", "small"].map((resourceClass) =>
    spawn(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        "--input-type=module",
        "-e",
        raceSource,
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          FIXTURE_CLASS: resourceClass,
          TSX_TSCONFIG_PATH: join(studioRoot, "tsconfig.app.json"),
        },
        stdio: ["ignore", "ignore", "inherit", "ipc"],
      },
    ),
  );
  const message = (child: (typeof children)[number]) =>
    new Promise<{
      ready?: boolean;
      admitted?: boolean;
      resourceClass?: string;
      code?: string;
    }>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Admission fixture did not respond.")),
        5000,
      );
      child.once("message", (value) => {
        clearTimeout(timer);
        resolve(
          value as {
            ready?: boolean;
            admitted?: boolean;
            resourceClass?: string;
            code?: string;
          },
        );
      });
      child.once("error", reject);
    });
  try {
    await Promise.all(children.map(message));
    const replies = children.map(message);
    for (const child of children) child.send("start");
    const admissions = await Promise.all(replies);
    const admitted = admissions.filter((reply) => reply.admitted);
    assert(admitted.length >= 1 && admitted.length <= 2);
    assert(
      admitted.every(
        (reply) => reply.resourceClass === admitted[0].resourceClass,
      ),
    );
    if (admitted[0].resourceClass === "heavy") assert.equal(admitted.length, 1);
    assert(
      admissions
        .filter((reply) => !reply.admitted)
        .every((reply) => reply.code === "STUDIO_CHECK_BUSY"),
    );
  } finally {
    await Promise.all(
      children.map(
        (child) =>
          new Promise<void>((resolve) => {
            if (
              !child.pid ||
              child.exitCode !== null ||
              child.signalCode !== null
            ) {
              resolve();
              return;
            }
            child.once("exit", () => resolve());
            if (child.connected) child.send("release");
            else if (child.pid) child.kill("SIGTERM");
          }),
      ),
    );
  }
  assert(processSamples().some((row) => row.pid === process.pid));

  const samples = [
    { pid: 10, parent: 1, group: 10, rssBytes: 20, started: "a" },
    { pid: 11, parent: 10, group: 11, rssBytes: 30, started: "b" },
    { pid: 12, parent: 11, group: 11, rssBytes: 40, started: "c" },
    { pid: 99, parent: 1, group: 99, rssBytes: 999, started: "other" },
  ];
  assert.deepEqual(
    ownedProcesses(samples, 10, new Map([[10, "a"]])).map((row) => row.pid),
    [10, 11, 12],
  );
  assert.deepEqual(
    ownedProcesses([samples[3]], 10, new Map([[99, "old identity"]])),
    [],
    "A reused PID is not an owned process.",
  );
  assert.deepEqual(
    ownedProcesses([samples[0]], 10, new Map([[10, "old identity"]])),
    [],
    "A reused process-group leader is not owned.",
  );

  const resource = await run(
    node("memory-cutoff", "setInterval(() => {}, 1000)"),
    {
      ...localCheckLimits,
      maxRssBytes: 1,
    },
  );
  assert.equal(resource.results[0].status, "resource-exceeded");
  assert.equal(resource.results[1].status, "blocked");
  assert(resource.results[0].peakRssBytes! > 1);
  assert.match(resource.results[0].reason!, /Approval is required/);

  const processes = await run(
    node(
      "process-cutoff",
      "require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});setInterval(()=>{},1000)",
    ),
    {
      ...localCheckLimits,
      maxProcesses: 2,
    },
  );
  assert.equal(processes.results[0].status, "resource-exceeded");
  assert.equal(processes.results[1].status, "blocked");
  assert(processes.results[0].peakProcesses! > 2);

  const noisy = await run(
    node(
      "output-cutoff",
      "console.log('x'.repeat(8192)); setInterval(() => {}, 1000)",
    ),
    {
      ...localCheckLimits,
      maxLogBytes: 128,
    },
  );
  assert.equal(noisy.results[0].status, "resource-exceeded");
  assert.equal(noisy.results[1].status, "blocked");
  assert(readFileSync(noisy.results[0].log).length <= 128);

  const deadline = await run(node("whole-run", "setInterval(() => {}, 1000)"), {
    ...localCheckLimits,
    runTimeoutMs: 100,
  });
  assert.equal(deadline.results[0].status, "timed-out");
  assert.equal(deadline.results[1].status, "blocked");

  const heartbeat = join(directory, "normal-exit-heartbeat");
  const child = `const fs=require('node:fs');setInterval(()=>fs.writeFileSync(${JSON.stringify(heartbeat)},String(Date.now())),20);process.on('SIGTERM',()=>{});`;
  const normalExit = await runChecks(
    [
      node(
        "normal-exit",
        `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(child)}],{stdio:'ignore'});setTimeout(()=>process.exit(0),100);`,
      ),
    ],
    {
      cwd: directory,
      logDirectory: join(directory, "normal-exit"),
      leaseDirectory,
    },
  );
  assert.equal(normalExit.exitCode, 0, JSON.stringify(normalExit));
  const runnerBudget = await runChecks(
    [node("runner-overhead", "setInterval(()=>{},1000)")],
    {
      cwd: directory,
      logDirectory: join(directory, "runner-overhead"),
      leaseDirectory,
      limits: { ...localCheckLimits, maxRssBytes: 128 },
      sample: () =>
        processSamples().map((row) => ({
          ...row,
          rssBytes: row.pid === process.pid ? 256 : 0,
        })),
    },
  );
  assert.equal(runnerBudget.results[0].status, "resource-exceeded");
  assert.equal(
    runnerBudget.results[0].peakRssBytes,
    256,
    "The supervisor counts even when the workload reports zero RSS.",
  );
  assert(existsSync(heartbeat), "The descendant wrote a real heartbeat.");
  const before = existsSync(heartbeat) ? readFileSync(heartbeat, "utf8") : null;
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(
    existsSync(heartbeat) ? readFileSync(heartbeat, "utf8") : null,
    before,
  );

  const browser = browserCheckInventory();
  assert(browser.length > 0);
  assert(browser.every((check) => check.args.includes("--workers=1")));
  assert(browser.every((check) => check.env?.STUDIO_BROWSER_SCOPE));
  assert.throws(
    () => requireBrowserSelection("app", {}),
    /explicit user permission/,
  );
  assert.throws(
    () => requireBrowserSelection("storybook", {}),
    /Select a browser check/,
  );
  requireBrowserSelection("app", { STUDIO_BROWSER_SCOPE: "app" });
  assert.equal(boundedBrowserOptions.workers, 1);
  assert.equal(boundedBrowserOptions.retries, 0);
  assert(boundedBrowserOptions.globalTimeout > 0);
  assert.equal(checkKind("tokens-performance"), "performance");
  assert.equal(checkKind("authoring-persistence-work"), "performance");
  assert.equal(checkKind("design-data-sdk"), "sdk");
  assert.equal(checkKind("storybook-build"), "build");
  assert(
    checkInventory(join(directory, "inventory")).every((check) => check.kind),
  );
  const previousScope = process.env.STUDIO_BROWSER_SCOPE;
  try {
    process.env.STUDIO_BROWSER_SCOPE = "app";
    const app = (await import("../playwright.config")).default;
    process.env.STUDIO_BROWSER_SCOPE = "storybook";
    const story = (await import("../playwright.storybook.config")).default;
    for (const config of [app, story]) {
      assert.equal(config.workers, 1);
      assert.equal(config.retries, 0);
      assert.equal(config.maxFailures, 1);
      assert(config.globalTimeout && config.globalTimeout > 0);
      const server = config.webServer;
      assert(server && !Array.isArray(server));
      assert.equal(server.reuseExistingServer, false);
      assert(server.gracefulShutdown);
      assert(config.use?.actionTimeout);
      assert(config.use?.navigationTimeout);
    }
    assert(
      !Array.isArray(app.webServer) &&
        app.webServer?.command.includes("--strictPort"),
    );
    assert(
      !Array.isArray(story.webServer) &&
        story.webServer?.command.includes("--exact-port"),
    );
  } finally {
    if (previousScope === undefined) delete process.env.STUDIO_BROWSER_SCOPE;
    else process.env.STUDIO_BROWSER_SCOPE = previousScope;
  }
  const cleanupPid = join(directory, "cleanup-pid");
  let samplesRead = 0;
  const accountingFailure = await runChecks(
    [
      node(
        "accounting-failure",
        `require('node:fs').writeFileSync(${JSON.stringify(cleanupPid)},String(process.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`,
      ),
      node("after-accounting-failure", "throw Error('must not run')"),
    ],
    {
      cwd: directory,
      logDirectory: join(directory, "accounting-failure"),
      leaseDirectory,
      sample: () => {
        if (samplesRead++ < 2) return processSamples();
        throw new Error("fixture accounting unavailable");
      },
    },
  );
  assert.equal(accountingFailure.results[0].status, "cleanup-incomplete");
  assert.equal(accountingFailure.results[1].status, "blocked");
  assert.match(accountingFailure.results[0].reason!, /accounting unavailable/);
  assert.throws(() => acquireCheckLease(leaseDirectory), /unconfirmed cleanup/);
  assert.throws(
    () => process.kill(Number(readFileSync(cleanupPid, "utf8")), 0),
    { code: "ESRCH" },
  );
  console.log(
    "Admission ownership, conservative resource/log cutoffs, whole-run stopping, normal-exit cleanup and browser policy passed.",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
