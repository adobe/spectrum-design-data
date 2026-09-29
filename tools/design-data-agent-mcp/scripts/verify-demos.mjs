// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Re-runs the scenario matrix documented in DEMOS.md against the real read-tool
 * handlers (same in-process invocation pattern as test/read.test.js's getHandler()
 * helper — no subprocess, no MCP transport). Exits non-zero only on a *regression*:
 * a scenario expected to pass that now fails, or one expected to fail that now
 * passes (meaning DEMOS.md needs updating, not code).
 *
 * ponytail: this is a thin pass/fail reporter over the existing tool handlers, not
 * a test framework — add AVA coverage instead if these need fixtures/mocking.
 *
 * Usage: node tools/design-data-agent-mcp/scripts/verify-demos.mjs
 */

import { createReadTools } from "../src/tools/read.js";

process.env.DESIGN_DATA_SKIP_VERSION_CHECK = "1";

function getHandler(name) {
  const tools = createReadTools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool "${name}" not found`);
  return tool.handler.bind(tool);
}

/**
 * Each scenario mirrors a row in DEMOS.md. `status: "green"` is a working scenario;
 * `status: "known-bug"` is a documented, bead-tracked broken case. `verify(result, threw)`
 * asserts the *current* documented behavior — for a thrown call, `result` is the Error and
 * `threw` is true; for a successful call that still demonstrates a bug (e.g. an empty
 * array, or a wrong-but-present value), `threw` is false and `verify` inspects the value.
 * A scenario "regresses" when `verify()` no longer holds, in either direction.
 */
const SCENARIOS = [
  {
    name: "primer: structural overview",
    tool: "primer",
    args: {},
    status: "green",
    verify: (r, threw) => !threw && typeof r.tokenCount === "number" && r.tokenCount > 0,
  },
  {
    name: "primer.modeSets are populated (bead spectrum-design-data-v9bb)",
    tool: "primer",
    args: {},
    status: "green",
    verify: (r, threw) =>
      !threw &&
      r.modeSets.colorScheme.includes("light") &&
      r.modeSets.colorScheme.includes("dark") &&
      r.modeSets.scale.includes("desktop") &&
      r.modeSets.contrast.includes("regular"),
  },
  {
    name: "query_tokens: filter by bare property",
    tool: "query_tokens",
    args: { filter: "property=corner-radius" },
    status: "green",
    verify: (r, threw) => !threw && Array.isArray(r) && r.length > 0,
  },
  {
    name: "suggest_token: plain-language intent ranks tokens",
    tool: "suggest_token",
    args: { intent: "primary button background color", limit: 5 },
    status: "green",
    verify: (r, threw) => !threw && Array.isArray(r) && r.length > 0,
  },
  {
    name: "query_tokens: component=<id> returns tokens (bead spectrum-design-data-42lp)",
    tool: "query_tokens",
    args: { filter: "component=button" },
    status: "known-bug",
    verify: (r, threw) => !threw && Array.isArray(r) && r.length === 0,
  },
  {
    name: "query_tokens: category= is not a valid key",
    tool: "query_tokens",
    args: { filter: "category=color" },
    status: "known-bug",
    verify: (err, threw) => threw && /unknown key/i.test(err.message),
  },
  {
    name: "resolve_token: bare property resolves",
    tool: "resolve_token",
    args: { property: "corner-radius" },
    status: "green",
    verify: (r, threw) => !threw && r.token != null,
  },
  {
    name: "resolve_token: shared property reports ambiguity and deprecation",
    tool: "resolve_token",
    args: { property: "background-color" },
    status: "green",
    verify: (r, threw) =>
      !threw &&
      r.ambiguous === true &&
      r.candidateCount > 1 &&
      r.deprecated === true &&
      Array.isArray(r.alternatives),
  },
  {
    name: "resolve_token: variant and state narrow a shared property",
    tool: "resolve_token",
    args: {
      property: "background-color",
      variant: "subdued",
      state: "down",
    },
    status: "green",
    verify: (r, threw) =>
      !threw && r.ambiguous === false && r.candidateCount === 1,
  },
  {
    name: "resolve_token: colorRole narrows a shared property",
    tool: "resolve_token",
    args: {
      property: "color",
      colorRole: "accent",
      state: "down",
      colorScheme: "light",
    },
    status: "green",
    verify: (r, threw) =>
      !threw && r.ambiguous === false && r.candidateCount === 1,
  },
  {
    name: "resolve_token: component narrows a component token",
    tool: "resolve_token",
    args: { property: "thickness", component: "tabs" },
    status: "green",
    verify: (r, threw) =>
      !threw && r.ambiguous === false && r.candidateCount === 1,
  },
  {
    name: "resolve_token: deprecated candidates can be excluded",
    tool: "resolve_token",
    args: { property: "background-color", excludeDeprecated: true },
    status: "green",
    verify: (err, threw) =>
      threw && /No token found/.test(err.message) && /deprecated/i.test(err.message),
  },
  {
    name: "resolve_token: legacyKey-shaped example fails (bead spectrum-design-data-58iv)",
    tool: "resolve_token",
    args: { property: "accent-background-color-default" },
    status: "known-bug",
    verify: (err, threw) => threw && /No token found/.test(err.message),
  },
  {
    name: "describe_component: button schema",
    tool: "describe_component",
    args: { id: "button" },
    status: "green",
    verify: (r, threw) => !threw && Array.isArray(r.options?.variant?.values),
  },
  {
    name: "describe_component: button tokenBindings are all dangling (see bead spectrum-design-data-vpk.2)",
    tool: "describe_component",
    args: { id: "button" },
    status: "known-bug",
    verify: (r, threw) => !threw && (r.tokenBindings ?? []).length === 3,
  },
  {
    name: "list_guidelines: catalog",
    tool: "list_guidelines",
    args: {},
    status: "green",
    verify: (r, threw) => !threw && Array.isArray(r) && r.length > 0,
  },
  {
    name: "describe_guideline: colors",
    tool: "describe_guideline",
    args: { id: "colors" },
    status: "green",
    verify: (r, threw) => !threw && Array.isArray(r.documentBlocks) && r.documentBlocks.length > 0,
  },
];

let regressions = 0;

for (const scenario of SCENARIOS) {
  const handler = getHandler(scenario.tool);
  let value;
  let threw;
  try {
    value = await handler(scenario.args);
    threw = false;
  } catch (err) {
    value = err;
    threw = true;
  }

  const holds = Boolean(scenario.verify(value, threw));
  const icon = !holds ? "✗ REGRESSION" : scenario.status === "green" ? "✓" : "○ known-bug";
  console.log(`${icon}  ${scenario.name}`);
  if (!holds) {
    regressions += 1;
    console.log(
      `    documented behavior no longer holds (threw=${threw}` +
        (threw ? `, message="${value.message}"` : "") +
        ")",
    );
  }
}

console.log(
  `\n${SCENARIOS.length - regressions}/${SCENARIOS.length} scenarios match DEMOS.md.`,
);

if (regressions > 0) {
  console.error(
    `\n${regressions} regression(s): a scenario's pass/fail status changed. ` +
      "Update DEMOS.md (and close/reopen the linked beads) to match the new behavior, " +
      "or fix the code if this was unintentional.",
  );
  process.exit(1);
}
