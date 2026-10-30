// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { referenceRecords } from "../scripts/design-data-loader";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";
import {
  compareDesignData,
  reportMarkdown,
  type AnalysisInput,
  type AnalysisReport,
} from "../src/features/design-data/comparison";

const temporary = await mkdtemp(join(tmpdir(), "studio-palette-cli-"));
try {
  const root = join(temporary, "reference");
  const data = join(root, "packages/design-data");
  const spec = join(root, "packages/design-data-spec");
  await mkdir(join(spec, "schemas"), { recursive: true });
  await mkdir(data, { recursive: true });
  for (const directory of [data, spec])
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ version: "fixture" }),
    );
  const records: AnalysisInput["records"] = [];
  for (const source of [
    "tokens/color-palette.tokens.json",
    "registry/color-families.json",
    "mode-sets/color-scheme.json",
    "mode-sets/contrast.json",
  ]) {
    const text = await readFile(
      new URL(`../../../packages/design-data/${source}`, import.meta.url),
      "utf8",
    );
    const path = join(data, source);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, text);
    records.push(...referenceRecords(source, JSON.parse(text)));
  }
  const sdk = join(temporary, "fixture-sdk.mjs");
  await writeFile(
    sdk,
    `#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
console.log(process.argv.includes('--version') ? 'Fixture SDK, not conformance evidence' : JSON.stringify({ valid: true, errors: [], warnings: [] }));
`,
  );
  await chmod(sdk, 0o700);
  const json = join(temporary, "report.json");
  const markdown = join(temporary, "report.md");
  const child = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(
        new URL("../scripts/analyze-design-data.ts", import.meta.url),
      ),
      "--design-data-path",
      root,
      "--sdk",
      sdk,
      "--json",
      json,
      "--markdown",
      markdown,
    ],
    { encoding: "utf8", timeout: 60_000 },
  );
  assert.equal(
    child.status,
    0,
    `${child.error?.message ?? ""}\n${child.stderr}\n${child.stdout}`,
  );
  const report = JSON.parse(await readFile(json, "utf8")) as AnalysisReport;
  const reference: AnalysisInput = {
    source: report.inputs.reference,
    records,
    categories: ["tokens", "registry", "mode-sets"],
    schemas: [],
    errors: [],
    limitations: [],
    inventoryStatus: "complete",
  };
  const app = defaultsAnalysisInput();
  app.source = report.inputs.app;
  const expected = compareDesignData(app, reference).palette!;
  assert.deepEqual(
    report.palette,
    expected,
    "CLI and direct assessments must share every palette outcome and policy.",
  );
  assert.equal(await readFile(markdown, "utf8"), reportMarkdown(report));
  assert.match(child.stdout, /Wrote /);
  console.log(
    "Palette CLI JSON, Markdown, source evidence and direct-assessment parity passed using a fixture SDK only.",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
