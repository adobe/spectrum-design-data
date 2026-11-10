// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  runChecks,
  selectChecks,
  type CheckCommand,
} from "../scripts/checkRunner";
import {
  checkInventory,
  nonBrowserTestFiles,
  studioRoot,
} from "../scripts/checkInventory";

const directory = mkdtempSync(join(tmpdir(), "studio-check-runner-"));
const node = (id: string, source: string): CheckCommand => ({
  id,
  command: process.execPath,
  args: ["-e", source],
});
try {
  const failures = await runChecks(
    [
      node("first-failure", "console.error('first'); process.exitCode = 2"),
      node("success", "console.log('later command ran')"),
      node("second-failure", "process.exitCode = 3"),
      { id: "missing-command", command: join(directory, "absent"), args: [] },
      {
        ...node("blocked", "throw Error('must not run')"),
        requires: ["first-failure"],
      },
      node("final-success", "console.log('still running')"),
    ],
    { cwd: directory, logDirectory: join(directory, "failures") },
  );
  assert.equal(failures.exitCode, 1);
  assert.deepEqual(
    failures.results.map((result) => result.status),
    ["failed", "passed", "failed", "failed", "blocked", "passed"],
  );
  assert.equal(failures.results[0].exitCode, 2);
  assert.match(
    readFileSync(failures.results[1].log, "utf8"),
    /later command ran/,
  );
  assert.match(failures.results[3].reason!, /ENOENT/);
  assert.ok(failures.results.every((result) => result.durationMs >= 0));
  const recorded = JSON.parse(
    readFileSync(join(directory, "failures/results.json"), "utf8"),
  );
  assert.deepEqual(recorded, failures);
  assert.deepEqual(failures.results[0].command, [
    process.execPath,
    "-e",
    "console.error('first'); process.exitCode = 2",
  ]);

  const prerequisite = node("prerequisite", "console.log('ready')");
  const consumer = {
    ...node("consumer", "console.log('done')"),
    requires: ["prerequisite"],
  };
  const inventory = [consumer, prerequisite];
  assert.deepEqual(
    selectChecks(inventory, ["consumer", "prerequisite", "consumer"]).map(
      (check) => check.id,
    ),
    ["prerequisite", "consumer"],
  );
  const passing = await runChecks(inventory, {
    cwd: directory,
    logDirectory: join(directory, "passing"),
    selected: ["consumer", "consumer"],
  });
  assert.equal(passing.exitCode, 0);
  assert.equal(passing.results.length, 2);
  assert.deepEqual(
    selectChecks(inventory, ["cons*", "prerequisite"]).map((check) => check.id),
    ["prerequisite", "consumer"],
  );
  assert.throws(() => selectChecks(inventory, ["missing*"]), /Unknown check/);
  assert.throws(() => selectChecks(inventory, ["unknown"]), /Unknown check/);
  assert.throws(() => selectChecks([prerequisite, prerequisite]), /duplicate/);
  assert.throws(
    () => selectChecks([{ ...consumer, requires: ["missing"] }]),
    /Unknown prerequisite/,
  );
  assert.throws(
    () =>
      selectChecks([
        { ...consumer, requires: ["prerequisite"] },
        { ...prerequisite, requires: ["consumer"] },
      ]),
    /Cyclic/,
  );
  assert.throws(
    () => selectChecks([{ ...prerequisite, timeoutMs: NaN }]),
    /timeout/,
  );

  const descendantPath = join(directory, "descendant.json");
  const heartbeat = join(directory, "heartbeat");
  const descendant = [
    "const fs = require('node:fs');",
    `fs.writeFileSync(${JSON.stringify(descendantPath)}, JSON.stringify({pid:process.pid}));`,
    `setInterval(() => fs.writeFileSync(${JSON.stringify(heartbeat)}, String(Date.now())), 20);`,
    "process.on('SIGTERM', () => {});",
  ].join("\n");
  const parent = [
    "const { spawn } = require('node:child_process');",
    `spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio:'ignore'});`,
    "setInterval(() => {}, 1000);",
  ].join("\n");
  const timeout = await runChecks(
    [
      { ...node("timeout", parent), timeoutMs: 1500 },
      node("after-timeout", "console.log('after timeout')"),
    ],
    { cwd: directory, logDirectory: join(directory, "timeout") },
  );
  assert.equal(timeout.exitCode, 1);
  assert.deepEqual(
    timeout.results.map((result) => result.status),
    ["timed-out", "passed"],
  );
  assert.ok(
    existsSync(descendantPath),
    "The timeout fixture starts a real descendant.",
  );
  assert.ok(existsSync(heartbeat));
  const lastHeartbeat = readFileSync(heartbeat, "utf8");
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(
    readFileSync(heartbeat, "utf8"),
    lastHeartbeat,
    "Timeout cleanup stops descendants, including SIGTERM-resistant children.",
  );
  const previousListeners = process.listenerCount("SIGTERM");
  const interrupt = setTimeout(() => process.emit("SIGTERM"), 150);
  const interrupted = await runChecks(
    [
      node(
        "interrupted",
        "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)",
      ),
      node("not-started", "throw Error('must not run')"),
    ],
    { cwd: directory, logDirectory: join(directory, "interrupted") },
  );
  clearTimeout(interrupt);
  assert.equal(interrupted.exitCode, 1);
  assert.equal(interrupted.results[0].interrupted, true);
  assert.deepEqual(
    interrupted.results.map((result) => result.status),
    ["failed", "blocked"],
  );
  assert.equal(process.listenerCount("SIGTERM"), previousListeners);
  const interruptCleanup = setTimeout(() => process.emit("SIGTERM"), 100);
  const interruptedTimeout = await runChecks(
    [
      {
        ...node("timing-out", "setInterval(() => {}, 1000)"),
        timeoutMs: 20,
      },
      node("after-timeout", "throw Error('must not run')"),
    ],
    { cwd: directory, logDirectory: join(directory, "interrupted-timeout") },
  );
  clearTimeout(interruptCleanup);
  assert.equal(interruptedTimeout.results[0].status, "timed-out");
  assert.equal(interruptedTimeout.results[0].interrupted, true);
  assert.equal(interruptedTimeout.results[1].status, "blocked");
  const cli = (args: string[]) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/checks.ts", ...args],
      {
        cwd: studioRoot,
        encoding: "utf8",
        timeout: 15_000,
      },
    );
  const listed = cli(["--list", "--only", "favicon"]);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(
    JSON.parse(listed.stdout).map((check: CheckCommand) => check.id),
    ["favicon"],
  );
  assert.notEqual(cli(["--list", "--only", "absent"]).status, 0);
  for (const path of ["src", "tests", "public"]) {
    const unsafe = cli([
      "--only",
      "favicon",
      "--log-dir",
      join(studioRoot, path),
    ]);
    assert.notEqual(unsafe.status, 0);
    assert.match(unsafe.stderr, /Report outputs cannot overwrite/);
  }

  const real = checkInventory(join(directory, "outputs"));
  assert.equal(
    selectChecks(real).length,
    real.length,
    "Every real inventory ID is unique and acyclic.",
  );
  for (const file of nonBrowserTestFiles())
    assert.equal(
      real.filter(
        (check) =>
          check.args.includes(`tests/${file}`) &&
          !check.id.startsWith("test-types-") &&
          !check.env?.COLOR_OPACITY_SDK_TESTS &&
          !check.args.includes("--sizing-only"),
      ).length,
      1,
      `${file} has exactly one ordinary execution.`,
    );
  assert.ok(real.some((check) => check.id === "favicon"));
  assert.ok(real.some((check) => check.id === "mode-control-presentation"));
  assert.ok(
    real.every(
      (check) =>
        !check.args.some((argument) => argument.includes("tests/e2e/")),
    ),
  );
  const adapter = real.find((check) => check.id === "data-vis-export")!;
  assert.deepEqual(adapter.requires, ["adapter-build"]);
  assert.equal(
    adapter.env?.DATA_VIS_BUNDLE_PATH,
    join(directory, "outputs/data-vis/data-vis.js"),
  );
  assert.ok(real.some((check) => check.id === "design-data-sdk"));
  for (const id of ["color-opacity-assessment-sdk", "mode-coverage-sdk"])
    assert.equal(
      real.find((check) => check.id === id)?.env?.COLOR_OPACITY_SDK_TESTS,
      "1",
    );
  const typed = real.filter((check) => check.id.startsWith("test-types-"));
  const typedFiles = typed.flatMap((check) =>
    check.args.filter((argument) => argument.startsWith("tests/")),
  );
  assert.deepEqual(
    typedFiles.sort(),
    nonBrowserTestFiles(studioRoot)
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => `tests/${file}`)
      .sort(),
  );
  assert.ok(
    typed.every(
      (check) =>
        check.args.filter((argument) => argument.startsWith("tests/")).length <=
        16,
    ),
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log(
  "Sequential check execution, aggregate failures, prerequisites, logs, selection, timeouts, descendant cleanup and inventory coverage passed.",
);
