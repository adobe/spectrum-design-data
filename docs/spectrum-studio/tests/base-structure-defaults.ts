// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  assertTshirtGraph,
  formatTshirtName,
} from "../src/features/design-data/tshirtProfile";
import { compareAuthoring } from "../src/features/changelog/registry";
import { changeGroupsAtom } from "../src/features/changelog/state";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { FOUNDATION_MODE_ATTACHMENT_DEFAULTS } from "../src/state/view/foundationModeAttachments";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  cancelEditAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  resetAllAuthoringAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  foundationImpactSummaryAtom,
  tokenImpactSummaryAtom,
} from "../src/features/impact/state";
import { tshirtUnsavedImpactAtom } from "../src/features/design-data/tshirtState";
import {
  structureGeneration,
  structureSelection,
  structureBindingId,
} from "../src/features/structures/model";
import { resolveComposition } from "../src/features/structures/composition";
import { resolveElements } from "../src/features/structures/elementResolution";
import { appliedStructureBindings } from "../src/features/structures/generation";
import { isStructureInstance } from "../src/features/structures/children";
import {
  EMPTY_STRUCTURE_PREVIEW,
  resolveStructureOptions,
  structureEditor,
} from "../src/features/structures/variants";
import { updateStructureEditorAtom } from "../src/features/structures/variantState";
import { structuresDocumentAtom } from "../src/features/structures/state";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { updateSizeScaleAtom } from "../src/features/size/state";

const snapshot = createDefaultSnapshot();
assertStoredSnapshot(snapshot);
const catalog = snapshot.structures!.structures;
assert.equal(catalog.length, 10);
const [base, text] = catalog;
assert.equal(base.name, "Base");
assert.equal(base.conceptId, "308a6950-fb02-4e75-bf54-046a7c5f2fa6");
const editor = structureEditor(base);
const [position, horizontal, vertical] = editor.properties;
assert.equal(editor.properties.length, 3);
assert.ok(position.kind === "variant");
assert.ok(horizontal.kind === "variant");
assert.ok(vertical.kind === "variant");
assert.deepEqual(
  editor.properties.map((property) => property.name),
  ["Icon position", "Horizontal padding", "Vertical padding"],
);
assert.deepEqual(
  position.options.map((option) => option.name),
  ["Start", "End", "Both"],
);
assert.deepEqual(
  horizontal.options.map((option) => option.name),
  ["Default", "Uniform", "None"],
);
assert.deepEqual(
  vertical.options.map((option) => option.name),
  ["Default", "None"],
);
for (const property of [position, horizontal, vertical])
  assert.equal(property.defaultOptionId, property.options[0].id);
assert.deepEqual(
  structureGeneration(base).sizeTermIds,
  Object.values(SIZE_TERM_IDS),
);
assert.equal(structureGeneration(base).applications.length, 5);
assert.deepEqual(
  base.elements!.map((element) => element.kind),
  ["workflowIcon", "structureReference", "workflowIcon", "uiIcon"],
);
const textInstance = base.elements![1];
assert.ok(isStructureInstance(textInstance));
assert.deepEqual(textInstance, {
  id: "c664f132-52a1-4f10-8017-7a6a07e3149a",
  kind: "structureReference",
  structureId: text.conceptId,
});
for (const slot of ["width", "height"] as const)
  assert.deepEqual(structureSelection(base, slot), {
    value: { kind: "sizing", preset: "hug" },
  });
assert.deepEqual(
  structureSelection(base, "minHeight"),
  { $ref: "5586949f-c13c-8555-bce4-b6d694b5d981" },
  "Base min height starts at size-200 so vertical padding can be centered.",
);
for (const slot of ["minWidth", "maxWidth", "maxHeight", "elevation"] as const)
  assert.equal(structureSelection(base, slot), null);

const fresh = createStore();
const references = fresh.get(primitiveReferencesAtom);
const bundle = buildTshirtArtifacts(snapshot, "shipped");
assertTshirtGraph(bundle.tokens, undefined, ["2x-small", "2x-large"]);
assert.equal(bundle.semantics.length, 122);
const baseRows = bundle.semantics.filter(
  (row) => row.structureId === base.conceptId && !row.token.name.element,
);
assert.equal(baseRows.length, 30);
const baseLeafRows = bundle.semantics.filter(
  (row) =>
    row.structureId === base.conceptId &&
    !!row.token.name.element &&
    (Object.keys(row.context).length === 0 ||
      row.context.textScaling === "default"),
);
assert.equal(baseLeafRows.length, 10);
assert.deepEqual(
  new Map(
    baseLeafRows.map((row) => [
      row.canonicalName ?? formatTshirtName(row.token.name),
      row.target.value,
    ]),
  ),
  new Map([
    ["base-workflow-icon-size-extra-small", 14],
    ["base-workflow-icon-size-small", 16],
    ["base-workflow-icon-size-medium", 18],
    ["base-workflow-icon-size-large", 20],
    ["base-workflow-icon-size-extra-large", 22],
    ["base-ui-icon-size-extra-small", 8],
    ["base-ui-icon-size-small", 10],
    ["base-ui-icon-size-medium", 10],
    ["base-ui-icon-size-large", 12],
    ["base-ui-icon-size-extra-large", 14],
  ]),
  "Default leaf assignments emit exact, contextual element tokens across the five generated sizes.",
);
assert.ok(
  baseLeafRows.every(
    (row) =>
      !("$ref" in row.token) &&
      row.context &&
      (Object.keys(row.context).length === 0 ||
        row.context.textScaling === "default"),
  ),
  "Generated leaf semantics contain resolved values, never primitive references.",
);
assert.deepEqual(
  baseLeafRows.find((row) => row.token.name.element === "workflow-icon")!
    .bindingIds,
  [
    "e9119b47-25de-8a92-b1e7-9130aa3b41fe",
    "c90f2fe6-6cfd-8494-b8a5-7d27a458f896",
  ],
  "Equivalent repeated workflow icons share one generated semantic row.",
);
const listItemIds = new Set(
  catalog
    .filter((structure) =>
      [
        "List-item",
        "Vertical padding",
        "Content layout",
        "Content start",
        "Content end",
      ].includes(structure.name),
    )
    .map((structure) => structure.conceptId),
);
const listItem = catalog.find((structure) => structure.name === "List-item")!;
const listItemLeafRows = bundle.semantics.filter(
  (row) => row.structureId === listItem.conceptId && !!row.token.name.element,
);
assert.deepEqual(
  listItemLeafRows.map((row) => [
    formatTshirtName(row.token.name),
    row.token.value,
    row.bindingIds,
  ]),
  [
    [
      "list-ui-icon-size-medium",
      "10px",
      [
        "9bb40a57-a9c2-8337-a3df-2a946149bfb2",
        "5a8cfb38-01c9-8e14-bd8e-03e8bb1490bc",
      ],
    ],
    [
      "list-ui-icon-size-large",
      "10px",
      [
        "9bb40a57-a9c2-8337-a3df-2a946149bfb2",
        "5a8cfb38-01c9-8e14-bd8e-03e8bb1490bc",
      ],
    ],
  ],
  "Default leaf bindings in owned layouts also produce contextual semantic output.",
);
const defaultLeafBindingIds = new Set([
  "e9119b47-25de-8a92-b1e7-9130aa3b41fe",
  "c90f2fe6-6cfd-8494-b8a5-7d27a458f896",
  "13c8888a-70d6-8fdb-84d8-1fdc767d58a9",
  "006f34de-1661-804d-81e9-1fc43a972272",
  "96feb974-25b5-8080-bd3c-c120c241d52b",
  "5eca9515-d5ae-87ea-a00e-d0feee567a13",
]);
const preserved = bundle.semantics.filter(
  (row) =>
    row.structureId !== base.conceptId &&
    !listItemIds.has(row.structureId) &&
    !row.bindingIds.some((id) => defaultLeafBindingIds.has(id)),
);
assert.equal(preserved.length, 40);
assert.equal(
  createHash("sha256").update(JSON.stringify(preserved)).digest("hex"),
  "8039eb127c3d0b201fde54d48af740bf4d5b7bd7ca329817d0354ea835e7c5d6",
  "Preserve every pre-Base Text/Accessory record, including UUIDs, references, values, contexts and provenance.",
);
const sizes = ["xs", "s", "m", "l", "xl"];
const names = ["extra-small", "small", "medium", "large", "extra-large"];
const expected = new Map<string, number>();
for (const [prefix, values, suffix] of [
  ["base-corner-radius", [4, 6, 8, 10, 12], ""],
  ["base-gap", [4, 4, 6, 6, 6], ""],
  ["base-min-height", [20, 24, 32, 40, 48], ""],
  ["base-padding-horizontal", [9, 11, 12, 14, 15], ""],
  ["base-padding-vertical", [3, 4, 7, 10, 13], ""],
  [
    "base-padding-horizontal",
    [3, 4, 7, 10, 13],
    "-horizontal-padding-horizontal-uniform",
  ],
] as const)
  names.forEach((name, index) =>
    expected.set(`${prefix}-${name}${suffix}`, values[index]),
  );
assert.deepEqual(
  new Map(
    baseRows.map((row) => [formatTshirtName(row.token.name), row.target.value]),
  ),
  expected,
  "The exact five-size Base contract has no missing or unexpected families.",
);
assert.ok(baseRows.every((row) => Object.keys(row.context).length === 0));
assert.ok(baseRows.every((row) => row.mapping.warning === undefined));
assert.equal(baseRows.filter((row) => "$ref" in row.token).length, 13);
assert.equal(baseRows.filter((row) => row.optionId).length, 5);
assert.ok(
  baseRows
    .filter((row) => row.optionId)
    .every(
      (row) =>
        row.optionId === horizontal.options[1].id &&
        row.bindingIds.length === 2,
    ),
  "Only Uniform emits sparse differences; position and no-padding options add no zero or duplicate tokens.",
);
assert.deepEqual(
  buildTshirtArtifacts(JSON.parse(JSON.stringify(snapshot)), "shipped"),
  bundle,
  "Saved variant identities survive a JSON reload without reminting output.",
);

const canonical: {
  name: { legacyKey?: string; scale?: string };
  value?: string;
  uuid: string;
  $ref?: string;
}[] = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/design-data/tokens/layout.tokens.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const iconTokens: {
  name: { legacyKey?: string; scale?: string };
  value?: string;
}[] = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/design-data/tokens/layout-component.tokens.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const [index, size] of sizes.entries()) {
  // Horizontal padding now scales by the Type scale ratio, so it intentionally differs from canonical data.
  for (const prefix of ["base-gap", "base-padding-vertical"]) {
    const name = `${prefix}-${names[index]}`;
    const token = canonical.find(
      (token) =>
        token.name.legacyKey === name &&
        (token.name.scale === undefined || token.name.scale === "desktop"),
    )!;
    assert.ok(token, `${name} exists in canonical design data.`);
    assert.equal(`${expected.get(name)}px`, token.value);
  }
  const uniformAlias = canonical.find(
    (token) =>
      token.name.legacyKey ===
      `base-padding-horizontal-uniform-${names[index]}`,
  )!;
  const target = canonical.find((token) => token.uuid === uniformAlias.$ref)!;
  assert.equal(
    `${expected.get(`base-padding-vertical-${names[index]}`)}px`,
    target.value,
  );
  const leaves = resolveElements(base, references, snapshot.rules, size);
  for (const leaf of leaves) {
    assert.deepEqual(leaf.issues, []);
    assert.deepEqual(leaf.warnings, []);
    const prefix = leaf.element.kind === "uiIcon" ? "ui-icon" : "workflow-icon";
    const token = [...canonical, ...iconTokens].find(
      (token) =>
        token.name.legacyKey === `${prefix}-${names[index]}` &&
        token.name.scale === "desktop",
    )!;
    assert.ok(
      token,
      `${prefix}-${names[index]} exists in canonical design data.`,
    );
    if (leaf.element.kind === "uiIcon")
      assert.equal(`${leaf.styles.width}px`, token.value);
    else {
      const expectedWorkflow = [14, 16, 18, 20, 22];
      assert.equal(leaf.styles.width, expectedWorkflow[index]);
    }
    assert.equal(leaf.styles.height, leaf.styles.width);
  }
  for (const iconOption of position.options)
    for (const horizontalOption of horizontal.options)
      for (const verticalOption of vertical.options) {
        const options = {
          [position.id]: iconOption.id,
          [horizontal.id]: horizontalOption.id,
          [vertical.id]: verticalOption.id,
        };
        const selected = resolveStructureOptions(base, {
          ...EMPTY_STRUCTURE_PREVIEW,
          options,
        });
        assert.deepEqual(selected.issues, []);
        const composition = resolveComposition(
          selected.structure,
          catalog,
          references,
          snapshot.rules,
          bundle,
          {},
          size,
          undefined,
          {},
          options,
        );
        assert.deepEqual(composition.issues, []);
        assert.deepEqual(
          composition.warnings,
          resolveComposition(
            text,
            catalog,
            references,
            snapshot.rules,
            bundle,
            {},
            size,
          ).warnings,
          "Base adds no warnings beyond the unchanged Text source's size boundaries.",
        );
        const visible = selected.structure.elements!;
        assert.deepEqual(
          visible.map((child) => child.id),
          [
            ...(iconOption.name !== "End" ? [base.elements![0].id] : []),
            textInstance.id,
            ...(iconOption.name !== "Start" ? [base.elements![2].id] : []),
            base.elements![3].id,
          ],
        );
        assert.equal(composition.resolved.styles.gap, [4, 4, 6, 6, 6][index]);
        const hp =
          horizontalOption.name === "None"
            ? undefined
            : horizontalOption.name === "Uniform"
              ? [3, 4, 7, 10, 13][index]
              : [9, 11, 12, 14, 15][index];
        const vp =
          verticalOption.name === "None" ? undefined : [3, 4, 7, 10, 13][index];
        assert.equal(composition.resolved.styles.paddingLeft, hp);
        assert.equal(composition.resolved.styles.paddingRight, hp);
        assert.equal(composition.resolved.styles.paddingTop, vp);
        assert.equal(composition.resolved.styles.paddingBottom, vp);
        assert.equal(
          composition.resolved.styles.borderTopLeftRadius,
          [4, 6, 8, 10, 12][index],
        );
      }
}
const uiSource = resolveElements(base, references, snapshot.rules)[2].targets[0]
  .reference.sourceId;
const uiScale = snapshot.size.scales.find((scale) => scale.id === uiSource)!;
assert.equal(uiScale.name, "UI icon".toLowerCase());
assert.equal(uiScale.hideFromPublishing, false);
assert.ok(
  references
    .filter((ref) => ref.sourceId === uiSource)
    .every((ref) => !ref.error),
);
assert.deepEqual(structureEditor(base), editor);
const noPadding = resolveStructureOptions(base, {
  ...EMPTY_STRUCTURE_PREVIEW,
  options: {
    [horizontal.id]: horizontal.options[2].id,
    [vertical.id]: vertical.options[1].id,
  },
}).structure;
assert.doesNotThrow(() => appliedStructureBindings(noPadding, snapshot.rules));
assert.deepEqual(
  structureGeneration(noPadding).applications[1].targets,
  { kind: "custom", bindingIds: ["0d911b7b-0994-8d52-bca7-6abe7b8ba874"] },
  "Resolved targets omit absent padding while authored targets remain intact.",
);
assert.deepEqual(
  structureGeneration(noPadding).applications[4].targets,
  { kind: "custom", bindingIds: [] },
  "Typed horizontal padding is pruned when its option hides it.",
);
const authoredTargets = structureGeneration(base).applications[1].targets;
assert.ok(authoredTargets.kind === "custom");
assert.equal(authoredTargets.bindingIds.length, 3);
const layoutOnly = structuredClone(base);
delete layoutOnly.generation!.applications[1].previewTargets;
const noLayoutTargets = resolveStructureOptions(layoutOnly, {
  ...EMPTY_STRUCTURE_PREVIEW,
  options: {
    [horizontal.id]: horizontal.options[2].id,
    [vertical.id]: vertical.options[1].id,
  },
}).structure;
assertStoredSnapshot({
  ...snapshot,
  structures: {
    ...snapshot.structures!,
    structures: [noLayoutTargets, ...catalog.slice(1)],
  },
});
assert.doesNotThrow(() =>
  appliedStructureBindings(noLayoutTargets, snapshot.rules),
);
const invalidTarget = structuredClone(base);
const missingId = structureBindingId(base.conceptId, "minWidth");
invalidTarget.generation!.applications[1].targets = {
  kind: "custom",
  bindingIds: [missingId],
};
const invalidResolved = resolveStructureOptions(invalidTarget).structure;
assert.deepEqual(structureGeneration(invalidResolved).applications[1].targets, {
  kind: "custom",
  bindingIds: [missingId],
});
assert.throws(
  () => appliedStructureBindings(invalidResolved, snapshot.rules),
  /no longer token-backed/,
  "Resolution does not hide an authored target that was invalid before selecting an option.",
);

const dataset = canonicalDesignSystemDataset(designSystemDefaults);
assert.deepEqual(
  canonicalDesignSystemDataset(composeDesignSystemDefaults(dataset, [])),
  dataset,
);
assert.deepEqual(fresh.get(authoringSnapshotAtom), snapshot);
assert.deepEqual(fresh.get(changeGroupsAtom), []);
assert.equal(fresh.get(foundationImpactSummaryAtom).edited.count, 0);
assert.equal(fresh.get(tokenImpactSummaryAtom).affected.count, 0);
assert.deepEqual(fresh.get(tshirtUnsavedImpactAtom), {
  added: 0,
  removed: 0,
  saved: 102,
  values: 122,
  error: "",
});
fresh.set(enterEditModeAtom);
fresh.set(updateSizeScaleAtom, { id: uiSource, patch: { base: 12 } });
assert.equal(
  compareAuthoring(snapshot, fresh.get(authoringSnapshotAtom)).slots.filter(
    (slot) => slot.changed,
  ).length,
  1,
);
assert.ok(fresh.get(foundationImpactSummaryAtom).edited.count > 0);
assert.equal(fresh.get(tokenImpactSummaryAtom).affected.count, 4);
assert.equal(
  resolveElements(base, fresh.get(primitiveReferencesAtom), snapshot.rules)[2]
    .styles.width,
  12,
  "Editing the UI Size source updates Base through the shared reference owner.",
);
const afterScaleEdit = buildTshirtArtifacts(
  fresh.get(authoringSnapshotAtom),
  "shipped",
);
assert.deepEqual(
  afterScaleEdit.semantics.filter((row) => row.target.sourceId !== uiSource),
  bundle.semantics.filter((row) => row.target.sourceId !== uiSource),
  "Changing a primitive source leaves unrelated structure semantics unchanged.",
);
assert.equal(
  afterScaleEdit.semantics.find(
    (row) =>
      row.structureId === base.conceptId &&
      row.token.name.element === "ui-icon" &&
      row.token.name.size === "m",
  )!.token.value,
  "12px",
  "Default leaf semantics update through their original primitive assignment.",
);
assert.ok(
  afterScaleEdit.semantics
    .filter(
      (row) =>
        row.structureId === listItem.conceptId &&
        row.target.sourceId === uiSource,
    )
    .every((row) => row.target.value === 12),
  "Owned-layout leaf semantics follow the same source edit.",
);
fresh.set(cancelEditAtom);
const changed = structuredClone(editor);
changed.properties[0].name = "Workflow position";
fresh.set(enterEditModeAtom);
fresh.set(updateStructureEditorAtom, {
  structureId: base.conceptId,
  editor: changed,
});
const change = fresh
  .get(changeGroupsAtom)
  .find((group) => group.id === "structures")!.items[0];
assert.equal(change.kind, "modified");
const comparison = compareAuthoring(snapshot, fresh.get(authoringSnapshotAtom));
assert.equal(comparison.slots.filter((slot) => slot.changed).length, 1);
const changedField = comparison.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find((field) => field.address)!;
assert.ok(changedField.address);
const reset = prepareChangeReset(
  {
    ...fresh.get(authoringSnapshotAtom),
    attachments: FOUNDATION_MODE_ATTACHMENT_DEFAULTS,
  },
  sourceResetPlan("Restore Base property", [changedField.address]),
);
assert.deepEqual(reset.structures, snapshot.structures);
fresh.set(restoreAuthoringSnapshotAtom, reset);
assert.deepEqual(fresh.get(structuresDocumentAtom), snapshot.structures);
fresh.set(updateStructureEditorAtom, {
  structureId: base.conceptId,
  editor: changed,
});
fresh.set(cancelEditAtom);
assert.deepEqual(fresh.get(structuresDocumentAtom), snapshot.structures);
fresh.set(enterEditModeAtom);
fresh.set(updateStructureEditorAtom, {
  structureId: base.conceptId,
  editor: changed,
});
fresh.set(saveEditAtom);
assert.deepEqual(
  fresh.get(editSessionSnapshotAtom)!.structures!.structures[0].editor,
  changed,
);
fresh.set(resetAllAuthoringAtom);
assert.deepEqual(fresh.get(authoringSnapshotAtom), snapshot);

const oldDesign = structuredClone(snapshot);
oldDesign.structures!.structures[0].elements = [textInstance];
delete oldDesign.structures!.structures[0].editor;
for (const application of oldDesign.structures!.structures[0].generation!
  .applications)
  application.previewTargets = { kind: "custom", bindingIds: [] };
const restored = createStore();
restored.set(restoreAuthoringSnapshotAtom, oldDesign);
restored.set(editSessionSnapshotAtom, oldDesign);
assert.deepEqual(
  restored.get(authoringSnapshotAtom),
  oldDesign,
  "Existing designs keep their authored Base instead of merging new defaults.",
);
console.log(
  "Base defaults: exact desktop output, 97 option/size combinations, canonical icon values, Text/Accessory preservation and lifecycle passed.",
);
