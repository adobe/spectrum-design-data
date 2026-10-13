// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, isAbsolute } from "node:path";
import { parseArgs } from "node:util";
import {
  connectMcp,
  callJson,
  bundleDir,
  assertCurrentArtifact,
} from "./mcp.js";
import { createProvider } from "./provider.js";
import { runScenario } from "./runner.js";
import { scenarios } from "./scenarios.js";

async function main() {
  const { values } = parseArgs({
    options: {
      limit: { type: "string", default: "13" },
      scenario: { type: "string" },
      output: { type: "string", default: "reports" },
      artifact: { type: "string", default: bundleDir },
    },
  });
  const limit = Number(values.limit);
  if (!isAbsolute(values.artifact)) {
    throw new Error(
      "--artifact must be an absolute path to a trusted staging tree.",
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 15) {
    throw new Error("--limit must be an integer from 1 to 15.");
  }
  const selected = scenarios
    .filter((item) => !values.scenario || item.id === values.scenario)
    .slice(0, limit);
  if (!selected.length)
    throw new Error("Unknown scenario; no evaluation was run.");
  const complete = createProvider({
    endpoint: process.env.EVAL_ENDPOINT,
    model: process.env.EVAL_MODEL,
    apiKey: process.env.EVAL_API_KEY,
  });
  const artifact = values.artifact;
  const client = await connectMcp(artifact);
  const results = [];
  const budget = { requests: 0, promptChars: 0 };
  try {
    await assertCurrentArtifact(client);
    const manifest = await readFile(
      join(
        artifact,
        "node_modules/@adobe/spectrum-design-data/guidelines/manifest.json",
      ),
    );
    const wasm = await readFile(
      join(
        artifact,
        "node_modules/@adobe/design-data-wasm/pkg/node/design_data_wasm_bg.wasm",
      ),
    );
    const primer = await callJson(client, "design-data-primer");
    for (const scenario of selected) {
      const result = await runScenario({ client, scenario, complete, budget });
      results.push(result);
      console.log(`${scenario.id}: ${result.status}`);
      if (result.status === "execution_error") break;
    }
    const report = {
      timestamp: new Date().toISOString(),
      model: process.env.EVAL_MODEL,
      commit: process.env.GITHUB_SHA ?? null,
      provenance: primer.provenance,
      manifestSha256: createHash("sha256").update(manifest).digest("hex"),
      wasmSha256: createHash("sha256").update(wasm).digest("hex"),
      scenarioSha256: createHash("sha256")
        .update(JSON.stringify(selected))
        .digest("hex"),
      budget,
      selected: selected.map((item) => item.id),
      results,
      note: "Automated screens are not proof of semantic answer quality. Human rubric review is required.",
    };
    await mkdir(values.output, { recursive: true });
    await writeFile(
      join(values.output, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    const summary =
      "# Hub MCP agent evaluation\n\n" +
      `Model: ${report.model}\n\n` +
      "These are automated screens, not a semantic quality verdict. Review tool traces and each scenario rubric.\n\n" +
      "| Scenario | Result |\n| --- | --- |\n" +
      results.map((item) => `| ${item.id} | ${item.status} |`).join("\n") +
      "\n";
    await writeFile(join(values.output, "summary.md"), summary);
    if (process.env.GITHUB_STEP_SUMMARY) {
      await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
    }
    if (results.some((item) => item.status === "execution_error"))
      process.exitCode = 2;
    else if (results.some((item) => item.status === "quality_regression"))
      process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Hub evaluation could not run: ${error.message}`);
  process.exitCode = 2;
});
