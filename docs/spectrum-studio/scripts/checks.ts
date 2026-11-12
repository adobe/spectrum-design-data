// Copyright 2026 Adobe. All rights reserved.
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  browserCheckInventory,
  checkInventory,
  fileCheckInventory,
  packageBuildCheck,
  runnerTypeCheck,
  studioRoot,
  type CheckProfile,
} from "./checkInventory";
import {
  localCheckLimits,
  heavyCheckLimits,
  ciCheckLimits,
  localCheckClass,
  runChecks,
  selectChecks,
  type CheckCommand,
} from "./checkRunner";
import { protectReportOutputs, referenceRoot } from "./design-data-loader";

let logDirectory = resolve(studioRoot, "reports/checks", randomUUID());
let selected: string[] | undefined;
let list = false;
let all = false;
let appApproved = false;
let heavyApproved = false;
let scopeApproved = false;
let files: string[] | undefined;
let grep: string | undefined;
const graphFocus: string[] = [];
let graphBaseline: string | undefined;
let graphUv: string | undefined;
let profile: CheckProfile = "focused";
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === "--list") list = true;
  else if (argument === "--all") all = true;
  else if (argument === "--app-approved") appApproved = true;
  else if (argument === "--heavy-approved") heavyApproved = true;
  else if (argument === "--scope-approved") scopeApproved = true;
  else if (argument === "--files" && args[index + 1])
    files = args[++index].split(",");
  else if (argument === "--grep" && args[index + 1]) grep = args[++index];
  else if (argument === "--graph-focus" && args[index + 1])
    graphFocus.push(args[++index]);
  else if (argument === "--graph-baseline" && args[index + 1])
    graphBaseline = args[++index];
  else if (argument === "--graph-uv" && args[index + 1])
    graphUv = args[++index];
  else if (argument === "--profile" && args[index + 1]) {
    const value = args[++index];
    if (!["focused", "performance", "browser", "ci"].includes(value))
      throw new Error(`Unknown check profile: ${value}`);
    profile = value as CheckProfile;
  } else if (argument === "--log-dir" && args[index + 1])
    logDirectory = resolve(args[++index]);
  else if (argument === "--only" && args[index + 1])
    selected = args[++index].split(",");
  else throw new Error(`Unknown or incomplete checks argument: ${argument}`);
}
if (all && (profile !== "ci" || selected))
  throw new Error(
    "--all requires --profile ci and cannot be combined with --only.",
  );
if (!list && !selected && !all)
  throw new Error(
    "Choose checks with --only <id,...>. Use --list to inspect IDs; a complete run requires --profile ci --all.",
  );
if (profile === "browser" && !list && !selected)
  throw new Error("Browser checks require an explicit file selection.");
if (
  !(profile === "ci" && (list || process.env.CI === "true")) &&
  !scopeApproved &&
  selected?.some((id) => id.includes("*"))
)
  throw new Error("Local checks require explicit file IDs, not wildcards.");
if (
  files &&
  (!selected ||
    selected.some(
      (id) => !["lint-files", "format-files", "types-files"].includes(id),
    ))
)
  throw new Error(
    "--files requires only lint-files, format-files or types-files.",
  );
if (grep !== undefined) {
  if (profile !== "browser")
    throw new Error(
      "--grep is only supported for explicitly selected browser checks.",
    );
  new RegExp(grep);
}
const graphCommand = (
  id: string,
  operation: string,
  kind: CheckCommand["kind"] = "domain",
): CheckCommand => ({
  id,
  kind,
  scope:
    operation === "refresh" || operation === "setup"
      ? "project"
      : "integration",
  resources: "heavy",
  command: process.execPath,
  args: [
    "scripts/relationshipWorkflow.mjs",
    "--operation",
    operation,
    "--run-dir",
    logDirectory,
    ...graphFocus.flatMap((focus) => ["--focus", focus]),
    ...(graphBaseline ? ["--baseline", graphBaseline] : []),
    ...(graphUv ? ["--uv", graphUv] : []),
  ],
});
const inventory =
  profile === "browser"
    ? browserCheckInventory().map((check) => ({
        ...check,
        args: [...check.args, ...(grep === undefined ? [] : ["--grep", grep])],
      }))
    : [
        ...checkInventory(logDirectory),
        ...(files ? fileCheckInventory(files) : []),
        ...(selected?.some((id) =>
          [
            "relationship-map-extract",
            "relationship-map-refresh",
            "relationship-map-rust-tests",
            "relationship-map-freshness",
            "relationship-map-lint",
            "relationship-map-format",
            "relationship-map-query",
            "relationship-map-verify",
            "relationship-map-setup",
            "relationship-map-status",
            "relationship-map-context",
            "relationship-map-compare",
            "relationship-map-ai-sync",
            "relationship-map-ai-check",
          ].includes(id),
        )
          ? [
              graphCommand("relationship-map-rust-tests", "rust-tests"),
              graphCommand(
                "relationship-map-extract",
                "refresh",
                "performance",
              ),
              graphCommand(
                "relationship-map-refresh",
                "refresh",
                "performance",
              ),
              graphCommand("relationship-map-freshness", "freshness"),
              graphCommand("relationship-map-setup", "setup", "performance"),
              graphCommand("relationship-map-status", "status"),
              graphCommand(
                "relationship-map-context",
                "context",
                "performance",
              ),
              graphCommand(
                "relationship-map-compare",
                "compare",
                "performance",
              ),
              {
                id: "relationship-map-format",
                kind: "domain" as const,
                command: "pnpm",
                args: [
                  "exec",
                  "prettier",
                  "--write",
                  "scripts/checks.ts",
                  "scripts/relationshipMap.mjs",
                  "scripts/relationshipWorkflow.mjs",
                  "tests/relationship-workflow.mjs",
                ],
              },
              {
                id: "relationship-map-lint",
                kind: "typing" as const,
                command: "pnpm",
                args: [
                  "exec",
                  "eslint",
                  "scripts/checks.ts",
                  "scripts/relationshipMap.mjs",
                  "scripts/relationshipWorkflow.mjs",
                  "tests/relationship-map.mjs",
                  "tests/relationship-workflow.mjs",
                  "--max-warnings",
                  "0",
                ],
              },
              graphCommand("relationship-map-query", "context", "performance"),
              graphCommand("relationship-map-verify", "verify"),
              ...["sync", "check"].map(
                (operation): CheckCommand => ({
                  id: `relationship-map-ai-${operation}`,
                  kind: "domain",
                  command: "pnpm",
                  args: ["--dir", "../..", `ai:${operation}`],
                }),
              ),
            ]
          : []),
        ...(profile === "ci" ? [] : [packageBuildCheck, runnerTypeCheck]),
      ];
const resolved = selectChecks(inventory, selected);
if (
  !list &&
  profile === "browser" &&
  !appApproved &&
  resolved.some((check) => check.env?.STUDIO_BROWSER_SCOPE === "app")
)
  throw new Error(
    "Actual app-browser checks require explicit user permission for this scenario. Only after receiving it, add --app-approved.",
  );
if (!list)
  console.log(
    `Selected ${profile} checks: ${resolved.map((check) => check.id).join(", ")}`,
  );
if (list) console.log(JSON.stringify(resolved, null, 2));
else {
  const ci = profile === "ci" && process.env.CI === "true";
  const resourceClass = ci
    ? "ci"
    : localCheckClass(resolved, {
        heavyApproved,
        projectApproved: scopeApproved,
      });
  const limits = ci
    ? ciCheckLimits
    : resourceClass === "small"
      ? localCheckLimits
      : heavyCheckLimits;
  console.log(
    JSON.stringify({
      resourceClass,
      limits,
      checks: resolved.map(({ id, scope, resources, requires }) => ({
        id,
        scope,
        resources,
        requires,
      })),
    }),
  );
  const outputs = [
    join(logDirectory, "results.json"),
    join(logDirectory, "data-vis"),
    join(logDirectory, "production"),
    join(logDirectory, "storybook"),
  ];
  for (const root of [
    referenceRoot(),
    join(studioRoot, "public"),
    join(studioRoot, "tests"),
  ])
    await protectReportOutputs(outputs, root);
  const result = await runChecks(inventory, {
    cwd: studioRoot,
    logDirectory,
    selected,
    profile,
    resourceClass,
    stopOnFailure: !ci,
    limits,
    onResult: (check) => {
      console.log(
        `${check.status.toUpperCase()} ${check.id} (${check.durationMs.toFixed(0)}ms) ${check.log}${check.reason ? `: ${check.reason}` : ""}`,
      );
      if (
        check.status === "passed" &&
        [
          "relationship-map-context",
          "relationship-map-compare",
          "relationship-map-query",
          "relationship-map-extract",
          "relationship-map-refresh",
          "relationship-map-status",
          "relationship-map-freshness",
          "relationship-map-verify",
        ].includes(check.id)
      ) {
        const packet = readFileSync(check.log, "utf8")
          .trim()
          .split("\n")
          .at(-1);
        if (!packet || Buffer.byteLength(`${packet}\n`) > 8192)
          throw new Error(
            "Relationship-map command did not return a bounded context packet.",
          );
        JSON.parse(packet);
        console.log(packet);
      }
    },
  });
  if (result.status === "busy") {
    console.error(JSON.stringify({ status: "not-run", reason: result.reason }));
    process.exitCode = result.exitCode;
  } else {
    console.log(
      `${result.results.filter((check) => check.status === "passed").length}/${result.results.length} checks passed. Complete results: ${resolve(logDirectory, "results.json")}`,
    );
    process.exitCode = result.exitCode;
  }
}
