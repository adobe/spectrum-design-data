// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import {
  buildTshirtArtifacts,
  tshirtPreview,
} from "../src/features/design-data/tshirtArtifacts";
import {
  resolveComposition,
  type ResolvedComposition,
} from "../src/features/structures/composition";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import {
  structureEditor,
  EMPTY_STRUCTURE_PREVIEW,
} from "../src/features/structures/variants";
import { ownedLayoutAt } from "../src/features/structures/configuration";
import {
  structureLayers,
  findStructureLayer,
} from "../src/features/structures/layers";
import {
  upgradeStructuresDocument,
  structureSlot,
  STRUCTURES_SCHEMA_VERSION,
  type Structure,
} from "../src/features/structures/model";
import { compareAuthoring } from "../src/features/changelog/registry";
import { compareSemanticTokens } from "../src/features/changelog/tokenComparison";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";

const snapshot = createDefaultSnapshot();
const catalog = snapshot.structures!.structures;
const root = catalog.find((item) => item.name === "List-item")!;
const base = catalog.find((item) => item.name === "Base")!;
const text = catalog.find((item) => item.name === "Text")!;
const editor = structureEditor(root);
const variants = editor.properties.filter(
  (property) => property.kind === "variant",
);
const booleans = editor.properties.filter(
  (property) => property.kind === "boolean",
);
assert.equal(variants.length, 4);
assert.equal(booleans.length, 6);
assert.ok(booleans.every((property) => property.defaultValue));
const references = createStore().get(primitiveReferencesAtom);
const bundle = buildTshirtArtifacts(snapshot, "shipped");
const measured = {
  availableWidth: 500,
  availableHeight: 100,
  naturalWidth: 200,
  naturalHeight: 40,
};
const measurements: Record<string, typeof measured> = {};
const measure = (source: Structure, path = "") => {
  for (const child of source.elements ?? []) {
    if (child.kind !== "structureReference") continue;
    const childPath = `${path}/${child.id}`;
    measurements[childPath] = measured;
    measure(
      catalog.find((item) => item.conceptId === child.structureId)!,
      childPath,
    );
  }
};
measure(root);
const module = (
  source: ResolvedComposition,
  name: string,
): ResolvedComposition => {
  for (const child of source.children) {
    if (!("composition" in child)) continue;
    if (child.composition.structure.name === name) return child.composition;
    const nested = findModule(child.composition, name);
    if (nested) return nested;
  }
  throw new Error(`Missing ${name}.`);
};
function findModule(
  source: ResolvedComposition,
  name: string,
): ResolvedComposition | undefined {
  for (const child of source.children) {
    if (!("composition" in child)) continue;
    if (child.composition.structure.name === name) return child.composition;
    const nested = findModule(child.composition, name);
    if (nested) return nested;
  }
}
const originalData = structuredClone(catalog);
for (const size of ["m", "l"]) {
  for (let choices = 0; choices < 16; choices++) {
    const options = Object.fromEntries(
      variants.map((property, index) => [
        property.id,
        property.options[(choices >> index) & 1].id,
      ]),
    );
    for (let visibility = 0; visibility < 64; visibility++) {
      const state = {
        ...EMPTY_STRUCTURE_PREVIEW,
        options,
        indentationLevel: 2 as const,
        booleans: Object.fromEntries(
          booleans.map((property, index) => [
            property.id,
            !!((visibility >> index) & 1),
          ]),
        ),
      };
      const composition = resolveComposition(
        root,
        catalog,
        references,
        snapshot.rules!,
        bundle,
        {},
        size,
        measured,
        measurements,
        options,
        2,
        { [root.conceptId]: state },
      );
      assert.deepEqual(composition.issues, []);
      assert.equal(
        composition.resolved.styles.marginInlineStart,
        choices & 8 ? 48 : 32,
      );
      const vertical = module(composition, "Vertical padding");
      for (const slot of ["paddingTop", "paddingBottom"] as const)
        assert.equal(
          vertical.resolved.styles[slot],
          choices & 4 ? undefined : choices & 1 ? 8 : 4,
        );
      const content = module(composition, "Content layout");
      for (const slot of ["paddingLeft", "paddingRight"] as const)
        assert.equal(
          content.resolved.styles[slot],
          choices & 2 ? undefined : 6,
        );
      const start = module(composition, "Content start");
      const end = module(composition, "Content end");
      const has = (name: string) =>
        state.booleans[booleans.find((property) => property.name === name)!.id];
      assert.equal(
        start.children.length,
        1 + Number(has("Drag handle")) + Number(has("Selection indicator")),
      );
      assert.equal(
        end.children.length,
        ["Buttons", "Secondary content", "Switch", "Drill-in"].filter(has)
          .length,
      );
      const primary = module(start, "Base");
      assert.equal(primary.structure.conceptId, base.conceptId);
      assert.deepEqual(
        primary.structure,
        resolveComposition(
          base,
          catalog,
          references,
          snapshot.rules!,
          bundle,
          {},
          primary.size,
          measured,
        ).structure,
      );
      if (choices === 0) {
        const layers = structureLayers(root, catalog, {
          [root.conceptId]: state,
        });
        const startPath = Object.keys(editor.layouts!).find(
          (path) =>
            ownedLayoutAt(root, path, catalog)?.name === "Content start",
        )!;
        const startLayer = findStructureLayer(layers, startPath)!;
        const indicator = startLayer.children.find(
          (layer) => layer.child.kind === "slot",
        )!;
        assert.equal(
          indicator.configuration.visibility[indicator.child.id],
          has("Selection indicator"),
        );
      }
    }
  }
}
assert.deepEqual(
  catalog,
  originalData,
  "Resolving every combination never mutates shared sources.",
);
for (const level of [0, 1, 2] as const) {
  for (const [index, distance] of [16, 24].entries()) {
    const property = variants.find(
      (property) => property.name === "Indentation distance",
    )!;
    const state = {
      ...EMPTY_STRUCTURE_PREVIEW,
      options: { [property.id]: property.options[index].id },
    };
    const composition = resolveComposition(
      root,
      catalog,
      references,
      snapshot.rules!,
      bundle,
      {},
      "l",
      measured,
      measurements,
      state.options,
      level,
      { [root.conceptId]: state },
    );
    assert.equal(
      composition.resolved.styles.marginInlineStart,
      level * distance,
    );
  }
}
const legacy = structuredClone(snapshot);
const legacyRoot = legacy.structures!.structures.find(
  (item) => item.conceptId === root.conceptId,
)!;
const verticalPath = Object.keys(editor.layouts!).find(
  (path) => ownedLayoutAt(root, path, catalog)?.name === "Vertical padding",
)!;
const legacyVertical = ownedLayoutAt(
  legacyRoot,
  verticalPath,
  legacy.structures!.structures,
)!;
const density = variants.find((property) => property.name === "Density")!;
const densityConfiguration = editor.layouts![verticalPath];
legacyVertical.editor = {
  ...densityConfiguration,
  properties: [density],
  visibility: {},
  visibilityBindings: {},
  overrides: {
    [density.options[1].id]:
      densityConfiguration.overrides![density.options[1].id],
  },
};
delete legacyRoot.editor;
const legacyStart = legacy.structures!.structures.find(
  (item) => item.name === "Content start",
)!;
const reference = legacyStart.elements!.find(
  (child) => child.kind === "structureReference",
)!;
assert.equal(reference.kind, "structureReference");
if (reference.kind !== "structureReference")
  throw new Error("Missing primary content.");
reference.structureId = text.conceptId;
assert.deepEqual(
  bundle,
  buildTshirtArtifacts(legacy, "shipped"),
  "The parent-control correction preserves the entire legacy generated bundle.",
);
const contextual = structuredClone(snapshot);
const primitive = references.find(
  (item) =>
    item.family === "spacing" &&
    item.sourceId === snapshot.spacing!.scales[0].id &&
    item.step === 100,
)!;
assert.ok(primitive.nativeId);
const defaultModeKey = canonicalTokenModeKey(
  Object.fromEntries(
    snapshot.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  ),
);
contextual.browserTokenEdits ??= {};
contextual.browserTokenEdits[primitive.nativeId] = {
  values: {
    [defaultModeKey]: { value: primitive.value + 2, baseline: primitive.value },
  },
};
const contextualLegacy = {
  ...legacy,
  browserTokenEdits: contextual.browserTokenEdits,
};
assert.deepEqual(
  buildTshirtArtifacts(contextual, "shipped"),
  buildTshirtArtifacts(contextualLegacy, "shipped"),
  "Default-mode primitive edits retain the existing baseline and contextual variant outputs.",
);
const oldDocument = structuredClone(legacy.structures!);
oldDocument.schemaVersion = 6;
const upgraded = upgradeStructuresDocument(oldDocument);
assert.equal(upgraded.schemaVersion, STRUCTURES_SCHEMA_VERSION);
assert.deepEqual(
  upgraded.structures,
  oldDocument.structures,
  "Old authored designs upgrade losslessly without receiving new default controls.",
);
assert.throws(
  () =>
    tshirtPreview(
      root,
      "l",
      {
        ...bundle,
        semantics: bundle.semantics.filter(
          (row) => row.structureId !== root.conceptId || row.size !== "m",
        ),
      },
      {},
      references,
      {},
      root.editor!.sizes,
    ),
  /selected generated size for indent is unavailable/,
  "An unavailable explicit size reports an error instead of silently showing the raw binding.",
);
const repeated = structuredClone(snapshot);
const repeatedRoot = repeated.structures!.structures.find(
  (item) => item.conceptId === root.conceptId,
)!;
const repeatedReference = {
  ...repeatedRoot.elements![0],
  id: crypto.randomUUID(),
};
repeatedRoot.elements!.push(repeatedReference);
repeatedRoot.editor!.layouts![`/${repeatedReference.id}`] =
  structuredClone(densityConfiguration);
assert.deepEqual(
  buildTshirtArtifacts(repeated, "shipped"),
  bundle,
  "Repeated occurrences sharing a mapped generated meaning do not duplicate tokens.",
);
const edited = structuredClone(snapshot);
const editedRoot = edited.structures!.structures.find(
  (item) => item.conceptId === root.conceptId,
)!;
const verticalOption = density.options[1].id;
const changedSlots =
  editedRoot.editor!.layouts![verticalPath].overrides![verticalOption].slots!;
const contentLayout = catalog.find((item) => item.name === "Content layout")!;
const differentPadding = contentLayout.properties.find(
  (binding) => structureSlot(binding) === "paddingLeft" && "$ref" in binding,
)!;
assert.ok("$ref" in differentPadding);
changedSlots.paddingTop = { $ref: differentPadding.$ref };
changedSlots.paddingBottom = { $ref: differentPadding.$ref };
const unrelated = editedRoot.editor!.properties.find(
  (property) => property.kind === "boolean",
)!;
unrelated.name = "Keep this unrelated label";
const semanticChanges = compareSemanticTokens(
  snapshot,
  edited,
  compareAuthoring(snapshot, edited),
);
assert.equal(
  semanticChanges.records.filter((row) =>
    row.modeValues.some((value) => value.changed),
  ).length,
  2,
  "Changing a parent-owned Density mapping affects exactly its two generated size rows.",
);
const generatedSources = semanticChanges.items.flatMap(
  (item) => item.upstream ?? [],
);
assert.ok(generatedSources.length > 0);
assert.ok(
  generatedSources.every(
    (source) =>
      source.address.path.includes("layouts") &&
      source.address.path.includes(verticalPath) &&
      source.address.path.includes(verticalOption),
  ),
  "Generated resets point to parent-owned effects, excluding unrelated property edits.",
);
const resetGenerated = prepareChangeReset(
  { ...edited, attachments: {} },
  sourceResetPlan(
    "Density sources",
    generatedSources.map((source) => source.address),
  ),
);
assert.deepEqual(buildTshirtArtifacts(resetGenerated, "shipped"), bundle);
assert.equal(
  resetGenerated
    .structures!.structures.find((item) => item.conceptId === root.conceptId)!
    .editor!.properties.find((property) => property.id === unrelated.id)!.name,
  unrelated.name,
  "Generated source resets preserve unrelated parent-property edits.",
);
console.log(
  "List-item: 2,048 option/size combinations, independent indentation, Base isolation, Layers parity and exact legacy token identities passed.",
);
