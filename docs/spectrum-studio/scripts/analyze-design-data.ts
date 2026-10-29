// Copyright 2026 Adobe. All rights reserved.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  canonicalJson,
  compareDesignData,
  reportMarkdown,
  type ReviewedMapping,
} from "../src/features/design-data/comparison";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";
import { parseReviewedMappings } from "../src/features/design-data/mappings";
import {
  appRoot,
  loadReferenceInput,
  protectReportOutputs,
  referenceRoot,
} from "./design-data-loader";
import { attachReferenceAssessment } from "./design-data-assessment";

const { values } = parseArgs({
  args: process.argv.slice(2).filter((value) => value !== "--"),
  options: {
    "design-data-path": { type: "string" },
    sdk: { type: "string" },
    json: { type: "string" },
    markdown: { type: "string" },
    mapping: { type: "string" },
  },
});

const jsonPath = resolve(
  appRoot,
  values.json ?? "reports/design-data/report.json",
);
const markdownPath = resolve(
  appRoot,
  values.markdown ?? "reports/design-data/report.md",
);
const root = resolve(appRoot, values["design-data-path"] ?? referenceRoot());
await protectReportOutputs([jsonPath, markdownPath], root);
const app = defaultsAnalysisInput();
app.source.root = appRoot;
app.source.hash = createHash("sha256")
  .update(canonicalJson(app.records))
  .digest("hex");
try {
  app.source.revision = execFileSync(
    "git",
    ["-C", appRoot, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();
  app.source.dirty = Boolean(
    execFileSync(
      "git",
      ["-C", appRoot, "status", "--porcelain", "--", "src", "scripts"],
      { encoding: "utf8" },
    ).trim(),
  );
} catch {
  app.limitations.push("App Git provenance unavailable.");
}
const reference = await attachReferenceAssessment(
  await loadReferenceInput(
    root,
    values.sdk ? resolve(appRoot, values.sdk) : undefined,
  ),
  root,
);
let mappings: ReviewedMapping[] | undefined;
if (values.mapping) {
  try {
    mappings = parseReviewedMappings(
      JSON.parse(await readFile(resolve(appRoot, values.mapping), "utf8")),
    );
  } catch (error) {
    mappings = [];
    app.errors.push(
      `Mapping input: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
const report = compareDesignData(app, reference, mappings);
await mkdir(dirname(jsonPath), { recursive: true });
await mkdir(dirname(markdownPath), { recursive: true });
await writeFile(jsonPath, `${canonicalJson(report)}\n`);
await writeFile(markdownPath, reportMarkdown(report));
console.log(
  `Wrote ${jsonPath} and ${markdownPath}; ${report.findings.length} output findings${report.architecture ? `; ${report.architecture.findings.length} reviewed architectural findings / ${report.architecture.requirements.length} open requirements` : ""}; inputs ${report.valid ? "valid" : "invalid / partial"}.`,
);
if (!report.valid) process.exitCode = 1;
