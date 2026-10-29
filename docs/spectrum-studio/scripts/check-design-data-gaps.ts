// Copyright 2026 Adobe. All rights reserved.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import {
  gapRegister,
  gapRegisterIssues,
  gapsMarkdown,
  assessGaps,
} from "../src/features/design-data/gaps";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";

const { values } = parseArgs({
  options: {
    write: { type: "boolean" },
    check: { type: "boolean" },
    "design-data-path": { type: "string" },
  },
});
const issues = gapRegisterIssues(gapRegister);
const legacyGaps = await readFile(
  resolve("docs/archive/design-data-alignment-gaps.md"),
  "utf8",
);
for (const gap of gapRegister.gaps) {
  for (const id of gap.links.filter((id) => id.startsWith("GAP-"))) {
    if (!legacyGaps.includes(`### ${id}:`))
      issues.push(`${gap.id}: missing original gap heading ${id}.`);
  }
  for (const path of [
    gap.rfc.link,
    ...gap.criteria.flatMap((criterion) => criterion.evidence),
    ...gap.history.flatMap((entry) => entry.evidence),
  ].filter((path): path is string => !!path)) {
    if (
      !path.startsWith("docs/") &&
      !path.startsWith("tests/") &&
      !path.startsWith("src/")
    ) {
      issues.push(
        `${gap.id}: evidence must identify a local versioned record: ${path}`,
      );
      continue;
    }
    try {
      await readFile(resolve(path));
    } catch {
      issues.push(`${gap.id}: missing evidence/RFC file ${path}`);
    }
  }
}
if (values["design-data-path"]) {
  const revision = execFileSync(
    "git",
    ["-C", resolve(values["design-data-path"]), "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();
  for (const gap of gapRegister.gaps)
    if (gap.profile === "reference-checkout" && gap.revision !== revision)
      issues.push(`${gap.id}: reference revision is stale (${revision}).`);
}
if (issues.length) throw new Error(issues.join("\n"));
const markdown = [
  "# Spectrum studio alignment gap register",
  "",
  "Generated from `src/data/design-data-gaps.json`; do not edit statuses here.",
  "This view does not load live reference evidence. Use Analysis or the existing design-data CLI for scoped runtime assessment.",
  "",
  gapsMarkdown(assessGaps(defaultsAnalysisInput(), undefined, [])),
  "",
].join("\n");
const path = resolve("docs/design-data-gap-register.md");
if (values.write) await writeFile(path, markdown);
if (values.check && (await readFile(path, "utf8")) !== markdown)
  throw new Error("Gap register documentation is stale. Run pnpm gaps:docs.");
console.log(
  "Gap register schema, stable references, evidence paths and closure gates are valid.",
);
