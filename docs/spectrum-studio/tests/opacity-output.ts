// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import dataset from "../src/data/design-system.defaults.json";
import { OPACITY_DEFAULTS } from "../src/features/opacity/defaults";
import {
  opacityContexts,
  resolveOpacity,
  synchronizeOpacityRows,
  type OpacitySource,
} from "../src/features/opacity/generation";
import {
  browserOpacitySources,
  buildOpacityCss,
  opacityRows,
} from "../src/features/opacity/output";
import {
  buildOpacityArtifacts,
  opacityArtifactIssues,
} from "../src/features/design-data/opacityArtifacts";
import {
  applyBrowserTokenEdits,
  resolveBrowserTokens,
  tokenValueText,
  parseBrowserTokenValue,
} from "../src/features/tokens/browserModel";
import {
  createValuePreview,
  sourceValuePreview,
  valuePreviewPresentation,
} from "../src/features/tokens/valuePreview";
import { opacityChanges, opacityFields } from "../src/features/opacity/changes";
import { restorePath } from "../src/features/changelog/contract";
import type { ColorSystemDocument } from "../src/features/color-system/model";
import type { ModeSet } from "../src/features/modes/model";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";
import {
  registerOpacityVocabulary,
  opacityTermContributions,
  opacityVocabularyIssues,
  OPACITY_PROPERTY_TERM_ID,
} from "../src/features/taxonomy/opacityGovernance";

const initialRegistry = structuredClone(
  dataset.system.taxonomy,
) as TaxonomyDocument;
const registry = registerOpacityVocabulary(initialRegistry, OPACITY_DEFAULTS);
assert.deepEqual(opacityVocabularyIssues(registry), []);
assert.equal(registerOpacityVocabulary(registry, OPACITY_DEFAULTS), registry);
assert.equal(
  registry.terms.filter((term) => term.id === OPACITY_PROPERTY_TERM_ID).length,
  1,
);
assert.equal(opacityTermContributions(OPACITY_DEFAULTS).length, 17);
const extended = structuredClone(OPACITY_DEFAULTS);
extended.levels.push({
  id: "e74376e4-acf8-45a3-b839-b8ab58e6ed82",
  value: 0.9,
  rows: {},
});
let allocations = 0;
const extendedRegistry = registerOpacityVocabulary(
  registry,
  extended,
  (value) => {
    allocations++;
    assert.equal(value, 1800, "Allocators receive the scale-index value.");
    return "cb1edb42-9aa4-439b-9499-81fc3e9ba8a1";
  },
);
assert.equal(allocations, 1);
assert.equal(
  registerOpacityVocabulary(extendedRegistry, extended),
  extendedRegistry,
);
assert.equal(opacityTermContributions(extended).at(-1)?.value, 1800);
assert.ok(
  initialRegistry.categories.every(
    (category) =>
      JSON.stringify(category.scopes) ===
      JSON.stringify(
        dataset.system.taxonomy.categories.find(
          (item) => item.id === category.id,
        )?.scopes,
      ),
  ),
  "Vocabulary registration does not mutate prior Registry snapshots.",
);
const source: OpacitySource = {
  opacity: structuredClone(OPACITY_DEFAULTS),
  colorSystem: dataset.system.foundations
    .color as unknown as ColorSystemDocument,
  modeSets: dataset.system.modeSets as unknown as ModeSet[],
  browserTokenEdits: {},
};
const contexts = opacityContexts(source);
assert.equal(
  contexts.length,
  2,
  "Unrelated mode axes never expand opacity inventory.",
);
const rows = opacityRows(source, registry);
assert.equal(rows.length, 34);
assert.equal(new Set(rows.map((row) => row.conceptId)).size, 17);
assert.equal(new Set(rows.map((row) => row.uuid)).size, 34);
assert.ok(rows.every((row) => row.issues.length === 0));
for (const context of contexts) {
  const sources = browserOpacitySources(source, context.modes, registry);
  assert.deepEqual(
    sources.map((token) => token.name),
    Array.from({ length: 17 }, (_, i) => `opacity-${(i + 1) * 100}`),
  );
  assert.equal(sources[7].value, 0.2);
  assert.equal(tokenValueText(sources[7]), "20%");
}
assert.match(buildOpacityCss(source, registry), /--opacity-800: 0\.2;/);
const artifacts = buildOpacityArtifacts({ ...source, taxonomy: registry });
assert.deepEqual(artifacts.issues, []);
assert.equal(artifacts.contract, "studio-local-opacity-v1");
assert.equal(artifacts.tokens.length, 34);
assert.ok(
  artifacts.tokens.some((token) => !("colorScheme" in token.name)),
  "Default mode omitted from cascade name.",
);
assert.ok(artifacts.tokens.some((token) => token.name.colorScheme === "dark"));
assert.deepEqual(opacityArtifactIssues(artifacts.tokens), []);
assert.ok(
  opacityArtifactIssues([{ ...artifacts.tokens[0], value: NaN }]).length,
);
assert.ok(
  buildOpacityArtifacts({ ...source, opacity: undefined, taxonomy: registry })
    .issues.length,
);
assert.deepEqual(
  buildOpacityArtifacts({ ...source, opacity: undefined, taxonomy: registry })
    .tokens,
  [],
);
assert.ok(
  opacityArtifactIssues([artifacts.tokens[0], artifacts.tokens[0]]).length,
);

const context = contexts[1];
const token = browserOpacitySources(source, context.modes, registry)[7];
assert.ok(
  Math.abs(Number(parseBrowserTokenValue(token, "23.4567%")) - 0.234567) <
    1e-14,
);
assert.equal(parseBrowserTokenValue(token, "0"), 0);
assert.equal(parseBrowserTokenValue(token, "100%"), 1);
assert.throws(() => parseBrowserTokenValue(token, "101%"));
const fullKey = JSON.stringify([
  ...JSON.parse(context.key),
  ["unrelated", "unrelated-mode"],
]);
const edits = applyBrowserTokenEdits([token], {}, [token.id], fullKey, {
  value: 0.3,
});
assert.deepEqual(Object.keys(edits[token.id].values), [context.key]);
const editedSource = { ...source, browserTokenEdits: edits };
const edited = browserOpacitySources(editedSource, context.modes, registry);
const resolved = resolveBrowserTokens(
  edited,
  {
    ...edits,
    [token.id]: {
      values: {
        ...edits[token.id].values,
        [fullKey]: { value: 0.9, baseline: 0.2 },
      },
    },
  },
  fullKey,
).find((row) => row.id === token.id)!;
assert.equal(
  resolved.value,
  0.3,
  "Already resolved opacity must not apply generic browser edits twice.",
);
assert.ok(resolved.valueOverridden);
assert.equal(
  resolveOpacity(editedSource, context.modes).levels[7].value,
  resolved.value,
);
assert.equal(
  opacityRows(editedSource, registry).find((row) => row.uuid === token.rowId)
    ?.value,
  0.3,
);
assert.match(buildOpacityCss(editedSource, registry), /--opacity-800: 0\.3;/);
const fractionalSource = structuredClone(source);
fractionalSource.opacity!.levels[7].value = 0.19212345;
fractionalSource.browserTokenEdits = {
  [token.id]: {
    values: { [context.key]: { value: 0.234567, baseline: 0.19212345 } },
  },
};
for (const mode of contexts) {
  const expected = mode.key === context.key ? 0.23 : 0.19;
  const roundedToken = browserOpacitySources(
    fractionalSource,
    mode.modes,
    registry,
  )[7];
  assert.equal(roundedToken.value, expected);
  assert.equal(tokenValueText(roundedToken), `${Math.round(expected * 100)}%`);
  assert.equal(
    opacityRows(fractionalSource, registry).find(
      (row) => row.uuid === roundedToken.rowId,
    )?.value,
    expected,
  );
}
const roundedCss = buildOpacityCss(fractionalSource, registry);
assert.match(roundedCss, /--opacity-800: 0\.19;/);
assert.match(roundedCss, /--opacity-800: 0\.23;/);
assert.ok(
  buildOpacityArtifacts({
    ...fractionalSource,
    taxonomy: registry,
  }).tokens.filter((row) => row.value === 0.19 || row.value === 0.23).length >=
    2,
);
const changed = structuredClone(editedSource);
changed.opacity!.levels[7].value = 0.21;
assert.ok(
  browserOpacitySources(changed, context.modes, registry)[7].resolvedValue
    ?.stale,
);
const reset = applyBrowserTokenEdits(edited, edits, [token.id], fullKey, {
  value: token.generatedValue,
});
assert.equal(reset[token.id]?.values[context.key], undefined);

const missing = structuredClone(source);
delete missing.opacity!.levels[0].rows[context.key];
assert.ok(
  buildOpacityArtifacts({ ...missing, taxonomy: registry }).issues.length,
);
assert.throws(() => buildOpacityCss(missing, registry), /identity/);
assert.equal(
  missing.opacity!.levels[0].rows[context.key],
  undefined,
  "Export never allocates identities.",
);
const synchronized = synchronizeOpacityRows(missing)!;
assert.ok(synchronized.levels[0].rows[context.key]);
assert.equal(
  synchronizeOpacityRows({ ...missing, opacity: synchronized }),
  synchronized,
);
const sorted = structuredClone(source);
sorted.opacity!.levels.reverse();
assert.deepEqual(
  new Set(opacityRows(sorted, registry).map((row) => row.uuid)),
  new Set(rows.map((row) => row.uuid)),
);
assert.equal(
  opacityFields(source.opacity).size,
  19,
  "17 authored alpha inputs, compensation, and shared order; row IDs are not parameters.",
);
sorted.opacity!.levels[0].value = 0.75;
const changes = opacityChanges(source.opacity, sorted.opacity);
const order = changes[0].fields.find((field) => field.key === "levelOrder")!;
const restored = restorePath(
  { opacity: sorted.opacity },
  { opacity: source.opacity },
  order.address!,
);
assert.deepEqual(
  restored.opacity!.levels.map((level) => level.id),
  source.opacity!.levels.map((level) => level.id),
);
assert.equal(
  restored.opacity!.levels.at(-1)!.value,
  0.75,
  "Order reset preserves independently edited percentages.",
);
assert.equal(sourceValuePreview(token).kind, "opacity");
assert.deepEqual(valuePreviewPresentation(createValuePreview("opacity", 0)), {
  status: "ready",
  styles: { backgroundColor: "rgb(0 0 0 / 0)" },
});
assert.equal(
  valuePreviewPresentation(createValuePreview("opacity", 2)).status,
  "unavailable",
);
console.log(
  "Opacity output: identity, scoped inventory, overrides, CSS, local artifacts, previews, and narrow order resets passed.",
);
