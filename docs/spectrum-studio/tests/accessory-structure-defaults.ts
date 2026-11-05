// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
  DatasetValidationError,
} from "../src/features/design-data/validation";
import {
  buildTshirtArtifacts,
  tshirtPreview,
} from "../src/features/design-data/tshirtArtifacts";
import {
  assertTshirtGraph,
  formatTshirtName,
} from "../src/features/design-data/tshirtProfile";
import { tshirtUnsavedImpactAtom } from "../src/features/design-data/tshirtState";
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
import { changeGroupsAtom } from "../src/features/changelog/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { scaleTypesAtom } from "../src/features/logic/scaleTypeLibrary";
import {
  assertStructureGraph,
  isStructureInstance,
  topLevelStructures,
} from "../src/features/structures/children";
import { resolveComposition } from "../src/features/structures/composition";
import { resolveElements } from "../src/features/structures/elementResolution";
import {
  assignStructure,
  structureGeneration,
  structureSelection,
} from "../src/features/structures/model";
import {
  EMPTY_STRUCTURE_PREVIEW,
  resolveStructureOptions,
  structureEditor,
} from "../src/features/structures/variants";
import {
  renameStructureAtom,
  structuresDocumentAtom,
} from "../src/features/structures/state";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { buildClassificationReviewExport } from "../src/features/taxonomy/reviewedExport";
import {
  assertGeneratedClassificationCompatibility,
  buildGeneratedClassificationCompatibility,
} from "../src/features/taxonomy/generatedReviewExport";
import { EMPTY_ALIASES } from "../src/features/tokens/aliases";

const snapshot = createDefaultSnapshot();
assertStoredSnapshot(snapshot);
const catalog = snapshot.structures!.structures;
assertStructureGraph(catalog);
assert.equal(catalog.length, 10);
const accessory = catalog.find((structure) => structure.name === "Accessory")!;
const item = catalog.find((structure) => structure.name === "Accessory item")!;
const workflow = catalog.find(
  (structure) => structure.name === "Accessory workflow item",
)!;
assert.ok(accessory && item && workflow);
assert.equal(topLevelStructures(catalog).length, 4);
assert.equal(item.parentStructureId, accessory.conceptId);
assert.equal(workflow.parentStructureId, accessory.conceptId);
const editor = structureEditor(accessory);
const presentation = editor.properties.find(
  (property) => property.kind === "variant",
)!;
assert.equal(presentation.kind, "variant");
const secondItem = editor.properties.find(
  (property) => property.kind === "boolean",
)!;
assert.equal(secondItem.kind, "boolean");
assert.equal(secondItem.defaultValue, false);
assert.deepEqual(
  presentation.options.map((option) => option.name),
  ["Default UI icon", "Workflow icon", "Affixed"],
);
assert.equal(presentation.defaultOptionId, presentation.options[0].id);
assert.equal(editor.properties.length, 2);

const fresh = createStore();
const references = fresh.get(primitiveReferencesAtom);
assert.deepEqual(fresh.get(scaleTypesAtom), snapshot.scaleTypes);
assert.deepEqual(snapshot.scaleTypes, designSystemDefaults.system.scaleTypes);
const bundle = buildTshirtArtifacts(snapshot, "shipped");
const records = canonicalAliasRows(
  completeAliasSource(snapshot),
  bundle,
  "strict",
);
assert.ok(records.some((record) => record.token.type === "opacity"));
assertTshirtGraph(bundle.tokens, undefined, ["2x-small", "2x-large"]);
assert.equal(bundle.semantics.length, 122);
const unchanged = bundle.semantics.filter(
  (row) => row.structureId === catalog[1].conceptId,
);
assert.equal(unchanged.length, 5);
assert.equal(
  createHash("sha256").update(JSON.stringify(unchanged)).digest("hex"),
  "eab8d76fd49eef611420a1e5339b550dcf4f51a049d3904a8dad674e63500184",
  "Preserve the complete pre-Accessory Text rows; Base now has its own enhanced contract.",
);
const fiveSizes = ["extra-small", "small", "medium", "large", "extra-large"];
const expected = new Map<string, number>();
for (const [prefix, sizes, values, suffix] of [
  [
    "accessory-item-padding",
    ["2x-small", ...fiveSizes],
    [2, 3, 3, 5, 7, 9],
    "",
  ],
  ["accessory-gap", [...fiveSizes, "2x-large"], [3, 4, 6, 7, 8, 9], ""],
  ["accessory-padding", [...fiveSizes, "2x-large"], [3, 4, 6, 7, 8, 9], ""],
  [
    "accessory-gap-affixed",
    [...fiveSizes, "2x-large"],
    [3, 3, 4, 5, 6, 7],
    "-accessory-presentation",
  ],
  [
    "accessory-padding-affixed",
    [...fiveSizes, "2x-large"],
    [3, 3, 4, 5, 6, 7],
    "-accessory-presentation",
  ],
  ["accessory-workflow-item-padding", fiveSizes, [2, 2, 3, 5, 7], ""],
  ["accessory-ui-icon-size", fiveSizes, [8, 10, 10, 12, 14], ""],
  ["accessory-workflow-icon-size", fiveSizes, [14, 14, 16, 18, 20], ""],
] as const) {
  sizes.forEach((size, index) =>
    expected.set(`${prefix}-${size}${suffix}`, values[index]),
  );
}
const added = bundle.semantics.filter(
  (row) =>
    (Object.keys(row.context).length === 0 ||
      row.context.textScaling === "default") &&
    [accessory, item, workflow].some(
      (structure) => structure.conceptId === row.structureId,
    ),
);
assert.equal(expected.size, 45);
assert.deepEqual(
  new Map(
    added.map((row) => [
      row.token.name.element
        ? row.canonicalName
        : formatTshirtName(row.token.name),
      row.target.value,
    ]),
  ),
  expected,
  "All required and approved supporting meanings, with no extra semantic families.",
);
for (const row of added) {
  assert.ok(
    Object.keys(row.context).length === 0 ||
      row.context.textScaling === "default",
  );
  assert.equal(
    row.bindingIds.length,
    row.token.name.element === "ui-icon"
      ? 2
      : row.token.name.element || row.token.name.property === "gap"
        ? 1
        : 4,
  );
  const literal =
    "$ref" in row.token
      ? bundle.tokens.find((token) => token.uuid === row.token.$ref)!
      : row.token;
  assert.equal("value" in literal && literal.value, `${row.target.value}px`);
}
assert.ok(
  bundle.diagnostics.every(
    (diagnostic) => diagnostic.structureId === catalog[1].conceptId,
  ),
  "Preserve the existing Text gap diagnostics.",
);
assert.deepEqual(
  buildTshirtArtifacts(JSON.parse(JSON.stringify(snapshot)), "shipped"),
  bundle,
  "JSON reload preserves the entire output graph and variant identities.",
);

for (const structure of [accessory, item, workflow]) {
  for (const slot of [
    "radiusTopLeft",
    "radiusTopRight",
    "radiusBottomRight",
    "radiusBottomLeft",
    "elevation",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
  ] as const)
    assert.equal(structureSelection(structure, slot), null);
  for (const slot of ["width", "height"] as const)
    assert.deepEqual(structureSelection(structure, slot), {
      value: { kind: "sizing", preset: "hug" },
    });
}
for (const [index, size] of ["xs", "s", "m", "l", "xl"].entries()) {
  for (const [structure, icons, paddings] of [
    [item, [8, 10, 10, 12, 14], [3, 3, 5, 7, 9]],
    [workflow, [14, 14, 16, 18, 20], [2, 2, 3, 5, 7]],
  ] as const) {
    const leaf = resolveElements(
      structure,
      references,
      snapshot.rules,
      size,
    )[0];
    assert.deepEqual(leaf.issues, []);
    assert.equal(
      leaf.warnings.length,
      structure === workflow && size === "xs" ? 1 : 0,
    );
    assert.ok(
      leaf.warnings.every((warning) =>
        warning.includes("Nearest available token"),
      ),
    );
    assert.equal(leaf.styles.height, icons[index]);
    const preview = tshirtPreview(structure, size, bundle, {}, references);
    const padding = preview.rows.find((row) => row.bindingIds.length === 4)!;
    assert.equal(padding.target.value, paddings[index]);
    assert.equal(
      icons[index] + 2 * paddings[index],
      (structure === workflow ? [18, 18, 22, 28, 34] : [14, 16, 20, 26, 32])[
        index
      ],
    );
  }
  for (const option of presentation.options) {
    for (const hasSecond of [false, true]) {
      const options = { [presentation.id]: option.id };
      const resolved = resolveStructureOptions(accessory, {
        ...EMPTY_STRUCTURE_PREVIEW,
        options,
        booleans: { [secondItem.id]: hasSecond },
      });
      assert.deepEqual(resolved.issues, []);
      assert.doesNotThrow(
        () =>
          assignStructure(resolved.structure, {
            minWidth: {
              $ref: resolveElements(item, references, snapshot.rules)[0]
                .targets[0].reference.id,
            },
          }),
        "Filtering hidden layers must leave the existing constraint editor usable.",
      );
      const affixed = option.name === "Affixed";
      assert.equal(
        resolved.structure.elements!.length,
        affixed ? 1 : hasSecond ? 2 : 1,
      );
      for (const child of resolved.structure.elements!) {
        if (affixed) assert.equal(child.kind, "uiIcon");
        else {
          assert.ok(isStructureInstance(child));
          assert.equal(
            child.structureId,
            option.name === "Workflow icon"
              ? workflow.conceptId
              : item.conceptId,
          );
        }
      }
      const composition = resolveComposition(
        resolved.structure,
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
      assert.ok(
        composition.warnings.every((warning) =>
          warning.includes("Nearest available token"),
        ),
      );
      const gap = (affixed ? [3, 3, 4, 5, 6] : [3, 4, 6, 7, 8])[index];
      assert.equal(composition.resolved.styles.gap, gap);
      for (const side of [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ] as const)
        assert.equal(composition.resolved.styles[side], gap);
    }
  }
}
const ownedSources = new Set([
  ...added.map((row) => row.target.sourceId),
  ...resolveElements(item, references, snapshot.rules)[0].targets.map(
    (target) => target.reference.sourceId,
  ),
]);
assert.ok(ownedSources.has("typography:workflow-icon-size"));
assert.ok(ownedSources.has("ca20c7d6-6b97-4281-a905-b2a83202e5df"));
for (const scale of snapshot.spacing.scales.filter((scale) =>
  ownedSources.has(scale.id),
))
  assert.equal(scale.hideFromPublishing, true);

const canonical = canonicalDesignSystemDataset(designSystemDefaults);
assert.deepEqual(
  canonicalDesignSystemDataset(composeDesignSystemDefaults(canonical, [])),
  canonical,
  "Seeded variant maps, identities and authored formulas round-trip through the schema.",
);
const leafOverrideSource = structuredClone(designSystemDefaults);
const leafOwner = leafOverrideSource.system.structures.structures[2];
const affixed = presentation.options[2];
const affixedLeaf = accessory.elements!.find(
  (child) => child.kind === "uiIcon",
)!;
assert.ok(!isStructureInstance(affixedLeaf));
leafOwner.editor!.overrides[affixed.id].elements = {
  [affixedLeaf.id]: { ...affixedLeaf, glyph: "ChevronUp" },
};
const leafOverride = canonicalDesignSystemDataset(leafOverrideSource);
assert.deepEqual(
  canonicalDesignSystemDataset(composeDesignSystemDefaults(leafOverride, [])),
  leafOverride,
  "Existing variant leaf overrides are typed and survive canonical round-trip.",
);
for (const invalid of ["configuration", "options", "bindings"] as const) {
  const bad = structuredClone(canonical);
  const target = bad.system.structures.structures.find(
    (structure) => structure.conceptId === accessory.conceptId,
  )!;
  Object.assign(target, { [invalid]: [{ invalid: "not a valid entry" }] });
  assert.throws(
    () => composeDesignSystemDefaults(bad, []),
    DatasetValidationError,
    `The ${invalid} map is typed, not an unrestricted schema escape hatch.`,
  );
}

assert.deepEqual(fresh.get(changeGroupsAtom), []);
assert.deepEqual(fresh.get(tshirtUnsavedImpactAtom), {
  added: 0,
  removed: 0,
  saved: 102,
  values: 122,
  error: "",
});
fresh.set(enterEditModeAtom);
fresh.set(renameStructureAtom, {
  id: accessory.conceptId,
  name: "Accessory edited",
});
assert.ok(
  fresh.get(changeGroupsAtom).some((group) => group.id === "structures"),
);
fresh.set(cancelEditAtom);
assert.deepEqual(fresh.get(structuresDocumentAtom), snapshot.structures);
fresh.set(enterEditModeAtom);
fresh.set(renameStructureAtom, {
  id: accessory.conceptId,
  name: "Accessory saved",
});
fresh.set(saveEditAtom);
assert.equal(
  fresh.get(editSessionSnapshotAtom)!.structures!.structures[2].name,
  "Accessory saved",
);
fresh.set(enterEditModeAtom);
assert.deepEqual(
  compareAuthoring(
    fresh.get(editSessionSnapshotAtom)!,
    fresh.get(authoringSnapshotAtom),
  ).groups,
  [],
);
fresh.set(resetAllAuthoringAtom);
assert.deepEqual(fresh.get(authoringSnapshotAtom), snapshot);
assert.deepEqual(fresh.get(scaleTypesAtom), snapshot.scaleTypes);

const authored = structuredClone(snapshot);
authored.structures!.structures = authored.structures!.structures.slice(0, 2);
const existing = createStore();
existing.set(restoreAuthoringSnapshotAtom, authored);
existing.set(editSessionSnapshotAtom, authored);
assert.deepEqual(
  existing.get(authoringSnapshotAtom),
  authored,
  "Loading an existing design never merges the new default Structures into it.",
);
assert.deepEqual(
  structureGeneration(accessory),
  structureGeneration(createDefaultSnapshot().structures!.structures[2]),
);
const review = await buildClassificationReviewExport(
  snapshot.taxonomy!,
  records,
  EMPTY_ALIASES,
  "compatibility",
);
const exported = await buildGeneratedClassificationCompatibility(
  bundle,
  review,
);
await assertGeneratedClassificationCompatibility(
  JSON.parse(JSON.stringify(exported)),
);
assert.equal(exported.standardConforming, false);
assert.equal(exported.upstreamAdopted, false);
assert.deepEqual(exported.bundle, bundle);
assert.equal(exported.classification.source.records.length, records.length);
console.log(
  "Accessory defaults: exact 35-row contract, unchanged Text, pairings, variants, typed schema and save/cancel/reset passed.",
);
