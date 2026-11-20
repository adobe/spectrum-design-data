// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { atom, createStore } from "jotai";
import { editModeAtom } from "../src/state/view/editMode";
import {
  authoringGuardConfiguration,
  prepareAuthoringUpdates,
} from "../src/state/authoringGuards";
import {
  applyPersistedWrites,
  flushPersistedState,
  registerPersistenceFlush,
} from "../src/state/persist";
import {
  authoringSourceSnapshotAtom,
  createNumericValidationStore,
} from "../src/features/edit-session/state";
import {
  collectNumericProposals,
  reportNumericProposalFailure,
} from "../src/features/edit-session/numericProposal";
import { prepareNumericWork } from "../src/features/edit-session/numericWork";
import { updateTypographyAtom } from "../src/features/typography/state";
import { resolvedColorSystemDocumentAtom } from "../src/features/color-system/state";
import {
  clearPreviewParametersAtom,
  setPreviewParameterAtom,
} from "../src/features/modes/previewState";
import { componentSizingDocumentAtom } from "../src/features/foundations/componentSizingState";
import { createNumericRuntime } from "../src/features/edit-session/numericRuntime";
import {
  numericDraftStateAtom,
  numericPreviewSnapshotAtom,
} from "../src/features/edit-session/numericState";
import {
  liveTypographyDocumentAtom,
  typographyPreviewSourceAtom,
} from "../src/features/edit-session/previewSources";
import { NumberFieldStateContext } from "react-aria-components";
import {
  computeEditorPreview,
  type EditorPreviewInput,
} from "../src/features/edit-session/editorPreviewWork";
import { createStyleAtom, saveStyleAtom } from "../src/features/styles/state";
import { updateSpacingScaleAtom } from "../src/features/spacing/state";
import { numericInputError } from "../src/components/editable/useNumericDraft";
import { setImmediate } from "node:timers/promises";
import { assignStructureAtom } from "../src/features/structures/state";
import { structureBindingId } from "../src/features/structures/model";
import { UNMEASURED_LAYOUT } from "../src/features/structures/resolution";
import {
  answerLayoutScaleAtom,
  pendingLayoutScaleAtom,
} from "../src/features/structures/layoutScaleState";
import {
  updateElevationAtom,
  updateElevationModeParameterAtom,
  updateShadowLayerAtom,
} from "../src/features/elevation/state";
import { computeElevationComparison } from "../src/features/elevation/comparisonWork";
import { elevationComparisonSeries } from "../src/features/elevation/comparisons";
import {
  createElement,
  elementBindingId,
} from "../src/features/structures/elements";
import { selectedStructureIdAtom } from "../src/features/structures/documentState";
import { primitiveReferenceId } from "../src/features/tokens/primitiveIdentity";
import {
  dataVisContinuousOutputsAtom,
  editDataVisPointAtom,
} from "../src/features/color-system/data-vis/state";
import {
  computeDataVisPreview,
  type DataVisPreviewInput,
} from "../src/features/color-system/data-vis/previewWork";
import type { DataVisPreview } from "../src/features/color-system/data-vis/preview";
import { quantitativeExample } from "../src/features/color-system/data-vis/examples";
import { createDataVisPreviewRuntime } from "../src/features/color-system/data-vis/previewRuntime";
import type {
  PreviewRequest,
  PreviewReply,
  PreviewWorkerPort,
} from "../src/features/derived-work/PreviewWorker";
import { computeDataVisAnalysis } from "../src/features/color-system/data-vis/analysisWork";
import {
  dataVisComparisonPage,
  dataVisMetricPoints,
} from "../src/features/color-system/data-vis/analysis";
import { dataVisBackground } from "../src/features/color-system/data-vis/resolution";
import { renderGamutForOutput } from "../src/features/color-system/colorMath";

const store = createStore();
store.set(editModeAtom, true);
const source = store.get(authoringSourceSnapshotAtom);
const patch = { textSize: source.typography.textSize + 1 };
const configuration = authoringGuardConfiguration();
const proposals = collectNumericProposals(() =>
  store.set(updateTypographyAtom, patch),
);
assert.equal(proposals.length, 1);
assert.equal(store.get(authoringSourceSnapshotAtom), source);
assert.deepEqual(authoringGuardConfiguration(), configuration);

const output = prepareNumericWork(structuredClone({ source, proposals }));
assert.deepEqual(output.guards, configuration);
const direct = createNumericValidationStore(source);
direct.set(updateTypographyAtom, patch);
const expected = direct.get(authoringSourceSnapshotAtom);
const prepared = await prepareAuthoringUpdates(
  store.get,
  async () => ({ value: output, ...output }),
  () => store.get(authoringSourceSnapshotAtom) === source,
);
const apply = atom(null, (get, set) => {
  applyPersistedWrites(get, set, output.updates);
  if (output.componentSizing)
    set(componentSizingDocumentAtom, output.componentSizing);
});
prepared.commit(store.get, () => {
  store.set(apply);
});
assert.deepEqual(store.get(authoringSourceSnapshotAtom), expected);
assert.equal(source.typography.textSize + 1, expected.typography.textSize);
assert.deepEqual(authoringGuardConfiguration(), configuration);

assert.throws(
  () =>
    prepareNumericWork({
      source,
      proposals: [
        {
          source: "typography",
          previous: source.typography,
          next: {
            ...source.typography,
            textRoundingRuleId: "unavailable-rule",
          },
        },
      ],
    }),
  /rounding|rule|available/i,
);
assert.throws(
  () =>
    prepareNumericWork({
      source,
      proposals: [
        {
          source: "typography",
          previous: source.typography,
          next: { ...source.typography, textSize: Number.NaN },
        },
      ],
    }),
  /valid numeric/,
);
assert.deepEqual(store.get(authoringSourceSnapshotAtom), expected);
assert(
  NumberFieldStateContext,
  "The installed RAC exposes its supported numeric state context.",
);
const errors: string[] = [];
const runtime = createNumericRuntime(
  store,
  async (input, signal) => {
    signal.throwIfAborted();
    return prepareNumericWork(input);
  },
  (error) => errors.push(error),
);
const stop = runtime.start();
const acceptedSize = expected.typography.textSize;
runtime.capture("text-size", () =>
  store.set(updateTypographyAtom, { textSize: acceptedSize + 1 }),
);
assert.equal(
  store.get(authoringSourceSnapshotAtom).typography.textSize,
  acceptedSize,
);
assert.equal(store.get(typographyPreviewSourceAtom).textSize, acceptedSize + 1);
assert.equal(store.get(liveTypographyDocumentAtom).textSize, acceptedSize + 1);
const transientSource = store.get(numericPreviewSnapshotAtom);
runtime.setError("text-size", "Finish entering this number.");
assert.equal(
  store.get(numericPreviewSnapshotAtom),
  transientSource,
  "Validation feedback does not change the preview source.",
);
await assert.rejects(runtime.flush(), /Finish entering/);
assert.equal(
  store.get(authoringSourceSnapshotAtom).typography.textSize,
  acceptedSize,
);
runtime.setError("text-size");
const accepting = runtime.flush();
assert.equal(
  store.get(numericPreviewSnapshotAtom),
  transientSource,
  "Starting acceptance does not regenerate an unchanged preview.",
);
await accepting;
assert.equal(
  store.get(authoringSourceSnapshotAtom).typography.textSize,
  acceptedSize + 1,
);
assert.equal(store.get(numericDraftStateAtom).proposals.size, 0);
assert.equal(store.get(liveTypographyDocumentAtom).textSize, acceptedSize + 1);
assert.deepEqual(errors, []);
assert.equal(
  runtime.capture("rejected", () =>
    reportNumericProposalFailure("Rejected by the authoring action."),
  ),
  false,
);
await assert.rejects(runtime.flush(), /Rejected by the authoring action/);
runtime.setError("rejected");
assert.equal(
  runtime.capture("rejected", () => {}),
  true,
);
runtime.capture("text-size", () =>
  store.set(updateTypographyAtom, { textSize: acceptedSize + 2 }),
);
runtime.pagehide();
assert.equal(
  store.get(authoringSourceSnapshotAtom).typography.textSize,
  acceptedSize + 2,
);
assert.equal(store.get(numericDraftStateAtom).proposals.size, 0);
stop();
const unrelatedColorPreview = store.get(resolvedColorSystemDocumentAtom);
store.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 1,
});
assert.equal(
  store.get(resolvedColorSystemDocumentAtom),
  unrelatedColorPreview,
  "Adaptive text scaling must not recalculate unrelated Color output.",
);
store.set(setPreviewParameterAtom, {
  parameterId: "color.contrastMultiplier",
  value: 2,
});
assert.notEqual(
  store.get(resolvedColorSystemDocumentAtom),
  unrelatedColorPreview,
);
assert.equal(
  store.get(resolvedColorSystemDocumentAtom).settings.contrastMultiplier,
  2,
);
store.set(clearPreviewParametersAtom, [
  "typography.textZoom",
  "color.contrastMultiplier",
]);
let persistenceFlushes = 0;
const unregisterFlush = registerPersistenceFlush(
  () => persistenceFlushes++,
  store,
);
flushPersistedState(createStore());
assert.equal(
  persistenceFlushes,
  0,
  "A numeric runtime cannot flush another store.",
);
flushPersistedState(store);
assert.equal(persistenceFlushes, 1);
unregisterFlush();
flushPersistedState(store);
assert.equal(
  persistenceFlushes,
  1,
  "Disposal removes the store-bound persistence flush.",
);
assert.match(numericInputError(Number.NaN, {})!, /valid number/);
assert.match(numericInputError(3, { minValue: 4 })!, /range/);
assert.equal(
  numericInputError(0, {
    validate: (value) => (value > 0 ? null : "Enter a positive value."),
  }),
  "Enter a positive value.",
);
assert.equal(
  numericInputError(5, { validate: () => ["One issue.", "Another issue."] }),
  "One issue. Another issue.",
);
assert.equal(
  numericInputError(5, { minValue: 1, maxValue: 10, validate: () => true }),
  undefined,
);
const fixture = store.set(createStyleAtom, {
  name: "Live numeric border",
  recipe: {
    kind: "border",
    classification: {},
    appearance: {
      color: { kind: "single", binding: { value: "#000000" } },
      borderWidth: { value: 1 },
    },
    options: [],
    differences: {},
    applications: [],
  },
});
const previewSource = store.get(authoringSourceSnapshotAtom);
const request = (
  kind: EditorPreviewInput["kind"],
  selectedId: string | null = null,
): EditorPreviewInput => ({
  kind,
  source: previewSource,
  selection: {},
  overrides: {},
  selectedId,
});
for (const kind of [
  "spacing",
  "size",
  "radius",
  "icons",
  "icon-analysis",
  "elevation",
  "elevation-analysis",
  "opacity",
] as const) {
  const result = computeEditorPreview(request(kind));
  assert.deepEqual(
    result,
    structuredClone(result),
    `${kind} preview is worker-transferable.`,
  );
}
const baselineStyle = computeEditorPreview(request("styles", fixture.id));
assert.equal(baselineStyle.kind, "styles");
assert(baselineStyle.kind === "styles");
assert.equal(baselineStyle.contexts.error, "");
assert.deepEqual(baselineStyle.artifacts.issues, []);
assert(baselineStyle.artifacts.rows.length > 0);
const nextFixture = {
  ...fixture,
  appearance: { ...fixture.appearance, borderWidth: { value: 5 } },
};
const release = runtime.start();
assert.equal(
  runtime.capture("border-width", () => store.set(saveStyleAtom, nextFixture)),
  true,
);
assert.equal(store.get(authoringSourceSnapshotAtom), previewSource);
const previewStyle = computeEditorPreview({
  ...request("styles", fixture.id),
  source: store.get(numericPreviewSnapshotAtom),
});
assert(previewStyle.kind === "styles");
assert.notDeepEqual(previewStyle.artifacts.rows, baselineStyle.artifacts.rows);
assert.deepEqual(
  previewStyle.artifacts.rows.map((row) => row.token.uuid),
  baselineStyle.artifacts.rows.map((row) => row.token.uuid),
  "A numeric Style preview preserves token identities.",
);
await runtime.flush();
assert.deepEqual(
  computeEditorPreview({
    ...request("styles", fixture.id),
    source: store.get(authoringSourceSnapshotAtom),
  }),
  previewStyle,
  "A Style draft preview agrees with its accepted canonical output.",
);
const spacingSource = store.get(authoringSourceSnapshotAtom);
const scale = spacingSource.spacing!.scales[0];
assert(scale);
const formula = spacingSource.scaleTypes!.find(
  (item) => item.id === scale.scaleTypeId,
);
assert(formula);
const beforeSpacing = computeEditorPreview({
  ...request("spacing"),
  source: spacingSource,
});
assert.equal(
  runtime.capture("spacing-base", () =>
    store.set(updateSpacingScaleAtom, {
      id: scale.id,
      patch: { base: (scale.base ?? formula.base.default) + 2 },
    }),
  ),
  true,
  errors.at(-1),
);
const afterSpacing = computeEditorPreview({
  ...request("spacing"),
  source: store.get(numericPreviewSnapshotAtom),
});
assert(beforeSpacing.kind === "dimension" && afterSpacing.kind === "dimension");
assert.notDeepEqual(
  afterSpacing.scales[0].values,
  beforeSpacing.scales[0].values,
);
assert.equal(store.get(authoringSourceSnapshotAtom), spacingSource);
release();
const layoutSource = store.get(authoringSourceSnapshotAtom);
const base = layoutSource.structures!.structures.find(
  (item) => item.name === "Base",
);
assert(base);
const unavailableElement = createElement("text");
unavailableElement.bindings = [
  {
    id: elementBindingId(unavailableElement.id, "fontSize"),
    slot: "fontSize",
    family: "typography",
    $ref: primitiveReferenceId(
      "typography",
      "unavailable-numeric-font-size",
      0,
    ),
  },
];
assert.throws(
  () =>
    prepareNumericWork({
      source: layoutSource,
      proposals: [
        {
          source: "structures",
          previous: layoutSource.structures,
          next: {
            ...layoutSource.structures,
            structures: layoutSource.structures!.structures.map((item) =>
              item.conceptId === base.conceptId
                ? {
                    ...item,
                    elements: [...(item.elements ?? []), unavailableElement],
                  }
                : item,
            ),
          },
        },
      ],
    }),
  /available|reference|token/i,
  "Worker acceptance retains the Structure element-reference checks.",
);
const layoutEdit = (value: number) => ({
  id: base.conceptId,
  changes: {
    paddingLeft: {
      value: { kind: "number" as const, value, unit: "px" as const },
    },
    paddingRight: {
      value: { kind: "number" as const, value, unit: "px" as const },
    },
  },
  layout: UNMEASURED_LAYOUT,
});
const layoutRelease = runtime.start();
assert.equal(
  runtime.capture("layout-padding", () =>
    store.set(assignStructureAtom, layoutEdit(11)),
  ),
  true,
  errors.at(-1),
);
assert.equal(
  store.get(pendingLayoutScaleAtom),
  null,
  "Typing a numeric proposal must not open the layout-choice dialog.",
);
assert.equal(store.get(authoringSourceSnapshotAtom), layoutSource);
const layoutPreviewInput: EditorPreviewInput = {
  ...request("structures", base.conceptId),
  source: store.get(numericPreviewSnapshotAtom),
};
const layoutPreview = computeEditorPreview(layoutPreviewInput);
assert.equal(layoutPreview.kind, "structures");
assert(layoutPreview.kind === "structures");
assert.deepEqual(layoutPreview, structuredClone(layoutPreview));
const referencesCache: Parameters<typeof computeEditorPreview>[1] = {};
const baselinePreview = computeEditorPreview(
  { ...layoutPreviewInput, source: layoutSource },
  referencesCache,
);
assert(baselinePreview.kind === "structures");
const cachedLayoutPreview = computeEditorPreview(
  layoutPreviewInput,
  referencesCache,
);
assert(cachedLayoutPreview.kind === "structures");
assert.equal(cachedLayoutPreview.references, baselinePreview.references);
assert.deepEqual(
  cachedLayoutPreview,
  layoutPreview,
  "Reusing unchanged primitives preserves current Structure generation.",
);
const padding = layoutPreview.structure!.properties.find(
  (item) => item.id === structureBindingId(base.conceptId, "paddingLeft"),
);
assert(padding && "value" in padding && padding.value.kind === "number");
assert.equal(padding.value.value, 11);
const nextTextSize = layoutSource.typography.textSize + 1;
runtime.capture("layout-related-text", () =>
  store.set(updateTypographyAtom, { textSize: nextTextSize }),
);
const changedFoundationInput = {
  ...layoutPreviewInput,
  source: store.get(numericPreviewSnapshotAtom),
};
const changedFoundationPreview = computeEditorPreview(
  changedFoundationInput,
  referencesCache,
);
assert(changedFoundationPreview.kind === "structures");
assert.notDeepEqual(
  changedFoundationPreview.references,
  cachedLayoutPreview.references,
);
assert.deepEqual(
  changedFoundationPreview,
  computeEditorPreview(changedFoundationInput),
  "Upstream edits invalidate cached primitives and retain canonical agreement.",
);
const applyingLayout = runtime.flush();
await setImmediate();
const choice = store.get(pendingLayoutScaleAtom);
assert(
  choice?.numeric,
  "Flush reuses the existing layout-scale decision flow.",
);
assert.equal(
  runtime.capture("local-only-input", () => {}),
  true,
);
assert.equal(
  store.get(pendingLayoutScaleAtom),
  choice,
  "An unrelated local input cannot cancel an outstanding scale choice.",
);
assert.equal(
  store.get(authoringSourceSnapshotAtom),
  layoutSource,
  "Neither numeric source applies before the choice is resolved.",
);
assert.equal(choice.source.typography.textSize, nextTextSize);
assert.equal(choice.questions.length, 1);
assert.throws(
  () =>
    prepareNumericWork({
      source: layoutSource,
      proposals: [
        {
          source: "structures",
          previous: layoutSource.structures,
          next: choice.source.structures,
        },
      ],
      layoutEdits: [{ edit: choice.edit, application: choice.application }],
      layoutAnswers: [[{ kind: "static" }, { kind: "static" }]],
    }),
  /answers.*match/,
  "Obsolete layout answers cannot be reused for a different question set.",
);
store.set(answerLayoutScaleAtom, { kind: "static" });
await applyingLayout;
assert.equal(store.get(pendingLayoutScaleAtom), null);
assert.equal(
  store.get(authoringSourceSnapshotAtom).typography.textSize,
  nextTextSize,
);
const acceptedLayout = store.get(authoringSourceSnapshotAtom);
const acceptedPadding = acceptedLayout
  .structures!.structures.find((item) => item.conceptId === base.conceptId)!
  .properties.find(
    (item) => item.id === structureBindingId(base.conceptId, "paddingLeft"),
  );
assert(
  acceptedPadding &&
    "value" in acceptedPadding &&
    acceptedPadding.value.kind === "number",
);
assert.equal(acceptedPadding.value.value, 11);
assert.deepEqual(acceptedLayout.styles, layoutSource.styles);
assert.deepEqual(
  acceptedLayout.spacing,
  layoutSource.spacing,
  "Keeping a value static does not create a Foundation scale.",
);
layoutRelease();

const cancelStore = createNumericValidationStore(layoutSource);
const cancelErrors: string[] = [];
const cancelRuntime = createNumericRuntime(
  cancelStore,
  async (input, signal) => {
    signal.throwIfAborted();
    return prepareNumericWork(input);
  },
  (error) => cancelErrors.push(error),
);
const cancelRelease = cancelRuntime.start();
cancelRuntime.capture("layout-padding", () =>
  cancelStore.set(assignStructureAtom, layoutEdit(12)),
);
cancelRuntime.capture("unrelated-text", () =>
  cancelStore.set(updateTypographyAtom, { textSize: nextTextSize }),
);
const cancellingLayout = cancelRuntime.flush();
await setImmediate();
assert(cancelStore.get(pendingLayoutScaleAtom)?.numeric);
cancelStore.set(pendingLayoutScaleAtom, null);
await cancellingLayout;
assert.deepEqual(
  cancelStore.get(authoringSourceSnapshotAtom).structures,
  layoutSource.structures,
  "Cancelling a scale choice discards its temporary Structure edit.",
);
assert.equal(
  cancelStore.get(authoringSourceSnapshotAtom).typography.textSize,
  nextTextSize,
  "Cancelling the choice preserves unrelated numeric proposals.",
);
assert.deepEqual(cancelErrors, []);

cancelRuntime.capture("layout-padding", () =>
  cancelStore.set(assignStructureAtom, layoutEdit(13)),
);
const replacingLayout = cancelRuntime.flush();
await setImmediate();
const obsoleteChoice = cancelStore.get(pendingLayoutScaleAtom);
assert(obsoleteChoice?.numeric);
cancelRuntime.capture("layout-padding", () =>
  cancelStore.set(assignStructureAtom, layoutEdit(14)),
);
await setImmediate();
assert.equal(cancelStore.get(pendingLayoutScaleAtom)?.questions[0].value, 14);
obsoleteChoice.numeric.answer({
  ...obsoleteChoice,
  answers: [{ kind: "static" }],
});
assert.equal(
  cancelStore.get(pendingLayoutScaleAtom)?.questions[0].value,
  14,
  "A superseded dialog cannot resolve the current edit.",
);
cancelStore.set(answerLayoutScaleAtom, { kind: "static" });
await replacingLayout;
assert.equal(cancelStore.get(numericDraftStateAtom).proposals.size, 0);
assert.deepEqual(cancelErrors, []);
cancelRelease();

const scopeStore = createNumericValidationStore(layoutSource);
scopeStore.set(selectedStructureIdAtom, base.conceptId);
const scopeErrors: string[] = [];
const scopeRuntime = createNumericRuntime(
  scopeStore,
  async (input, signal) => {
    signal.throwIfAborted();
    return prepareNumericWork(input);
  },
  (error) => scopeErrors.push(error),
);
const scopeRelease = scopeRuntime.start();
scopeRuntime.capture("scoped-padding", () =>
  scopeStore.set(assignStructureAtom, layoutEdit(15)),
);
const changingScope = scopeRuntime.flush();
await setImmediate();
assert(scopeStore.get(pendingLayoutScaleAtom)?.numeric);
scopeStore.set(selectedStructureIdAtom, null);
await changingScope;
assert.equal(scopeStore.get(pendingLayoutScaleAtom), null);
assert.deepEqual(
  scopeStore.get(authoringSourceSnapshotAtom),
  layoutSource,
  "Leaving the interactive edit cannot apply its value to another owner.",
);
assert.equal(
  scopeErrors.length,
  1,
  "Discarded incomplete choices are reported explicitly.",
);
scopeRelease();

const elevationRelease = runtime.start();
const elevationSource = store.get(authoringSourceSnapshotAtom);
const elevationInput = {
  ...request("elevation-analysis"),
  source: elevationSource,
};
const initialElevation = computeEditorPreview(elevationInput);
assert(initialElevation.kind === "elevation-analysis");
const initialSeries = computeElevationComparison([
  initialElevation.document,
  initialElevation.modeSets,
  initialElevation.activeModes,
  "offsetY",
  initialElevation.document.layers.map((item) => item.id),
  false,
  [],
  initialElevation.preview,
  initialElevation.opacitySource,
]);
assert.deepEqual(
  initialSeries,
  elevationComparisonSeries(
    initialElevation.document,
    initialElevation.modeSets,
    initialElevation.activeModes,
    "offsetY",
    initialElevation.document.layers.map((item) => item.id),
    false,
    [],
    initialElevation.preview,
    initialElevation.opacitySource,
  ),
);
const nextDepth = elevationSource.elevation!.depth === 125 ? 75 : 125;
assert.equal(
  runtime.capture("elevation-depth", () =>
    store.set(updateElevationAtom, { depth: nextDepth }),
  ),
  true,
  errors.at(-1),
);
const proposedElevation = computeEditorPreview({
  ...elevationInput,
  source: store.get(numericPreviewSnapshotAtom),
});
assert(proposedElevation.kind === "elevation-analysis");
const proposedSeries = computeElevationComparison([
  proposedElevation.document,
  proposedElevation.modeSets,
  proposedElevation.activeModes,
  "offsetY",
  proposedElevation.document.layers.map((item) => item.id),
  false,
  [],
  proposedElevation.preview,
  proposedElevation.opacitySource,
]);
assert.notDeepEqual(proposedSeries, initialSeries);
assert.deepEqual(proposedSeries, structuredClone(proposedSeries));
assert.equal(store.get(authoringSourceSnapshotAtom), elevationSource);
await runtime.flush();
assert.deepEqual(
  computeEditorPreview({
    ...elevationInput,
    source: store.get(authoringSourceSnapshotAtom),
  }),
  proposedElevation,
  "Elevation analysis previews agree with accepted canonical inputs.",
);
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom).styles,
  elevationSource.styles,
);
const opacitySource = store.get(authoringSourceSnapshotAtom);
const firstShadow = opacitySource.elevation!.layers[0];
assert(firstShadow);
runtime.capture("shadow-opacity", () =>
  store.set(updateShadowLayerAtom, {
    id: firstShadow.id,
    patch: {
      opacityTokenId: undefined,
      opacity: undefined,
      manualOpacity: 0.37,
    },
  }),
);
const opacityPreview = computeEditorPreview({
  ...request("elevation"),
  source: store.get(numericPreviewSnapshotAtom),
});
assert(opacityPreview.kind === "elevation");
assert.equal(opacityPreview.levels[0].shadows[0].opacity, 0.37);
assert.equal(store.get(authoringSourceSnapshotAtom), opacitySource);
await runtime.flush();
assert.deepEqual(
  computeEditorPreview({
    ...request("elevation"),
    source: store.get(authoringSourceSnapshotAtom),
  }),
  opacityPreview,
  "Custom shadow opacity previews agree with canonical acceptance.",
);
elevationRelease();
const unresolvedShadowSource = {
  ...elevationSource,
  elevation: {
    ...elevationSource.elevation!,
    layers: elevationSource.elevation!.layers.map((layer) => ({
      ...layer,
      manualOpacity: undefined,
      opacity: undefined,
      opacityTokenId: crypto.randomUUID(),
    })),
  },
};
const unresolvedShadowStore = createNumericValidationStore(
  unresolvedShadowSource,
);
const depthInput = { parameterId: "elevation.depth" as const, value: 110 };
assert.throws(
  () => unresolvedShadowStore.set(updateElevationModeParameterAtom, depthInput),
  /opacity token.*unavailable/i,
);
const depthProposals = collectNumericProposals(() =>
  unresolvedShadowStore.set(updateElevationModeParameterAtom, depthInput),
);
assert(
  depthProposals.length > 0,
  "Numeric mode controls defer generation until background acceptance.",
);
assert.throws(
  () =>
    prepareNumericWork({
      source: unresolvedShadowSource,
      proposals: depthProposals,
    }),
  /opacity token.*unavailable/i,
  "Deferring generation does not bypass canonical reference validation.",
);

const dataVisSource = store.get(authoringSourceSnapshotAtom);
const dataVisInput: DataVisPreviewInput = {
  source: dataVisSource,
  selection: {},
  overrides: {},
};
const dataVisPacket = computeDataVisPreview(dataVisInput);
assert.deepEqual(
  structuredClone(dataVisPacket),
  dataVisPacket,
  "Data vis worker results contain no evaluator functions.",
);
type DataVisPort = PreviewWorkerPort<DataVisPreviewInput, DataVisPreview> & {
  jobs: PreviewRequest<DataVisPreviewInput>[];
  terminated: boolean;
};
const ports: DataVisPort[] = [];
const dataVisRuntime = createDataVisPreviewRuntime(store, () => {
  const port: DataVisPort = {
    jobs: [],
    terminated: false,
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage(input) {
      this.jobs.push(input);
    },
    terminate() {
      this.terminated = true;
    },
  };
  ports.push(port);
  return port;
});
const firstSubscriber = dataVisRuntime.subscribe(() => {});
const secondSubscriber = dataVisRuntime.subscribe(() => {});
assert.equal(
  ports.length,
  1,
  "The editor and visible preview share one worker.",
);
const replyTo = (port: DataVisPort, index: number, value: DataVisPreview) => {
  const reply: PreviewReply<DataVisPreview> = {
    id: port.jobs[index].id,
    reply: { type: "ready", value },
  };
  port.onmessage?.(new MessageEvent("message", { data: reply }));
};
replyTo(ports[0], 0, dataVisPacket);
assert.equal(dataVisRuntime.getSnapshot().status, "ready");
const hydrated = dataVisRuntime.getSnapshot().ready!;
const canonicalContinuous = store.get(dataVisContinuousOutputsAtom);
for (const output of hydrated.outputs) {
  if (output.status !== "ready") continue;
  const canonical = canonicalContinuous.find(
    (candidate) =>
      candidate.status === "ready" && candidate.scale.id === output.scale.id,
  );
  assert(canonical?.status === "ready");
  assert.deepEqual(output.scale.diagnostics, canonical.scale.diagnostics);
  const display = hydrated.displays.find(
    (item) => item.definition.id === output.scale.id,
  );
  assert(display?.status === "ready");
  assert.deepEqual(
    display.examples,
    quantitativeExample(canonical.scale.kind, canonical.scale.evaluate),
    "Worker-prepared chart records use the canonical continuous evaluator.",
  );
  for (const position of [-1, 0, 0.125, 0.5, 0.875, 1, 2])
    assert.equal(
      output.scale.evaluate(position),
      canonical.scale.evaluate(position),
      "Restored browser evaluators use the canonical continuous function.",
    );
}
const liveDataVisScale = dataVisSource.colorSystem.dataVisScales.find(
  (scale) =>
    scale.kind === "sequential" &&
    !scale.staticColors &&
    scale.points.length > 2,
);
assert(liveDataVisScale?.kind === "sequential");
const movedPoint = liveDataVisScale.points[1];
const dataVisRelease = runtime.start();
const movePoint = (position: number) =>
  runtime.capture("data-vis-position", () =>
    store.set(editDataVisPointAtom, {
      scaleId: liveDataVisScale.id,
      pointId: movedPoint.id,
      position,
      scope: "base",
    }),
  );
movePoint(0.2);
assert.equal(ports[0].jobs.length, 2);
assert.equal(dataVisRuntime.getSnapshot().ready, hydrated);
runtime.setError("data-vis-position", "Finish entering this position.");
runtime.setError("data-vis-position");
assert.equal(
  ports[0].jobs.length,
  2,
  "Draft-status changes do not regenerate an unchanged preview.",
);
movePoint(0.23);
assert.equal(ports[0].jobs.length, 2, "New edits replace the queued request.");
replyTo(ports[0], 1, dataVisPacket);
assert.equal(
  dataVisRuntime.getSnapshot().ready,
  hydrated,
  "An obsolete reply cannot replace the last coherent preview.",
);
assert.equal(ports[0].jobs.length, 3);
const movedPacket = computeDataVisPreview(ports[0].jobs[2].input);
assert.deepEqual(structuredClone(movedPacket), movedPacket);
assert.notDeepEqual(movedPacket.displays, dataVisPacket.displays);
assert.deepEqual(
  movedPacket.swatches,
  dataVisPacket.swatches,
  "Moving a continuous point does not change unrelated UI color tokens.",
);
replyTo(ports[0], 2, movedPacket);
assert.equal(store.get(authoringSourceSnapshotAtom), dataVisSource);
const analysisDisplay = movedPacket.displays.find(
  (display) => display.definition.id === liveDataVisScale.id,
);
assert(analysisDisplay?.status === "ready");
const analysisInput = {
  observations: analysisDisplay.observations,
  background: dataVisBackground(movedPacket.document),
  gamut: renderGamutForOutput(movedPacket.document.settings.colorOutput),
  metric: "contrast" as const,
  profile: "deuteranopia" as const,
  reference: { kind: "all" as const },
  page: 0,
};
const dataVisAnalysis = computeDataVisAnalysis(analysisInput);
assert.deepEqual(dataVisAnalysis, {
  points: dataVisMetricPoints(
    analysisInput.observations,
    analysisInput.background,
    analysisInput.gamut,
    analysisInput.metric,
  ),
  ...dataVisComparisonPage(
    analysisInput.observations,
    analysisInput.background,
    analysisInput.gamut,
    analysisInput.profile,
    analysisInput.reference,
    analysisInput.page,
    50,
  ),
});
assert.deepEqual(structuredClone(dataVisAnalysis), dataVisAnalysis);
assert.throws(
  () =>
    computeDataVisAnalysis({
      ...analysisInput,
      reference: { kind: "color", id: "removed-color" },
    }),
  /unavailable/,
  "Invalid analysis selections report an error rather than old success.",
);
await runtime.flush();
const acceptedDataVisPacket = computeDataVisPreview({
  ...dataVisInput,
  source: store.get(authoringSourceSnapshotAtom),
});
assert.deepEqual(
  acceptedDataVisPacket,
  movedPacket,
  "Data vis proposals agree with the accepted canonical output.",
);
firstSubscriber();
assert.equal(
  ports[0].terminated,
  false,
  "A remaining consumer keeps the shared worker warm.",
);
secondSubscriber();
assert.equal(ports[0].terminated, true);
assert.equal(dataVisRuntime.getSnapshot().ready, undefined);
const remount = dataVisRuntime.subscribe(() => {});
assert.equal(ports.length, 2, "Remount creates a fresh worker after disposal.");
replyTo(ports[1], 0, acceptedDataVisPacket);
const beforeWorkerFailure = dataVisRuntime.getSnapshot().ready;
ports[1].onmessageerror?.(new MessageEvent("messageerror"));
assert.equal(dataVisRuntime.getSnapshot().status, "unavailable");
assert(dataVisRuntime.getSnapshot().error);
assert.equal(dataVisRuntime.getSnapshot().ready, beforeWorkerFailure);
dataVisRuntime.retry();
assert.equal(ports.length, 3);
replyTo(ports[2], 0, acceptedDataVisPacket);
assert.equal(dataVisRuntime.getSnapshot().status, "ready");
remount();
assert.equal(ports[2].terminated, true);
dataVisRelease();
console.log(
  "Numeric acceptance agrees with canonical writes and rejects invalid candidates.",
);
