// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
} from "../src/features/edit-session/state";
import { upgradeStylesSnapshot } from "../src/features/edit-session/stylesUpgrade";
import { EMPTY_STYLES, type StyleRecipe } from "../src/features/styles/model";
import {
  registerStyleName,
  STYLE_CATEGORY_ID,
} from "../src/features/styles/vocabulary";
import {
  buildStylesForSource,
  styleContexts,
} from "../src/features/styles/artifacts";
import { synchronizeStylePublications } from "../src/features/styles/generation";
import {
  canonicalAliasRows,
  canonicalStyleAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { canonicalBaseAliasRows } from "../src/features/tokens/baseAliasRows";
import { compareAuthoring } from "../src/features/changelog/registry";
import { isRule } from "../src/features/logic/model";
import { canonicalTokenRecord } from "../src/features/taxonomy/export";
import { componentTokenCatalog } from "../src/features/components/references";
import { compareSemanticTokens } from "../src/features/changelog/tokenComparison";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { leafElements } from "../src/features/structures/children";

for (const file of [
  "../src/features/styles/artifacts.ts",
  "../src/features/tokens/baseAliasRows.ts",
]) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*\/aliasTargets["']/,
    "Style construction and base rows must not depend on the aggregate catalog.",
  );
}

const saved = createDefaultSnapshot();
saved.styles = structuredClone(EMPTY_STYLES);
for (const structure of saved.structures!.structures)
  for (const element of leafElements(structure)) delete element.textStyle;
assertStoredSnapshot(saved);
assert.deepEqual(saved.styles, EMPTY_STYLES);
const legacy = structuredClone(saved);
delete legacy.styles;
legacy.taxonomy!.categories = legacy
  .taxonomy!.categories.filter(
    (category) =>
      category.id !== STYLE_CATEGORY_ID &&
      category.scopes.some((scope) => scope !== "styles"),
  )
  .map((category) => ({
    ...category,
    scopes: category.scopes.filter((scope) => scope !== "styles"),
  }));
legacy.taxonomy!.order = legacy.taxonomy!.order.filter((id) =>
  legacy.taxonomy!.categories.some((category) => category.id === id),
);
legacy.taxonomy!.terms = legacy.taxonomy!.terms.filter((term) =>
  legacy.taxonomy!.categories.some(
    (category) => category.id === term.categoryId,
  ),
);
const upgraded = upgradeStylesSnapshot(legacy);
assert.deepEqual(upgraded.styles, EMPTY_STYLES);
assertStoredSnapshot(upgraded);
assert.deepEqual(upgradeStylesSnapshot(upgraded), upgraded);
const named = registerStyleName(saved.taxonomy!, "integration-accent");
const source = { ...saved, taxonomy: named.taxonomy };
const contexts = styleContexts(source);
const reference = contexts[0].references.find(
  (reference) => reference.property === "color",
)!;
assert(
  reference,
  "Shared primitive source catalog supplies Styles references.",
);
const recipe: StyleRecipe = {
  id: crypto.randomUUID(),
  kind: "background",
  name: named.name,
  classification: {},
  appearance: { color: { kind: "single", binding: { $ref: reference.id } } },
  options: [],
  differences: {},
  applications: [],
};
const styles = synchronizeStylePublications(
  { ...structuredClone(EMPTY_STYLES), recipes: [recipe] },
  contexts,
  source.rules!,
);
const working = { ...source, styles };
assert.deepEqual(
  buildTshirtArtifacts(working).semantics.map(({ conceptId, token }) => ({
    conceptId,
    token,
  })),
  buildTshirtArtifacts(saved).semantics.map(({ conceptId, token }) => ({
    conceptId,
    token,
  })),
  "Styles do not alter Structure output or become Structure primitive inputs.",
);
const output = buildStylesForSource(working);
assert.deepEqual(output.issues, []);
assert.equal(output.rows.length, contexts.length);
assert.equal(new Set(output.rows.map((row) => row.conceptId)).size, 1);
const aliases = canonicalAliasRows(completeAliasSource(working));
const canonicalSource = completeAliasSource(working);
const defaultSelection = Object.fromEntries(
  working.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
);
for (const options of [
  {},
  { excludeColors: true },
  { includeUnpublished: true, selections: [defaultSelection] },
]) {
  const baseRows = canonicalBaseAliasRows(
    canonicalSource,
    undefined,
    "preserve-for-review",
    options,
  );
  const aggregate = canonicalAliasRows(
    canonicalSource,
    undefined,
    "preserve-for-review",
    options,
  );
  assert.deepEqual(
    canonicalAliasRows(canonicalSource, undefined, "preserve-for-review", {
      ...options,
      excludeStyles: true,
    }),
    baseRows,
    "Excluding Styles retains the complete non-Style catalog and its order.",
  );
  const referenceRows = options.excludeColors
    ? canonicalBaseAliasRows(
        canonicalSource,
        undefined,
        "preserve-for-review",
        {
          includeUnpublished: options.includeUnpublished,
          selections: options.selections,
        },
      )
    : baseRows;
  assert.deepEqual(
    aggregate.filter((row) => row.token.style),
    canonicalStyleAliasRows(
      canonicalSource,
      referenceRows,
      buildStylesForSource(working, options.selections),
    ),
    "Styles retain their resolved references even when aggregate color rows are excluded.",
  );
  assert.deepEqual(
    aggregate.filter((row) => !row.token.style),
    baseRows,
    "Style assembly preserves non-Style rows without changing values or identities.",
  );
}
assert.deepEqual(
  aliases
    .filter((row) => row.token.style && row.token.validationError)
    .map((row) => ({
      name: row.name,
      referenceId: row.token.referenceId,
      error: row.token.validationError,
      sourceId: row.token.style!.referenceId,
    })),
  [],
);
assertStoredSnapshot(working);
assert.equal(aliases.filter((row) => row.token.style).length, contexts.length);
assert(output.rows.every((row) => row.token.$ref));
for (const row of aliases.filter((row) => row.token.style)) {
  const record = canonicalTokenRecord(row, aliases);
  assert("$ref" in record);
  assert(
    aliases.some((target) => target.rowId === record.$ref),
    "Every emitted alias resolves an emitted token row.",
  );
}
assert.equal(
  componentTokenCatalog(working).filter((token) => token.ownerId === recipe.id)
    .length,
  contexts.length,
);
const compared = compareSemanticTokens(
  saved,
  working,
  compareAuthoring(saved, working),
);
const records = compared.records.filter((row) =>
  output.rows.some((token) => token.conceptId === row.tokenId),
);
assert.equal(
  records.length,
  1,
  "One authored single-color style creates one semantic concept.",
);
assert.equal(records[0].modeValues.length, contexts.length);
assert(
  compareAuthoring(saved, working)
    .groups.flatMap((group) => group.items)
    .some((item) => item.sourceKind === "style"),
);
const restored = upgradeStylesSnapshot(structuredClone(working));
assert.deepEqual(restored.styles.publications, styles.publications);
const conditional = working.rules!.find((rule) => rule.type === "conditional")!;
assert(isRule(conditional));
assert(
  !isRule({
    ...conditional,
    outputs: [{ id: "output", classification: null }],
  }),
);
assert(
  !isRule({
    ...conditional,
    outputs: [
      { id: "duplicate", classification: {} },
      { id: "duplicate", classification: {} },
    ],
  }),
);
const override = structuredClone(working);
const target = output.rows[0];
override.browserTokenEdits![target.conceptId] = {
  values: {},
  authoring: {
    assignments: { [target.modeKey]: { kind: "literal", value: "#aa0000" } },
  },
};
const effective = canonicalAliasRows(completeAliasSource(override));
const effectiveStyle = effective.find(
  (row) => row.rowId === target.token.uuid,
)!;
assert.equal(effectiveStyle.token.value, "#aa0000");
const overriddenRecord = canonicalTokenRecord(effectiveStyle, effective);
assert("value" in overriddenRecord);
assert.equal(overriddenRecord.value, "#aa0000");
assert(
  !("$ref" in overriddenRecord),
  "An explicit semantic override exports a literal, not a stale alias.",
);
assert.equal(
  componentTokenCatalog(override).find(
    (token) => token.id === target.token.uuid,
  )?.value,
  "#aa0000",
);
const invalidOverride = structuredClone(working);
invalidOverride.browserTokenEdits![target.conceptId] = {
  values: {},
  authoring: {
    assignments: {
      [target.modeKey]: { kind: "literal", value: "invalid-color(" },
    },
  },
};
assert.throws(
  () => componentTokenCatalog(invalidOverride),
  /color|invalid|value/i,
);
const lineReference = contexts[0].references.find(
  (entry) => entry.property === "lineHeight",
);
assert(
  lineReference?.metricId,
  "Real Typography sources expose whole unitless line-height scales.",
);
console.log(
  "Styles defaults, migration idempotence, all-mode catalogs, durable identities and Changes registration passed.",
);
