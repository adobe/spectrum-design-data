// Copyright 2026 Adobe. All rights reserved.
import { join, resolve } from "node:path";
import { checkInventory, studioRoot } from "./checkInventory";
import { runChecks, selectChecks } from "./checkRunner";
import { protectReportOutputs, referenceRoot } from "./design-data-loader";

let logDirectory = resolve(studioRoot, "reports/checks");
let selected: string[] | undefined;
let list = false;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === "--list") list = true;
  else if (argument === "--log-dir" && args[index + 1])
    logDirectory = resolve(args[++index]);
  else if (argument === "--only" && args[index + 1])
    selected = args[++index].split(",");
  else throw new Error(`Unknown or incomplete checks argument: ${argument}`);
}
const inventory = checkInventory(logDirectory);
if (list)
  console.log(JSON.stringify(selectChecks(inventory, selected), null, 2));
else {
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
    onResult: (check) =>
      console.log(
        `${check.status.toUpperCase()} ${check.id} (${check.durationMs.toFixed(0)}ms) ${check.log}${check.reason ? `: ${check.reason}` : ""}`,
      ),
  });
  console.log(
    `${result.results.filter((check) => check.status === "passed").length}/${result.results.length} checks passed. Complete results: ${resolve(logDirectory, "results.json")}`,
  );
  process.exitCode = result.exitCode;
}
