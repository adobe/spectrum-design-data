// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
  cancelEditAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
  resetAllAuthoringAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import { upgradeStylesSnapshot } from "../src/features/edit-session/stylesUpgrade";
import {
  encodeStructureSource,
  decodeStructureSource,
} from "../src/features/edit-session/structureSourceCodec";
import { EMPTY_STYLES } from "../src/features/styles/model";
import {
  buildStylesForSource,
  styleContexts,
} from "../src/features/styles/artifacts";
import { buildStyleArtifacts } from "../src/features/styles/generation";
import {
  removeStyleAtom,
  saveStyleAtom,
  stylesDocumentAtom,
  textStyleSourceAtom,
} from "../src/features/styles/state";
import {
  resolveTextStyleAppearance,
  structureTextStyleIssues,
  textStyleReferenceIssues,
} from "../src/features/styles/textAppearance";
import { isStructureElement } from "../src/features/structures/elements";
import { leafElements } from "../src/features/structures/children";
import { resolveElements } from "../src/features/structures/elementResolution";
import { updateElementAtom } from "../src/features/structures/elementState";
import { structuresDocumentAtom } from "../src/features/structures/state";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { canonicalTokenRecord } from "../src/features/taxonomy/export";
import { compareAuthoring } from "../src/features/changelog/registry";
import {
  sourceResetPlan,
  prepareChangeReset,
} from "../src/features/changelog/resetPlans";
import { readPath } from "../src/features/changelog/contract";
import { createLocalVariantProperty } from "../src/features/option-groups/model";
import { emptyStructureEditor } from "../src/features/structures/variants";

const defaults = createDefaultSnapshot();
assertStoredSnapshot(defaults);
const styles = defaults.styles!;
const named = (name: string) =>
  styles.recipes.find((recipe) =>
    defaults.taxonomy!.terms.some(
      (term) =>
        term.id === recipe.name.termId && term.value === name.toLowerCase(),
    ),
  )!;
const definitions = [
  ["Body", 400, "gray-800", "body"],
  ["Component", 400, "gray-800", "component"],
  ["Detail", 500, "gray-600", "heading"],
  ["Title", 700, "gray-900", "heading"],
  ["Heading", 700, "gray-900", "heading"],
  ["Description", 400, "gray-700", "component"],
] as const;
assert.equal(styles.recipes.length, definitions.length);
const contexts = styleContexts(defaults);
const output = buildStyleArtifacts(
  styles,
  defaults.taxonomy!,
  defaults.rules!,
  defaults.modeSets,
  contexts,
);
assert.deepEqual(output.issues, []);
assert(output.rows.length > 0);
assert(
  output.rows
    .filter((row) => row.property === "lineHeight")
    .every((row) => row.name.includes("unitless-line-height")),
);
assert.equal(
  new Set(output.rows.map((row) => `${row.modeKey}:${row.name}`)).size,
  output.rows.length,
  "Style roles and weights have distinct semantic names in each mode.",
);
for (const [name, weight, color, metric] of definitions) {
  const recipe = named(name);
  assert(recipe, name);
  assert.equal(recipe.kind, "text");
  assert.deepEqual(recipe.appearance.fontWeight, { value: weight });
  assert.equal(recipe.appearance.fontFamily, undefined);
  assert(!("fontSize" in recipe.appearance));
  assert.equal(
    recipe.appearance.lineHeight?.metricId,
    `${metric}-unitlessLineHeight`,
  );
  const colorBinding = recipe.appearance.color;
  assert(colorBinding.kind === "single");
  const referenceId = colorBinding.binding.$ref;
  assert(typeof referenceId === "string");
  assert.equal(
    contexts[0].references.find((row) => row.id === referenceId)?.name,
    color,
  );
  assert.deepEqual(recipe.applications, []);
}
const component = named("Component"),
  description = named("Description");
const weight = component.options[0];
assert(weight.kind === "variant");
assert.deepEqual(
  weight.options.map((option) => option.name),
  ["Regular", "Medium", "Bold"],
);
const text = defaults.structures!.structures.find((structure) =>
  leafElements(structure).some(
    (element) => element.id === "74d52e1c-4358-4f80-811c-77f5dc57b84e",
  ),
)!;
const [primary, secondary] = leafElements(text);
assert.equal(primary.textStyle?.recipeId, component.id);
assert.equal(secondary.textStyle?.recipeId, description.id);
assert.deepEqual(
  structureTextStyleIssues(defaults.structures!.structures, styles),
  [],
);
assert(isStructureElement(primary));
assert(!isStructureElement({ ...primary, kind: "visual" }));
assert(
  !isStructureElement({
    ...primary,
    textStyle: { ...primary.textStyle, extra: true },
  }),
);
assert(
  !isStructureElement({
    ...primary,
    textStyle: { recipeId: "missing", options: {} },
  }),
);
assert(
  textStyleReferenceIssues(
    { recipeId: crypto.randomUUID(), options: {} },
    styles,
  ).length,
);
assert(
  textStyleReferenceIssues(
    { recipeId: component.id, options: { [weight.id]: crypto.randomUUID() } },
    styles,
  ).length,
);

for (const context of contexts) {
  const source = {
    document: styles,
    artifacts: output,
    modeKey: canonicalTokenModeKey(context.selection),
  };
  const family = context.references.filter(
    (row) => row.metricId === "component-unitlessLineHeight",
  );
  assert(family.length);
  for (const row of family) {
    const resolved = resolveTextStyleAppearance(
      secondary.textStyle!,
      source,
      row.index,
    );
    assert.deepEqual(resolved.issues, []);
    assert.equal(resolved.appearance.lineHeight, row.value);
    assert.equal(resolved.appearance.fontWeight, 400);
    assert.equal(resolved.appearance.fontFamily, undefined);
  }
  for (const [index, option] of weight.options.entries()) {
    const resolved = resolveTextStyleAppearance(
      { recipeId: component.id, options: { [weight.id]: option.id } },
      source,
      family[0].index,
    );
    assert.deepEqual(resolved.issues, []);
    assert.equal(resolved.appearance.fontWeight, [400, 500, 700][index]);
  }
  assert(
    resolveTextStyleAppearance(secondary.textStyle!, source, undefined).issues
      .length,
  );
}
const portable = encodeStructureSource(defaults);
assert.deepEqual(
  decodeStructureSource(JSON.parse(JSON.stringify(portable))),
  defaults,
);
const configured = structuredClone(defaults);
const configuredText = configured.structures!.structures.find(
  (entry) => entry.conceptId === text.conceptId,
)!;
const treatment = createLocalVariantProperty("Text treatment");
const unstyled = { ...primary };
delete unstyled.textStyle;
configuredText.editor = {
  ...emptyStructureEditor(),
  properties: [treatment],
  overrides: {
    [treatment.options[1].id]: { elements: { [primary.id]: unstyled } },
  },
};
const configuredPortable = encodeStructureSource(configured);
assert.deepEqual(
  decodeStructureSource(JSON.parse(JSON.stringify(configuredPortable))),
  configured,
  "Complete option snapshots preserve an explicit removal of the base Text Style.",
);
const legacy = structuredClone(defaults);
delete legacy.styles;
for (const structure of legacy.structures!.structures)
  for (const element of leafElements(structure)) delete element.textStyle;
assert.deepEqual(upgradeStylesSnapshot(legacy).styles, EMPTY_STYLES);
assert.deepEqual(
  upgradeStylesSnapshot(upgradeStylesSnapshot(legacy)),
  upgradeStylesSnapshot(legacy),
);

const store = createStore();
store.set(restoreAuthoringSnapshotAtom, defaults);
const references = store.get(primitiveReferencesAtom);
for (const [element, step] of [
  [primary, 100],
  [secondary, 75],
] as const) {
  const binding = element.bindings.find(
    (binding) => binding.slot === "fontSize",
  );
  assert(binding && "$ref" in binding);
  assert.equal(
    references.find((reference) => reference.id === binding.$ref)?.step,
    step,
  );
}
const source = store.get(textStyleSourceAtom);
const incompleteSource = {
  ...source,
  artifacts: {
    ...source.artifacts,
    rows: source.artifacts.rows.filter(
      (row) => row.recipeId !== description.id || row.property !== "fontWeight",
    ),
  },
};
assert(
  resolveTextStyleAppearance(
    secondary.textStyle!,
    incompleteSource,
    75,
  ).issues.includes("The Text Style fontWeight is unavailable."),
  "Missing authored appearance must be a diagnostic, not a silent fallback.",
);
const resolve = () =>
  resolveElements(
    store
      .get(structuresDocumentAtom)
      .structures.find((entry) => entry.conceptId === text.conceptId)!,
    store.get(primitiveReferencesAtom),
    defaults.rules!,
    "m",
    store.get(textStyleSourceAtom),
  );
const before = resolve();
assert.deepEqual(
  before.flatMap((entry) => entry.issues),
  [],
);
for (const entry of before) {
  const font = entry.targets.find(
    (target) => target.binding.slot === "fontSize",
  )!;
  assert.notEqual(font.reference.index, font.reference.step);
  assert.equal(
    entry.styles.lineHeight,
    resolveTextStyleAppearance(
      entry.element.textStyle!,
      source,
      font.reference.step,
    ).appearance.lineHeight,
  );
}
const missing = resolveElements(text, references, defaults.rules!);
assert(
  missing.every((entry) =>
    entry.issues.includes("Text Style appearance is unavailable."),
  ),
);
assert(missing.every((entry) => entry.styles.lineHeight === undefined));
const geometry = buildTshirtArtifacts(defaults);
const primitiveOnlyIndices = structuredClone(defaults);
primitiveOnlyIndices.taxonomy!.categories.find(
  (category) => category.key === "scaleIndex",
)!.allowedTokenTiers = ["primitive"];
assert.deepEqual(
  buildTshirtArtifacts(primitiveOnlyIndices),
  geometry,
  "Allowing semantic Style indices must not alter existing Structure output.",
);
store.set(enterEditModeAtom);
store.set(saveStyleAtom, {
  ...description,
  appearance: {
    ...description.appearance,
    color: { kind: "single", binding: { value: "#123456" } },
  },
});
const working = store.get(authoringSourceSnapshotAtom);
const after = resolve();
assert.deepEqual(after[0].styles, before[0].styles);
assert.equal(after[1].styles.color, "rgb(18, 52, 86)");
assert.equal(after[1].styles.fontSize, before[1].styles.fontSize);
assert.equal(after[1].styles.lineHeight, before[1].styles.lineHeight);
assert.deepEqual(
  buildTshirtArtifacts(working),
  geometry,
  "Style changes do not regenerate geometry or semantic size concepts.",
);
assert.deepEqual(
  store.get(stylesDocumentAtom).publications,
  styles.publications,
);
const aliases = canonicalAliasRows(completeAliasSource(working));
const colorRows = aliases.filter(
  (row) =>
    row.token.style?.recipeId === description.id &&
    row.canonicalName?.property === "color",
);
assert(colorRows.length);
for (const row of colorRows) {
  assert.equal(row.token.value, "rgb(18, 52, 86)");
  const exported = canonicalTokenRecord(row, aliases);
  assert("value" in exported && exported.value === "rgb(18, 52, 86)");
}
const items = compareAuthoring(defaults, working).groups.flatMap(
  (group) => group.items,
);
const field = items
  .find(
    (item) =>
      item.sourceKind === "style" &&
      item.fields.some((field) =>
        field.address?.path.some(
          (part) =>
            typeof part === "object" &&
            "id" in part &&
            part.id === description.id,
        ),
      ),
  )
  ?.fields.find((field) => field.address?.path.includes("appearance"));
assert(field?.address);
const reset = prepareChangeReset(
  { ...working, attachments: {} },
  sourceResetPlan("Restore Description appearance", [field.address]),
);
assert.deepEqual(
  readPath(reset, field.address.path),
  readPath(defaults, field.address.path),
);
assert.throws(() => store.set(removeStyleAtom, description.id), /referenc/i);
store.set(saveEditAtom);
store.set(enterEditModeAtom);
store.set(updateElementAtom, {
  structureId: text.conceptId,
  elementId: primary.id,
  textStyle: {
    recipeId: component.id,
    options: { [weight.id]: weight.options[2].id },
  },
});
assert.equal(resolve()[0].styles.fontWeight, 700);
assert.throws(
  () =>
    store.set(updateElementAtom, {
      structureId: text.conceptId,
      elementId: primary.id,
      slot: "lineHeight",
      value: { kind: "number", value: 2, unit: "multiplier" },
    }),
  /owns.*line height/,
);
assert.throws(
  () =>
    store.set(saveStyleAtom, {
      ...component,
      options: [{ ...weight, options: weight.options.slice(0, 2) }],
      differences: {
        [weight.options[1].id]: component.differences[weight.options[1].id],
      },
    }),
  /option.*unavailable/,
);
store.set(cancelEditAtom);
assert.equal(resolve()[0].styles.fontWeight, 400);
assert.equal(resolve()[1].styles.color, "rgb(18, 52, 86)");
store.set(enterEditModeAtom);
store.set(updateElementAtom, {
  structureId: text.conceptId,
  elementId: primary.id,
  textStyle: null,
});
const unstyledWorking = store.get(authoringSourceSnapshotAtom);
const referenceField = compareAuthoring(defaults, unstyledWorking)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find((field) => field.address?.path.at(-1) === "textStyle");
assert(referenceField?.address);
const referenceReset = prepareChangeReset(
  { ...unstyledWorking, attachments: {} },
  sourceResetPlan("Restore Text Style", [referenceField.address]),
);
assert.deepEqual(
  readPath(referenceReset, referenceField.address.path),
  primary.textStyle,
);
store.set(updateElementAtom, {
  structureId: text.conceptId,
  elementId: primary.id,
  slot: "lineHeight",
  value: { kind: "number", value: 2, unit: "multiplier" },
});
assert.equal(resolve()[0].styles.lineHeight, 2);
store.set(updateElementAtom, {
  structureId: text.conceptId,
  elementId: primary.id,
  textStyle: primary.textStyle,
  slot: "fontSize",
  referenceId: references.find(
    (reference) => reference.metricId === "font-size" && reference.step === 100,
  )!.id,
});
assert(
  !leafElements(
    store
      .get(structuresDocumentAtom)
      .structures.find((entry) => entry.conceptId === text.conceptId)!,
  )[0].bindings.some((binding) => binding.slot === "lineHeight"),
);
assert.deepEqual(
  decodeStructureSource(
    encodeStructureSource(store.get(authoringSourceSnapshotAtom)),
  ),
  store.get(authoringSourceSnapshotAtom),
);
store.set(cancelEditAtom);
store.set(enterEditModeAtom);
store.set(resetAllAuthoringAtom);
assert.deepEqual(store.get(stylesDocumentAtom), styles);
assert.deepEqual(buildStylesForSource(defaults), output);
console.log(
  "Six Text Styles, all-mode line heights/weights, shared preview/export propagation, reference guards, portable persistence, Changes resets and Save/Cancel/Reset passed.",
);
