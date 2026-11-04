// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import ts from "typescript";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { buildClassificationMigrationReview } from "../src/features/design-data/classificationReview";
import { classificationStandard } from "../src/features/taxonomy/standardContract";
import { classificationReviewMessages } from "../src/features/taxonomy/reviewPresentation";
import { buildClassificationReviewExport } from "../src/features/taxonomy/reviewedExport";
import { projectClassification } from "../src/features/taxonomy/model";
import { SAMPLE_SYSTEM_INSIGHTS } from "../src/features/insights/fixtures";

const sourceRoot = new URL("../src/", import.meta.url);
const entries = await readdir(sourceRoot, { recursive: true });
const diagnosticImports =
  /features\/taxonomy\/(?:standardization|standardContract|reviewPresentation|reviewedExport|generatedReviewExport)$/;
for (const path of entries.filter(
  (entry) =>
    entry.endsWith(".tsx") &&
    !entry.endsWith(".stories.tsx") &&
    !entry.startsWith("views/analysis/"),
)) {
  const text = await readFile(new URL(path, sourceRoot), "utf8");
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      assert(
        !diagnosticImports.test(statement.moduleSpecifier.text),
        `${path}: proposed-standard diagnostics belong only in Migration analysis.`,
      );
    }
  }
}
for (const path of [
  "views/tokens/TokenBrowserView.tsx",
  "panels/tokens/TokenDetailsDialog.tsx",
  "panels/tokens/TokenInspector.tsx",
  "panels/tokens/TokenInspectorContainer.tsx",
  "panels/registry/TaxonomyEditor.tsx",
]) {
  const text = await readFile(new URL(path, sourceRoot), "utf8");
  assert.doesNotMatch(
    text,
    /\b(classificationIssues|termReviews|categoryReview|props\.issues)\b/,
    `${path}: neither read-only nor editable presentation accepts migration warnings.`,
  );
}
assert(
  !SAMPLE_SYSTEM_INSIGHTS.pillars.some((pillar) => pillar.id === "conformance"),
);
assert(
  !SAMPLE_SYSTEM_INSIGHTS.attention.some(
    (item) => item.pillarId === "conformance",
  ),
);
assert(
  SAMPLE_SYSTEM_INSIGHTS.attention.some(
    (item) => item.id === "stale-color-overrides",
  ),
);
assert(SAMPLE_SYSTEM_INSIGHTS.divergence.cells.length > 0);

const saved = createDefaultSnapshot();
const before = structuredClone(saved);
const savedReview = buildClassificationMigrationReview(saved);
assert.deepEqual(
  saved,
  before,
  "Reviewing shipped or saved data must not mutate it.",
);
assert(savedReview.assessment.counts.nonStandard > 0);
const row = savedReview.rows[0];
assert(row, "The review must include declared token rows.");
const working = structuredClone(saved);
working.aliases = {
  schemaVersion: 1,
  tokens: [
    {
      id: crypto.randomUUID(),
      name: "retained-review-alias",
      $ref: row.id,
      contexts: [row.context],
    },
  ],
};
const document = working.taxonomy!;
const property = document.categories.find(
  (category) => category.key === "property",
)!;
property.description = "A deliberately different authoring definition.";
const facet = classificationStandard.facets.find((item) =>
  item.sourceKeys.includes(property.key),
)!;
const customCategory = {
  ...property,
  id: crypto.randomUUID(),
  key: "migrationReviewFixture",
  name: "Review fixture",
  required: false,
};
document.categories.push(customCategory);
document.order.push(customCategory.id);
const workingBefore = structuredClone(working);
const workingReview = buildClassificationMigrationReview(working);
assert.deepEqual(working, workingBefore);
assert.deepEqual(
  saved,
  before,
  "Working diagnostics must not change the saved comparison source.",
);
const definitions = workingReview.assessment.occurrences.filter(
  (entry) => entry.recordKind === "category-definition",
);
const propertyReview = definitions.find(
  (entry) => entry.categoryId === property.id,
)!;
assert(propertyReview.issues.some((issue) => issue.code === "facet-review"));
assert(
  classificationReviewMessages(document, [propertyReview]).some((message) =>
    message.includes(facet.question),
  ),
);
assert(
  definitions
    .find((entry) => entry.categoryId === customCategory.id)
    ?.issues.some((issue) => issue.code === "unsupported-facet"),
);
assert(
  workingReview.assessment.occurrences.some(
    (entry) => entry.recordKind === "alias-usage" && entry.fixRequired,
  ),
);
const packet = await buildClassificationReviewExport(
  workingReview.document,
  workingReview.rows,
  workingReview.aliases,
  "compatibility",
);
assert.deepEqual(
  workingReview.assessment,
  packet.assessment,
  "Migration presentation and downloaded review use the same canonical usages, including aliases and modes.",
);
await assert.rejects(
  buildClassificationReviewExport(
    workingReview.document,
    workingReview.rows,
    workingReview.aliases,
    "standard-compliant",
  ),
  /Standard-compliant export blocked.*Migration analysis > Classification review/s,
);
assert.deepEqual(
  working,
  workingBefore,
  "Export attempts cannot save data or clear diagnostics.",
);
const broken = projectClassification(
  document,
  { [property.id]: crypto.randomUUID() },
  "colors",
);
assert(
  broken.issues.some((issue) => issue.includes("Unresolved")),
  "Ordinary broken-reference validation must remain intact.",
);
console.log(
  "Migration diagnostics: authoring presentation boundary, source isolation, canonical review/export parity and ordinary validation passed.",
);
