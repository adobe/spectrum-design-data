// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
} from "../src/features/edit-session/state";
import { upgradeTokenTierData } from "../src/features/edit-session/tokenTierUpgrade";
import { browserSourcesForSnapshot } from "../src/features/tokens/browserSavedState";
import { modeSetDefaultMode } from "../src/features/modes/model";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { semanticTokenSource } from "../src/features/tokens/semanticSource";
import {
  projectBrowserTokens,
  resolveBrowserTokens,
} from "../src/features/tokens/browserModel";
import {
  createNewTokenEdit,
  newTokenQuestions,
} from "../src/features/tokens/creationFlow";
import {
  categoryAllowsTier,
  isTokenTier,
  TOKEN_TIERS,
} from "../src/features/tokens/tier";
import {
  blockingProjectionIssues,
  projectClassification,
  taxonomyIssues,
  withTaxonomyProjection,
} from "../src/features/taxonomy/model";
import { compareAuthoring } from "../src/features/changelog/registry";
import { computeComparison } from "../src/features/changelog/computeComparison";
import {
  createDialogDraft,
  commitDialogDraft,
} from "../src/features/tokens/dialogModel";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { buildCanonicalTaxonomyExport } from "../src/features/taxonomy/export";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { readPath } from "../src/features/changelog/contract";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  readAuthoringRecord,
  writeAuthoringRecord,
} from "../src/features/edit-session/storage";

const snapshot = createDefaultSnapshot();
assert.ok(snapshot.browserTokenEdits);
const taxonomy = snapshot.taxonomy!;
const category = (key: string) => {
  const found = taxonomy.categories.find((item) => item.key === key);
  assert.ok(found);
  return found;
};
const assignment = (key: string) => {
  const owner = category(key);
  const term = taxonomy.terms.find((item) => item.categoryId === owner.id);
  assert.ok(term);
  return { [owner.id]: term.id };
};
assert.deepEqual(TOKEN_TIERS, ["primitive", "semantic", "component"]);
assert.equal(isTokenTier("raw"), false);
assert.equal(isTokenTier(undefined), false);
assert.ok(TOKEN_TIERS.every(isTokenTier));
assert.ok(categoryAllowsTier({}, undefined));
assert.equal(categoryAllowsTier(category("colorFamily"), undefined), false);
for (const tier of TOKEN_TIERS) {
  assert.equal(
    categoryAllowsTier(category("colorFamily"), tier),
    tier === "primitive",
  );
  assert.equal(
    categoryAllowsTier(category("interaction"), tier),
    tier !== "primitive",
  );
  assert.equal(
    categoryAllowsTier(category("interactiveContext"), tier),
    tier !== "primitive",
  );
  const questions = newTokenQuestions(taxonomy, tier, "colors");
  assert.equal(
    questions.some((item) => item.category.key === "colorFamily"),
    tier === "primitive",
  );
}

// A batch cache must not reuse a Primitive projection for Semantic tokens.
const family = assignment("colorFamily");
withTaxonomyProjection(taxonomy, () => {
  assert.deepEqual(
    projectClassification(taxonomy, family, "colors", "primitive").issues,
    [],
  );
  const semantic = projectClassification(
    taxonomy,
    family,
    "colors",
    "semantic",
  );
  assert.equal(semantic.tierIssues?.length, 1);
  assert.deepEqual(blockingProjectionIssues(semantic), []);
  const invalid = projectClassification(
    taxonomy,
    { ...family, "missing-category": "missing-term" },
    "colors",
    "semantic",
  );
  assert.deepEqual(blockingProjectionIssues(invalid), [
    "Unknown category missing-category.",
  ]);
  assert.deepEqual(
    semantic.classification,
    family,
    "Incompatible assignments are preserved.",
  );
  assert.deepEqual(
    projectClassification(taxonomy, family, "colors", "primitive").issues,
    [],
  );
  assert.deepEqual(
    projectClassification(taxonomy, family, "colors").issues,
    [],
    "Source labels have no token tier.",
  );
});
const required = structuredClone(taxonomy);
required.categories.find((item) => item.key === "interaction")!.required = true;
assert.ok(
  !projectClassification(required, family, "colors", "primitive").issues.some(
    (issue) => issue.includes("Missing required Interaction"),
  ),
);
for (const allowedTokenTiers of [[], ["primitive", "primitive"], ["unknown"]]) {
  const invalid = structuredClone(taxonomy);
  Object.assign(invalid.categories[0], { allowedTokenTiers });
  assert.ok(taxonomyIssues(invalid).length);
}

const modes = snapshot.modeSets.flatMap((axis) => {
  const mode = modeSetDefaultMode(axis);
  return mode ? [mode] : [];
});
const sources = browserSourcesForSnapshot(snapshot, modes);
assert.ok(sources.length);
assert.ok(sources.every((source) => source.tier === "primitive"));
for (const type of [
  "colors",
  "typography",
  "spacing",
  "size",
  "radius",
  "opacity",
  "elevation",
])
  assert.ok(
    sources.some((source) => source.type === type),
    `${type} is covered.`,
  );
const bundle = buildTshirtArtifacts(snapshot);
assert.ok(bundle.semantics.some((row) => row.token.$ref));
assert.ok(bundle.semantics.some((row) => row.token.value !== undefined));
assert.ok(
  bundle.semantics.every(
    (row) => semanticTokenSource(row, taxonomy).tier === "semantic",
  ),
);
const incompatible = structuredClone(snapshot);
assert.ok(incompatible.browserTokenEdits);
const incompatibleEdits = incompatible.browserTokenEdits;
for (const key of ["element", "property"])
  incompatible.taxonomy!.categories.find(
    (item) => item.key === key,
  )!.allowedTokenTiers = ["semantic"];
assertStoredSnapshot(incompatible);
const incompatibleSources = browserSourcesForSnapshot(incompatible, modes);
const incompatibleTokens = projectBrowserTokens(
  resolveBrowserTokens(incompatibleSources, incompatibleEdits, "[]"),
  incompatible.taxonomy!,
);
assert.equal(incompatibleTokens.length, sources.length);
assert.ok(
  incompatibleTokens.some((token) => token.projection?.tierIssues?.length),
);
assert.ok(incompatibleTokens.every((token) => !token.validationError));
const baselineTokens = projectBrowserTokens(
  resolveBrowserTokens(sources, snapshot.browserTokenEdits, "[]"),
  taxonomy,
);
const identityAndValue = (tokens: ReturnType<typeof projectBrowserTokens>) =>
  tokens.map(({ id, name, value }) => ({ id, name, value }));
assert.deepEqual(
  identityAndValue(incompatibleTokens),
  identityAndValue(baselineTokens),
  "Tier diagnostics do not rename, remove, or change existing token values.",
);
const collisionSource = incompatibleTokens.find(
  (token) => token.projection?.tierIssues?.length,
)!;
const collisionTokens = projectBrowserTokens(
  [collisionSource.id, "tier-collision"].map((id) => ({
    ...collisionSource,
    id,
    classificationOverride: collisionSource.projection!.classification,
  })),
  incompatible.taxonomy!,
);
assert.ok(
  collisionTokens.every((token) =>
    token.projection!.issues.some((issue) =>
      issue.startsWith("Serialized name collision"),
    ),
  ),
  "Tier warnings must not bypass existing name-collision checks.",
);
assert.ok(
  buildTshirtArtifacts(incompatible).semantics.length,
  "Tier diagnostics do not remove usable primitive references.",
);
const incompatibleRows = canonicalAliasRows(
  completeAliasSource(incompatible),
  buildTshirtArtifacts(incompatible),
  "preserve-for-review",
);
const incompatibleRow = incompatibleRows.find(
  (row) => row.token.projection?.tierIssues?.length,
)!;
assert.ok(incompatibleRow);
const diagnosticDraft = createDialogDraft(
  incompatibleRow.token,
  incompatibleRow.context,
);
diagnosticDraft.description = "Keep the existing classification for review.";
assert.doesNotThrow(() =>
  commitDialogDraft(
    diagnosticDraft,
    incompatibleRows,
    incompatibleEdits,
    incompatible.taxonomy!,
  ),
);
const property = category("property");
const differentProperty = taxonomy.terms.find(
  (term) =>
    term.categoryId === property.id &&
    term.id !== incompatibleRow.token.projection!.classification[property.id],
)!;
assert.ok(differentProperty);
diagnosticDraft.classification = {
  ...incompatibleRow.token.projection!.classification,
  [property.id]: differentProperty.id,
};
assert.throws(
  () =>
    commitDialogDraft(
      diagnosticDraft,
      incompatibleRows,
      incompatibleEdits,
      incompatible.taxonomy!,
    ),
  /does not apply/,
  "An existing diagnostic must not allow a new incompatible term.",
);

// Manual tiers survive switching between literal and reference assignments.
for (const tier of TOKEN_TIERS) {
  const terms =
    tier === "primitive" ? family : assignment("interactiveContext");
  const edits = createNewTokenEdit(
    taxonomy,
    { tier, type: "colors", terms },
    {},
    [],
  );
  const [id, edit] = Object.entries(edits)[0];
  assert.equal(edit.authoring?.manual?.tier, tier);
  edit.authoring!.assignments["[]"] = { kind: "literal", value: "#123456" };
  const literal = projectBrowserTokens(
    resolveBrowserTokens(sources, edits, "[]", { includeManual: true }),
    taxonomy,
  ).find((token) => token.id === id)!;
  assert.equal(literal.tier, tier);
  edit.authoring!.assignments["[]"] = {
    kind: "reference",
    targetId: sources.find((source) => source.type === "colors")!.id,
  };
  const reference = projectBrowserTokens(
    resolveBrowserTokens(sources, edits, "[]", { includeManual: true }),
    taxonomy,
  ).find((token) => token.id === id)!;
  assert.equal(reference.tier, tier);
  assert.deepEqual(
    reference.projection?.classification,
    literal.projection?.classification,
  );
}

// Migration preserves unknown manual tiers, IDs, and independent baselines.
const legacy = {
  ...snapshot,
  taxonomy: {
    ...taxonomy,
    categories: taxonomy.categories.map((category, index) => {
      const item = { ...category };
      delete item.allowedTokenTiers;
      return {
        ...item,
        appliesTo: index === 0 ? "raw" : index === 1 ? "purpose" : "both",
      };
    }),
  },
  browserTokenEdits: {
    ...snapshot.browserTokenEdits,
    unknown: {
      values: {},
      authoring: {
        assignments: {},
        manual: { type: "colors", unit: "", groupId: "manual-colors" },
      },
    },
    semantic: {
      values: {},
      authoring: {
        assignments: {},
        manual: {
          type: "spacing",
          unit: "px",
          groupId: "manual-spacing",
          scope: "structures",
        },
      },
    },
  },
};
const upgraded = upgradeTokenTierData(legacy);
assertStoredSnapshot(upgraded);
assert.ok(upgraded.browserTokenEdits);
assert.deepEqual(upgraded.taxonomy!.categories[0].allowedTokenTiers, [
  "primitive",
]);
assert.deepEqual(upgraded.taxonomy!.categories[1].allowedTokenTiers, [
  "semantic",
  "component",
]);
assert.equal(upgraded.taxonomy!.categories[2].allowedTokenTiers, undefined);
assert.equal(
  upgraded.browserTokenEdits.unknown.authoring?.manual?.tier,
  undefined,
);
assert.equal(
  upgraded.browserTokenEdits.semantic.authoring?.manual?.tier,
  "semantic",
);
assert.deepEqual(upgradeTokenTierData(upgraded), upgraded);
assert.equal(
  "appliesTo" in legacy.taxonomy.categories[0],
  true,
  "Input is not mutated.",
);
const unknown = projectBrowserTokens(
  resolveBrowserTokens([], upgraded.browserTokenEdits, "[]", {
    includeManual: true,
  }),
  upgraded.taxonomy!,
);
assert.ok(
  unknown
    .find((token) => token.id === "unknown")!
    .projection!.issues.some((issue) => issue.includes("unclassified")),
);

// Authoring comparison counts tier metadata, not generated values.
const before = structuredClone(snapshot);
const after = structuredClone(snapshot);
const manualEdits = createNewTokenEdit(
  taxonomy,
  { tier: "semantic", type: "colors", terms: assignment("interactiveContext") },
  {},
  [],
);
const manualId = Object.keys(manualEdits)[0];
before.browserTokenEdits = {
  ...before.browserTokenEdits,
  ...manualEdits,
};
before.browserTokenEdits[manualId].authoring!.assignments["[]"] = {
  kind: "literal",
  value: "#123456",
};
after.browserTokenEdits = structuredClone(before.browserTokenEdits);
const id = manualId;
after.browserTokenEdits[id].authoring!.manual!.tier = "component";
const fields = compareAuthoring(before, after)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields);
assert.equal(fields.length, 1);
assert.equal(fields[0].address?.path.at(-1), "tier");
assert.equal(fields[0].after, "component");
assert.ok(fields[0].address);
const compare = (working: typeof snapshot) =>
  computeComparison(
    { shipped: before, working, attachments: {} },
    () => undefined,
  );
const unchangedImpact = compare(before);
const retieredImpact = compare(after);
assert.equal(unchangedImpact.tokens.status, "ready");
assert.equal(retieredImpact.tokens.status, "ready");
assert.deepEqual(
  retieredImpact.tokens,
  unchangedImpact.tokens,
  "Tier metadata does not change generated values, identities, or Impact records.",
);
assert.equal(retieredImpact.componentImpact.status, "ready");
assert.deepEqual(
  retieredImpact.componentImpact,
  unchangedImpact.componentImpact,
  "Retiering does not affect component values or their denominator.",
);
after.platforms[0].name = "Keep unrelated tier-test edit";
const reset = prepareChangeReset(
  { ...after, attachments: {} },
  sourceResetPlan("Restore tier", [fields[0].address]),
);
assert.equal(
  readPath(reset, fields[0].address.path),
  readPath(snapshot, fields[0].address.path),
);
assert.equal(reset.platforms[0].name, "Keep unrelated tier-test edit");
const beforeTierReset = resolveBrowserTokens(
  [],
  after.browserTokenEdits,
  "[]",
  { includeManual: true },
);
assert.ok(reset.browserTokenEdits);
assert.equal(
  beforeTierReset.find((token) => token.id === id)?.tier,
  "component",
);
assert.equal(
  resolveBrowserTokens(beforeTierReset, reset.browserTokenEdits, "[]").find(
    (token) => token.id === id,
  )?.tier,
  undefined,
  "A reset must not retain tier metadata from an older resolved source.",
);
const categoryEdit = structuredClone(snapshot);
categoryEdit.taxonomy!.categories[0].allowedTokenTiers = ["primitive"];
const restriction = compareAuthoring(snapshot, categoryEdit)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find((field) => field.address?.path.at(-1) === "allowedTokenTiers");
assert.ok(restriction?.address);
const resetCategory = prepareChangeReset(
  { ...categoryEdit, attachments: {} },
  sourceResetPlan("Restore category tiers", [restriction.address]),
);
assert.deepEqual(resetCategory.taxonomy, snapshot.taxonomy);

// Dialog commits reject newly incompatible terms without changing the saved edits.
const manual = after.browserTokenEdits[id];
manual.authoring!.assignments["[]"] = { kind: "literal", value: "#123456" };
const working = { ...snapshot, browserTokenEdits: after.browserTokenEdits };
const rows = canonicalAliasRows(
  completeAliasSource(working),
  bundle,
  "preserve-for-review",
);
const row = rows.find((item) => item.token.id === id)!;
assert.ok(row);
const draft = createDialogDraft(row.token, row.context);
const retier = { ...draft, tier: "semantic" as const };
const retiered = commitDialogDraft(
  retier,
  rows,
  working.browserTokenEdits,
  taxonomy,
);
assert.equal(retiered[id].authoring?.manual?.tier, "semantic");
assert.equal(
  working.browserTokenEdits[id].authoring?.manual?.tier,
  "component",
);
draft.classification = { ...row.token.projection!.classification, ...family };
assert.throws(
  () => commitDialogDraft(draft, rows, working.browserTokenEdits, taxonomy),
  /does not apply/,
);
assert.equal(working.browserTokenEdits[id], manual);
for (const item of rows)
  assert.deepEqual(
    item.token.projection?.issues,
    [],
    `${item.name}: ${item.token.projection?.issues.join(" ")}`,
  );
const packet = buildCanonicalTaxonomyExport(taxonomy, rows, snapshot.aliases!);
assert.ok(rows.every((row) => isTokenTier(row.token.tier)));
assert.ok(
  packet.tokens.every((token) => !Object.hasOwn(token, "tier")),
  "Authoring tiers are not extra fields in the canonical token wire format.",
);
assert.equal(rows.find((item) => item.id === row.id)?.token.tier, "component");
assert.deepEqual(
  packet.tokens.find((token) => token.conceptId === row.id)?.name,
  row.canonicalName,
);

// Persisted envelopes upgrade saved and working data independently.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  },
});
const saved = structuredClone(working);
saved.browserTokenEdits[id].authoring!.manual!.tier = "semantic";
writeAuthoringRecord({
  version: AUTHORING_RECORD_VERSION,
  working,
  saved,
  isEditing: true,
  attachments: {},
  savedAttachments: {},
});
const record = readAuthoringRecord(assertStoredSnapshot);
assert.ok(record?.working.browserTokenEdits && record.saved.browserTokenEdits);
assert.equal(
  record?.working.browserTokenEdits[id].authoring?.manual?.tier,
  "component",
);
assert.equal(
  record?.saved.browserTokenEdits[id].authoring?.manual?.tier,
  "semantic",
);
storage.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 23,
    working: legacy,
    saved,
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  }),
);
const migrated = readAuthoringRecord(assertStoredSnapshot, (input) => input);
assert.ok(
  migrated?.working.browserTokenEdits && migrated.saved.browserTokenEdits,
);
assert.equal(migrated?.version, AUTHORING_RECORD_VERSION);
assert.equal(
  migrated?.working.browserTokenEdits.semantic.authoring?.manual?.tier,
  "semantic",
);
assert.equal(
  migrated?.working.browserTokenEdits.unknown.authoring?.manual?.tier,
  undefined,
);
assert.equal(
  migrated?.saved.browserTokenEdits[id].authoring?.manual?.tier,
  "semantic",
);
Reflect.deleteProperty(globalThis, "window");
console.log("Token tier checks passed.");
