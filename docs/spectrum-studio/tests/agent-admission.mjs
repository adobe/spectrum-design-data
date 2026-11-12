// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { admitTool } from "../scripts/agentAdmission.mjs";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const call = (toolName, toolArgs) => admitTool({ cwd, toolName, toolArgs });
const denied = (value) => assert.equal(value.permissionDecision, "deny");
const patch = "*** Begin Patch\n*** Add File: plan.md\n+Plan\n*** End Patch\n";
assert.deepEqual(call("functions.apply_patch", patch), {});
assert.deepEqual(
  admitTool({ cwd, tool_name: "apply_patch", tool_input: patch }),
  {},
);
denied(call("bash", { command: "pnpm exec tsx tests/persistence.ts" }));
denied(call("Bash", { command: "pnpm test:ci" }));
denied(
  call("bash", { command: "pnpm check:focused --only favicon && pnpm build" }),
);
denied(
  call("bash", { command: "pnpm check:focused --only favicon; echo bypass" }),
);
denied(call("bash", { command: 'sh -c "pnpm build"' }));
denied(call("bash", { command: 'node -e "setInterval(()=>{},1000)"' }));
denied(call("bash", { command: "echo STUDIO_ADMISSION_PROBE_DENY" }));
denied(call("task", { prompt: "Review Spectrum Studio in the background." }));
denied(call("rg", { paths: "..", pattern: "a" }));
denied(call("rg", { paths: "node_modules", pattern: "a" }));
denied(call("glob", { pattern: "**/*" }));
denied(call("rg", { paths: "src", pattern: "a", head_limit: 1000 }));
denied(call("rg", { paths: "src", pattern: "a", head_limit: -1 }));
denied(
  call("rg", { paths: ".", glob: "**/node_modules/**/*.ts", pattern: "a" }),
);
denied(call("glob", { paths: ".", pattern: "**/{node_modules,.pnpm}/**" }));
denied(call("bash", { command: "pnpm check:focused --profile ci --all" }));
denied(
  call("parallel", {
    tool_uses: [
      {
        recipient_name: "functions.bash",
        parameters: { command: "pnpm build" },
      },
    ],
  }),
);
assert.deepEqual(
  call("bash", { command: "pnpm check:focused --only favicon" }),
  {},
);
assert.deepEqual(call("bash", { command: "pnpm check:list" }), {});
assert.deepEqual(
  call("bash", {
    command: "pnpm check:focused --only runner-types --heavy-approved",
  }),
  {},
);
assert.deepEqual(
  call("bash", {
    command: "pnpm check:focused --only lint-files --files scripts/checkRunner.ts --heavy-approved",
  }),
  {},
);
assert.deepEqual(
  call("bash", {
    command: "pnpm check:focused --profile ci --all --scope-approved --heavy-approved",
  }),
  {},
  "The CLI still enforces local budgets; approval flags are not CI budgets.",
);
assert.deepEqual(
  call("rg", { paths: "src", pattern: "a", head_limit: 20 }),
  {},
);
assert.deepEqual(call("rg", { paths: "src", pattern: "a" }), {
  modifiedArgs: { paths: "src", pattern: "a", head_limit: 200 },
});
assert.equal(
  call("parallel", {
    tool_uses: [
      {
        recipient_name: "functions.rg",
        parameters: { paths: "src", pattern: "a" },
      },
    ],
  }).modifiedArgs.tool_uses[0].parameters.head_limit,
  200,
);
denied(
  admitTool({
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    toolName: "rg",
    toolArgs: { paths: ".", pattern: "a" },
  }),
);
assert.deepEqual(
  admitTool({
    cwd,
    tool_name: "Bash",
    tool_input: JSON.stringify({
      command: "pnpm check:focused --only favicon",
    }),
  }),
  {},
);
assert.deepEqual(
  admitTool({
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    toolName: "bash",
    toolArgs: { command: "pnpm --filter unrelated-package test" },
  }),
  {},
);
const cli = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("../scripts/agentAdmission.mjs", import.meta.url))],
  { input: "{malformed", encoding: "utf8" },
);
assert.equal(cli.status, 1);
denied(JSON.parse(cli.stdout));
const patchCli = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("../scripts/agentAdmission.mjs", import.meta.url))],
  {
    input: JSON.stringify({
      cwd,
      toolName: "functions.apply_patch",
      toolArgs: patch,
    }),
    encoding: "utf8",
  },
);
assert.equal(patchCli.status, 0, patchCli.stderr);
assert.deepEqual(JSON.parse(patchCli.stdout), {});
console.log(
  "Studio hook normalization, scoped searches, direct-command denial and bounded-command admission passed.",
);
