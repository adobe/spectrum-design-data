// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  ciCheckLimits,
  heavyCheckLimits,
  localCheckClass,
  localCheckLimits,
  selectChecks,
  type CheckCommand,
} from "../scripts/checkRunner";
import {
  checkInventory,
  fileCheckInventory,
  runnerTypeCheck,
} from "../scripts/checkInventory";

const element: CheckCommand = {
  id: "element",
  command: process.execPath,
  args: [],
  scope: "element",
  resources: "small",
};
const broad: CheckCommand = {
  ...element,
  id: "broad",
  scope: "project",
  resources: "heavy",
};
assert.equal(localCheckClass([element]), "small");
assert.throws(() => localCheckClass([]), /at least one/);
assert.throws(() => localCheckClass([broad]), /scope approval/);
assert.throws(
  () => localCheckClass([broad], { projectApproved: true }),
  /--heavy-approved/,
);
assert.equal(
  localCheckClass([broad], { projectApproved: true, heavyApproved: true }),
  "heavy",
);
assert.throws(
  () => localCheckClass([{ ...element, resources: undefined }]),
  /unclassified/,
);
assert.throws(
  () =>
    localCheckClass(
      selectChecks([{ ...element, requires: ["broad"] }, broad], ["element"]),
    ),
  /scope approval/,
  "A prerequisite cannot smuggle broad work into an element selection.",
);
assert.equal(localCheckLimits.maxRssBytes, 256 * 1024 ** 2);
assert.equal(localCheckLimits.runTimeoutMs, 30_000);
assert.equal(heavyCheckLimits.maxRssBytes, 1024 ** 3);
assert.equal(heavyCheckLimits.runTimeoutMs, 60_000);
assert.equal(ciCheckLimits.runTimeoutMs, 3_600_000);

const files = fileCheckInventory([
  "scripts/checkRunner.ts",
  "tests/check-selection.ts",
]);
const lint = files.find((check) => check.id === "lint-files")!;
assert.deepEqual(lint.args, [
  "exec",
  "eslint",
  "scripts/checkRunner.ts",
  "tests/check-selection.ts",
  "--max-warnings",
  "0",
]);
const types = files.find((check) => check.id === "types-files")!;
assert(types.args.includes("--focused"));
assert.deepEqual(types.args.slice(-2), [
  "scripts/checkRunner.ts",
  "tests/check-selection.ts",
]);
assert.throws(() => fileCheckInventory([]), /one to sixteen/);
for (const path of [
  "../package.json",
  "src/**/*.ts",
  "node_modules/typescript/package.json",
  "reports/a.ts",
])
  assert.throws(() => fileCheckInventory([path]), /supported focused input/);
const inventory = checkInventory("/unused-output");
assert(inventory.every((check) => check.scope && check.resources));
assert.equal(
  inventory.find((check) => check.id === "scoped-style-acceptance")?.resources,
  "heavy",
);
assert.equal(
  inventory.find((check) => check.id === "app-types")?.scope,
  "project",
);
assert.equal(
  inventory.find((check) => check.id === "check-selection")?.resources,
  "small",
);
assert(
  !inventory.some((check) => check.id === "runner-types"),
  "Local typing does not duplicate comprehensive CI typing.",
);
assert(!runnerTypeCheck.args.includes("tsconfig.node.json"));
console.log(
  "Focused roots, explicit costs, prerequisite approval and separate local/CI budgets passed.",
);
