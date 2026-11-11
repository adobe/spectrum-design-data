// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { referenceRecords } from "../scripts/design-data-loader";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
} from "../src/features/edit-session/state";
import { upgradeColorNamingSnapshot } from "../src/features/edit-session/colorNamingUpgrade";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
  writeAuthoringRecord,
} from "../src/features/edit-session/storage";
import { encodeStructureSource } from "../src/features/edit-session/structureSourceCodec";
import { computeAnalysisComparison } from "../src/features/design-data/analysisWork";
import type { AnalysisInput } from "../src/features/design-data/comparison";
import type { ColorOpacityConcept } from "../src/features/design-data/colorOpacityAssessment";
import {
  inventoryComparisonRows,
  tokenComparisonRows,
} from "../src/views/analysis/tokenComparisonPresentation";

const paths = [
  "tokens/color-palette.tokens.json",
  "registry/color-families.json",
  "mode-sets/color-scheme.json",
  "mode-sets/contrast.json",
];
const reference: AnalysisInput = {
  source: {
    kind: "reference",
    root: "repository primitive color reference",
    hash: "direct-reference-fixture",
    revision: "direct checkout; no SDK resolution",
    dirty: null,
    version: "fixture",
    validator: "referenceRecords",
  },
  records: [],
  categories: ["tokens", "registry", "mode-sets"],
  schemas: [],
  errors: [],
  limitations: ["Primitive palette only; no alias resolution."],
  inventoryStatus: "complete",
};
for (const path of paths) {
  const contents: unknown = JSON.parse(
    await readFile(
      new URL(`../../../packages/design-data/${path}`, import.meta.url),
      "utf8",
    ),
  );
  reference.records.push(...referenceRecords(path, contents));
}

const snapshot = createDefaultSnapshot();
const color = snapshot.taxonomy!.terms.find(
  (term) => term.id === "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
)!;
assert.equal(color.includeInProjections, false);
const legacy = structuredClone(snapshot);
delete legacy.taxonomy!.terms.find((term) => term.id === color.id)!
  .includeInProjections;
const untouched = structuredClone(legacy);
const upgraded = upgradeColorNamingSnapshot(legacy);
assert.deepEqual(
  legacy,
  untouched,
  "The upgrade must not mutate stored input.",
);
assert.deepEqual(
  upgraded,
  snapshot,
  "Only the implicit Color naming choice changes.",
);
assert.equal(upgradeColorNamingSnapshot(upgraded), upgraded);
for (const includeInProjections of [true, false]) {
  const explicit = structuredClone(legacy);
  explicit.taxonomy!.terms.find(
    (term) => term.id === color.id,
  )!.includeInProjections = includeInProjections;
  assert.equal(
    upgradeColorNamingSnapshot(explicit),
    explicit,
    "Explicit naming choices must be preserved.",
  );
}
const defaults = await computeAnalysisComparison({
  type: "compare",
  source: { dataset: "defaults" },
  reference,
});
const assessment = defaults.report!.colorOpacity!;
const blue100 = assessment.concepts.find(
  (concept) =>
    concept.family === "blue" &&
    concept.rows.some(
      (row) => row.reference.structuredName?.scaleIndex === 100,
    ),
);
assert.ok(blue100);
console.log(
  "Actual migration blue-100:",
  blue100.rows.map((row) => ({
    context: row.context,
    name: row.app?.name,
    verdict: row.verdict,
    issues: row.issues,
  })),
);
assert.equal(blue100.rows.length, 3);
for (const row of blue100.rows) {
  assert.ok(
    row.app,
    "Every required blue-100 context must have a confirmed counterpart.",
  );
  assert.equal(
    row.app.name,
    "blue-100",
    "Shipped defaults must use the requested name without a test-only edit.",
  );
  assert.equal(row.app.structuredName?.property, "color");
  assert.ok(["pass", "acceptable"].includes(row.verdict));
  assert.equal(row.context.contrast, "regular");
}
assert.deepEqual(blue100.rows.map((row) => row.context.colorScheme).sort(), [
  "dark",
  "light",
  "wireframe",
]);
const compared = tokenComparisonRows(
  assessment.concepts,
  "blue-100",
  "all",
  {},
  "all",
  "colors",
).filter((row) => row.concept.id === blue100.id);
assert.equal(compared.length, 1);
assert.equal(compared[0].children.length, 3);
assert.ok(
  compared[0].children.every((row) => row.value?.app?.name === "blue-100"),
);
const extra = inventoryComparisonRows(
  assessment.inventory!.entries,
  "blue-100",
  "all",
  {},
  "all",
  "colors",
  assessment.enhancements,
).filter(
  (row) =>
    row.inventory.side === "app" && row.inventory.record.name === "blue-100",
);
assert.deepEqual(
  extra,
  [],
  "Confirmed High enhancements must not duplicate the main comparison.",
);
const highEnhancements = assessment.enhancements.filter(
  (row) => row.conceptId === blue100.id,
);
assert.equal(highEnhancements.length, 3);
assert.ok(
  highEnhancements.every(
    (row) =>
      row.context.contrast === "high" &&
      row.app?.name === "blue-100" &&
      row.issue === null,
  ),
  "High variants remain available in Enhancements, not matched to Regular.",
);
const working = structuredClone(legacy);
working.platforms[0].name = "Preserve my working edit";
const data = new Map<string, string>([
  ["another-app", "keep"],
  [
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version: 28,
      saved: encodeStructureSource(legacy),
      working: encodeStructureSource(working),
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  ],
]);
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
const restored = readAuthoringRecord(assertStoredSnapshot, (value) => value)!;
assert.equal(restored.version, AUTHORING_RECORD_VERSION);
const restoredWorking = restored.working;
const restoredSaved = restored.saved;
assert.equal(restoredWorking.platforms[0].name, working.platforms[0].name);
assert.equal(restoredSaved.platforms[0].name, snapshot.platforms[0].name);
assert.deepEqual(restoredWorking.colorSystem, working.colorSystem);
assert.deepEqual(restoredSaved.colorSystem, legacy.colorSystem);
assert.equal(data.get("another-app"), "keep");
for (const dataset of ["saved", "working"] as const) {
  const result = await computeAnalysisComparison({
    type: "compare",
    source: { dataset, saved: restoredSaved, working: restoredWorking },
    reference,
  });
  const actual: ColorOpacityConcept | undefined =
    result.report!.colorOpacity!.concepts.find(
      (concept) => concept.id === blue100.id,
    );
  assert.ok(actual);
  assert.deepEqual(
    actual.rows.map((row) => [
      row.context,
      row.app?.name,
      row.app?.identity,
      row.app?.conceptId,
      row.appValue,
      row.referenceValue,
      row.verdict,
    ]),
    blue100.rows.map((row) => [
      row.context,
      row.app?.name,
      row.app?.identity,
      row.app?.conceptId,
      row.appValue,
      row.referenceValue,
      row.verdict,
    ]),
    `${dataset} Analysis must agree with the shipped comparison and table rows.`,
  );
  const actualAssessment = result.report!.colorOpacity!;
  assert.equal(
    inventoryComparisonRows(
      actualAssessment.inventory!.entries,
      "blue-100",
      "all",
      {},
      "all",
      "colors",
      actualAssessment.enhancements,
    ).filter((row) => row.inventory.record.name === "blue-100").length,
    0,
    `${dataset} must not duplicate High enhancements in the main table.`,
  );
  assert.deepEqual(
    actualAssessment.enhancements
      .filter((row) => row.conceptId === actual.id)
      .map((row) => [row.context, row.value]),
    highEnhancements.map((row) => [row.context, row.value]),
    `${dataset} retains the same High enhancement evidence.`,
  );
}
writeAuthoringRecord(restored);
assert.equal(
  JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).version,
  AUTHORING_RECORD_VERSION,
);
assert.deepEqual(
  readAuthoringRecord(assertStoredSnapshot, (value) => value),
  restored,
  "Reloading the upgraded record must not apply the naming change again.",
);
console.log(
  "Shipped, saved and working Analysis compare blue-100 in every required context; High variants remain separate.",
);
