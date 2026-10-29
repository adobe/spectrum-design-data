// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import {
  sourceResetPlan,
  prepareChangeReset,
} from "../src/features/changelog/resetPlans";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { componentTokenCatalog } from "../src/features/components/references";
import { componentImpactForSnapshots } from "../src/features/impact/componentImpact";
import { opacityFoundationSource } from "../src/features/impact/sources/opacityFoundation";
import {
  opacityDocumentAtom,
  opacitySourceAtom,
} from "../src/features/opacity/state";
import {
  browserOpacitySources,
  opacityRows,
} from "../src/features/opacity/output";
import { activeModesAtom } from "../src/features/modes/selection";
import { opacityContexts } from "../src/features/opacity/generation";
import { browserSourcesForSnapshot } from "../src/features/tokens/browserSavedState";
import {
  resolveBrowserTokens,
  applyBrowserTokenEdits,
  canonicalTokenModeKey,
} from "../src/features/tokens/browserModel";
import {
  modeCombinations,
  selectionForModes,
} from "../src/features/modes/combinations";
import type { ComponentsDocument } from "../src/features/components/model";
import { sourceValuePreview } from "../src/features/tokens/valuePreview";
import { registerOpacityVocabulary } from "../src/features/taxonomy/opacityGovernance";
import {
  browserModeContextAtom,
  editBrowserTokensAtom,
} from "../src/features/tokens/browserState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { editModeAtom } from "../src/state/view/editMode";

const shipped = createDefaultSnapshot();
assert.ok(shipped.opacity);
shipped.taxonomy = registerOpacityVocabulary(
  shipped.taxonomy!,
  shipped.opacity,
);
const target = shipped.opacity.levels[7];
const row = opacityRows(shipped, shipped.taxonomy).find(
  (row) => row.conceptId === target.id,
)!;
assert.ok(row.uuid);
shipped.components = {
  schemaVersion: 2,
  components: [
    {
      id: "opacity-impact-fixture",
      declaration: { displayName: "Opacity fixture" },
      assignments: [
        { id: "one", $ref: row.uuid },
        { id: "two", $ref: row.uuid },
        { id: "unrelated", value: 1 },
      ],
    },
  ],
} as unknown as ComponentsDocument;
const working = structuredClone(shipped);
working.opacity!.levels[7].value = 0.25;
const authored = compareAuthoring(shipped, working);
assert.deepEqual(
  authored.slots
    .filter((slot) => slot.foundation === "opacity")
    .map((slot) => slot.changed)
    .filter(Boolean),
  [true],
);
assert.equal(
  authored.slots.filter((slot) => slot.foundation === "opacity").length,
  19,
);
const sourceItem = authored.groups
  .flatMap((group) => group.items)
  .find((item) => item.sourceKind === "opacity")!;
assert.equal(sourceItem.fields[0].afterPreview?.kind, "opacity");
const tokens = comparePrimitiveTokens(shipped, working, authored);
const opacity = tokens.records.filter(
  (record) => record.category === "opacity",
);
assert.equal(opacity.length, 17);
assert.equal(opacity.flatMap((record) => record.modeValues).length, 34);
assert.equal(
  opacity
    .flatMap((record) => record.modeValues)
    .filter((value) => value.changed).length,
  2,
);
assert.ok(
  tokens.records.some(
    (record) =>
      record.category === "elevation" &&
      record.modeValues.some((value) => value.changed),
  ),
  "Opacity change propagates to referenced shadow output.",
);
const components = componentImpactForSnapshots(shipped, working);
assert.equal(
  components.status,
  "ready",
  components.status === "unavailable" ? components.error : undefined,
);
if (components.status === "ready")
  assert.deepEqual(
    [components.summary.affected.count, components.summary.affected.total],
    [2, 3],
  );
assert.equal(
  componentTokenCatalog(working).find((token) => token.id === row.uuid)?.value,
  0.25,
);
const aliases = canonicalAliasRows(completeAliasSource(working)).filter(
  (row) => row.token.type === "opacity",
);
assert.equal(aliases.length, 34);
assert.equal(aliases.find((item) => item.rowId === row.uuid)?.id, target.id);
assert.equal(
  aliases.find((item) => item.rowId === row.uuid)?.token.value,
  0.25,
);

const store = createStore();
store.set(opacityDocumentAtom, working.opacity!);
const foundation = store.get(opacityFoundationSource.recordsAtom);
assert.deepEqual(
  [foundation.filter((record) => record.edited).length, foundation.length],
  [1, 19],
);
const reset = prepareChangeReset(
  {
    ...working,
    components: createDefaultSnapshot().components,
    attachments: {},
  },
  sourceResetPlan(
    "Opacity",
    sourceItem.fields.flatMap((field) =>
      field.address ? [field.address] : [],
    ),
  ),
);
assert.equal(reset.opacity!.levels[7].value, 0.2);
assert.deepEqual(reset.components, createDefaultSnapshot().components);

const modes = modeCombinations(working.modeSets)[0];
const fullKey = canonicalTokenModeKey(
  selectionForModes(working.modeSets, modes),
);
const source = browserSourcesForSnapshot(working, modes).find(
  (token) => token.id === target.id,
)!;
const edits = applyBrowserTokenEdits([source], {}, [target.id], fullKey, {
  value: 0.35,
});
working.browserTokenEdits = edits;
const saved = browserSourcesForSnapshot(working, modes);
const effective = resolveBrowserTokens(saved, edits, fullKey).find(
  (token) => token.id === target.id,
)!;
assert.equal(effective.value, 0.35);
assert.ok(effective.valueOverridden);
assert.equal(sourceValuePreview(effective).kind, "opacity");
const scoped = opacityContexts(working);
assert.equal(
  scoped.length,
  2,
  "Unrelated selected axes do not change saved opacity inventory.",
);
const editing = createStore();
editing.set(editModeAtom, true);
const document = editing.get(opacityDocumentAtom);
const scopedSource = browserOpacitySources(
  editing.get(opacitySourceAtom),
  editing.get(activeModesAtom),
).find((token) => token.id === target.id)!;
editing.set(editBrowserTokensAtom, {
  ids: [target.id],
  modeKey: editing.get(browserModeContextAtom).key,
  patch: { value: 0.3 },
});
assert.deepEqual(editing.get(browserTokenEditsAtom)[target.id]?.values, {
  [scopedSource.modeKey!]: { baseline: 0.2, value: 0.3 },
});
assert.equal(
  editing.get(opacityDocumentAtom),
  document,
  "Edits with complete rows keep the persisted opacity rows unchanged.",
);
console.log(
  "Opacity integration: authored/Foundation, primitive/shadow token, component assignment impact, saved feeds, aliases, and scoped edits passed.",
);
