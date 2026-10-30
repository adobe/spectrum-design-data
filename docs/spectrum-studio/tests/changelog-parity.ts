// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import {
  compareAuthoring,
  type AuthoredSlot,
} from "../src/features/changelog/registry";
import {
  comparePrimitiveTokens,
  compareSemanticTokens,
} from "../src/features/changelog/tokenComparison";
import {
  authoredComparisonAtom,
  parityChangeGroupsAtom,
  tokenComparisonResultAtom,
} from "../src/features/changelog/comparisonState";
import { summarizeAuthoredImpact } from "../src/features/impact/authored";
import { summarizeTokenImpact } from "../src/features/impact/summaries";
import { tokenImpactSegments } from "../src/features/impact/segments";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import {
  sourceForResetContext,
  generatedResetOptions,
} from "../src/features/changelog/resetPlans";
import { browserSourcesForSnapshot } from "../src/features/tokens/browserSavedState";
import { tokenUuid } from "../src/features/tokens/model";

const shipped = createDefaultSnapshot();
const clean = compareAuthoring(shipped, shipped);
assert.deepEqual(comparePrimitiveTokens(shipped, shipped, clean).items, []);
assert.deepEqual(compareSemanticTokens(shipped, shipped, clean).items, []);
const changed = structuredClone(shipped);
changed.typography.textZoom = shipped.typography.textZoom + 1;
const authored = compareAuthoring(shipped, changed);
const primitives = comparePrimitiveTokens(shipped, changed, authored);
assert.ok(primitives.items.some((item) => item.title.startsWith("text-size")));
assert.ok(
  primitives.items.every((item) =>
    item.fields.every((field) => field.key !== "Value" || field.context),
  ),
);
assert.ok(
  primitives.items.some((item) =>
    item.upstream!.some((source) => source.title.includes("Text zoom")),
  ),
);
const summary = summarizeTokenImpact([
  ...primitives.records,
  ...compareSemanticTokens(shipped, changed, authored).records,
]);
assert.ok(summary.tiers.some((tier) => tier.tier === "semantic"));
assert.ok(summary.affected.count > 0);
assert.ok(
  Math.abs(
    tokenImpactSegments(summary).reduce(
      (total, segment) => total + segment.fraction,
      0,
    ) - summary.affected.fraction!,
  ) < 1e-12,
);
assert.equal(
  summarizeAuthoredImpact(authored.slots, "system").headline.count,
  1,
  "generated outputs do not inflate System impact",
);
assert.equal(
  summarizeAuthoredImpact(authored.slots, "foundations").headline.count,
  1,
);

const slots: AuthoredSlot[] = Array.from({ length: 100 }, (_, index) => ({
  id: String(index),
  category: index < 15 ? "rules" : "registry",
  changed: index < 30,
  manual: false,
}));
const arithmetic = summarizeAuthoredImpact(slots, "system");
assert.equal(arithmetic.headline.fraction, 0.3);
assert.equal(
  arithmetic.segments.find((segment) => segment.id === "rules")!.fraction,
  0.15,
);
assert.equal(
  arithmetic.rows.find((row) => row.id === "system-rules")!.ratio.fraction,
  1,
);
assert.equal(summarizeAuthoredImpact([], "system").headline.fraction, null);

const removed = structuredClone(shipped);
removed.size!.scales[0].above -= 1;
const removal = comparePrimitiveTokens(
  shipped,
  removed,
  compareAuthoring(shipped, removed),
);
assert.ok(
  removal.items.some((item) => item.kind === "removed"),
  "removed primitive concepts remain visible",
);
assert.ok(
  removal.records.length >=
    comparePrimitiveTokens(shipped, shipped, clean).records.length,
);

const store = createStore();
store.set(restoreAuthoringSnapshotAtom, changed);
const beforePreview = store.get(tokenComparisonResultAtom);
assert.equal(beforePreview.status, "ready");
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
store.set(previewOverridesAtom, { "typography.textZoom": 1.4 });
assert.equal(
  store.get(tokenComparisonResultAtom),
  beforePreview,
  "selected modes and previews do not change authored comparison",
);
assert.equal(
  store.get(authoredComparisonAtom).slots.filter((slot) => slot.changed).length,
  1,
);
assert.ok(
  store.get(parityChangeGroupsAtom).some((group) => group.id === "tokens"),
);
assert.equal(
  store.get(authoringSnapshotAtom).typography.textZoom,
  changed.typography.textZoom,
);

const manual = structuredClone(shipped);
const baselinePrimitive = comparePrimitiveTokens(
  shipped,
  shipped,
  clean,
).records.find((record) => record.category === "size")!;
const context = canonicalTokenModeKey(
  Object.fromEntries(
    shipped.modeSets.map((set) => [set.id, set.defaultModeId]),
  ),
);
manual.browserTokenEdits![baselinePrimitive.tokenId] = {
  status: "deprecated",
  values: {},
};
const deprecated = comparePrimitiveTokens(
  shipped,
  manual,
  compareAuthoring(shipped, manual),
).items.find((item) => item.id === baselinePrimitive.tokenId)!;
assert.equal(deprecated.kind, "deprecated");
assert.ok(deprecated.fields.some((field) => field.key === "Status"));
assert.ok(context.startsWith("["));
const sizeSource = sourceForResetContext(
  shipped,
  context,
  baselinePrimitive.tokenId,
)!;
const equalOverride = structuredClone(shipped);
equalOverride.browserTokenEdits![sizeSource.id] = {
  values: {
    [context]: { value: sizeSource.value, baseline: sizeSource.generatedValue },
  },
};
const equalOutput = comparePrimitiveTokens(
  shipped,
  equalOverride,
  compareAuthoring(shipped, equalOverride),
);
assert.equal(
  equalOutput.records
    .find((record) => record.tokenId === sizeSource.id)!
    .modeValues.filter((value) => value.changed).length,
  0,
  "introducing explicit context scope must not fabricate changed inherited values",
);
const equalCard = equalOutput.items.find((item) => item.id === sizeSource.id)!;
assert.ok(equalCard.fields.some((field) => field.key === "Manual override"));
assert.ok(!equalCard.fields.some((field) => field.key === "Value"));
const generatedCard = primitives.items.find(
  (item) => item.id === "typography-font-size-50",
)!;
const generatedValue = generatedCard.fields.find(
  (field) => field.key === "Value",
)!;
const source = sourceForResetContext(
  changed,
  generatedValue.tokenValue!.modeKey,
  generatedCard.id,
)!;
const choices = generatedResetOptions(
  generatedCard,
  generatedValue,
  source,
  changed,
);
assert.equal(
  choices.filter((choice) => choice.plan?.kind === "override").length,
  generatedValue.tokenValue!.contexts!.length,
  "an owner-scoped row offers each full override context rather than choosing one silently",
);
assert.ok(
  choices
    .filter((choice) => choice.plan?.kind === "override")
    .every((choice) => choice.description.includes("Color scheme:")),
);
const named = structuredClone(shipped);
named.browserTokenEdits![sizeSource.id] = { name: "A custom size", values: {} };
const namedField = comparePrimitiveTokens(
  shipped,
  named,
  compareAuthoring(shipped, named),
)
  .items.find((item) => item.id === sizeSource.id)!
  .fields.find((field) => field.key === "Name")!;
assert.deepEqual(
  namedField.address?.path,
  ["browserTokenEdits", sizeSource.id, "name"],
  "manual names have precise reset addresses",
);
const sources = browserSourcesForSnapshot(
  shipped,
  shipped.modeSets.map(
    (set) => set.modes.find((mode) => mode.id === set.defaultModeId)!,
  ),
);
const white = sources.find(
  (candidate) =>
    candidate.type === "colors" &&
    !candidate.paletteColorId &&
    !candidate.dataVis &&
    candidate.value === "rgb(255, 255, 255)",
)!;
assert.ok(white);
const colorNotation = structuredClone(shipped);
colorNotation.browserTokenEdits![white.id] = {
  values: { [context]: { value: "#FFFFFF", baseline: white.generatedValue } },
};
const notationComparison = comparePrimitiveTokens(
  shipped,
  colorNotation,
  compareAuthoring(shipped, colorNotation),
);
assert.ok(
  notationComparison.items
    .find((item) => item.id === white.id)!
    .fields.some((field) => field.key === "Manual override"),
);
assert.ok(
  !notationComparison.items
    .find((item) => item.id === white.id)!
    .fields.some((field) => field.key === "Value"),
  "manual notation is normalized through the shared final-output path",
);
const dormant = structuredClone(shipped);
dormant.browserTokenEdits!["unavailable-token"] = {
  description: "Retain this authored edit",
  values: {},
};
store.set(restoreAuthoringSnapshotAtom, dormant);
assert.ok(
  store
    .get(parityChangeGroupsAtom)
    .flatMap((group) => group.items)
    .some((item) => item.title.includes("unavailable-token")),
  "unresolved authored token edits remain visible",
);
const simultaneous = structuredClone(changed);
simultaneous.typography.iconography.baseSize += 2;
const exactSources = comparePrimitiveTokens(
  shipped,
  simultaneous,
  compareAuthoring(shipped, simultaneous),
).items.find((item) => item.id === generatedCard.id)!;
assert.ok(
  !exactSources.upstream!.some((upstream) =>
    upstream.title.includes("Iconography"),
  ),
  "font size does not offer an unrelated iconography reset",
);
const linkedScale = shipped.colorSystem.scales.find((scale) =>
  scale.stops.some((stop) => stop.paletteColorId),
)!;
const paletteId = linkedScale.stops.find(
  (stop) => stop.paletteColorId,
)!.paletteColorId!;
const paletteEdit = structuredClone(shipped);
paletteEdit.colorSystem.palette.find((color) => color.id === paletteId)!.hue =
  (paletteEdit.colorSystem.palette.find((color) => color.id === paletteId)!
    .hue +
    50) %
  360;
const linkedIds = new Set(
  sources
    .filter((source) => source.groupId === linkedScale.id)
    .map((source) => source.id),
);
const linkedComparison = comparePrimitiveTokens(
  shipped,
  paletteEdit,
  compareAuthoring(shipped, paletteEdit),
);
assert.ok(
  linkedComparison.items.some(
    (item) =>
      linkedIds.has(item.id) &&
      item.upstream!.some((upstream) =>
        upstream.address.path.some(
          (part) =>
            typeof part === "object" && "id" in part && part.id === paletteId,
        ),
      ),
  ),
  "UI outputs identify the changed palette source feeding their linked stops",
);
const scopedSemantic = structuredClone(shipped);
scopedSemantic.spacing!.scales[0].base = 12;
const unusedScale = structuredClone(scopedSemantic.spacing!.scales[0]);
unusedScale.id = tokenUuid("unused-spacing-scale");
unusedScale.name = "Unused spacing";
const unusedTerm = {
  ...scopedSemantic.taxonomy!.terms.find(
    (term) => term.id === unusedScale.nameRef!.termId,
  )!,
  id: "af4be9b4-b9ab-4a21-8cf0-aa9dde215e9f",
  value: "Unused spacing",
};
unusedScale.nameRef = {
  ...unusedScale.nameRef!,
  termId: unusedTerm.id,
  classification: {
    ...unusedScale.nameRef!.classification,
    [unusedTerm.categoryId]: unusedTerm.id,
  },
};
scopedSemantic.taxonomy!.terms.push(unusedTerm);
scopedSemantic.spacing!.scales.push(unusedScale);
assertStoredSnapshot(scopedSemantic);
const semanticDependencies = compareSemanticTokens(
  shipped,
  scopedSemantic,
  compareAuthoring(shipped, scopedSemantic),
);
assert.ok(semanticDependencies.items.length > 0);
assert.ok(
  semanticDependencies.items.some((item) =>
    item.upstream!.some((source) =>
      source.address.path.some(
        (part) =>
          typeof part === "object" &&
          "id" in part &&
          part.id === scopedSemantic.spacing!.scales[0].id,
      ),
    ),
  ),
  "changed semantic outputs identify their referenced spacing scale",
);
assert.ok(
  semanticDependencies.items.every((item) =>
    item.upstream!.every(
      (source) =>
        !source.address.path.some(
          (part) =>
            typeof part === "object" &&
            "id" in part &&
            [unusedScale.id, unusedTerm.id].includes(part.id),
        ),
    ),
  ),
  "semantic dependencies target the referenced scale, not every edited source in that foundation",
);

console.log(
  "Changes parity: working/shipped baselines, output tiers, precise arithmetic, removals and preview exclusion passed",
);
