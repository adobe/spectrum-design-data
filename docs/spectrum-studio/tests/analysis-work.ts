// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSourceSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../src/features/edit-session/state";
import { updateColorSystemSettingsAtom } from "../src/features/color-system/state";
import {
  analysisAuthoringAtom,
  analysisSavedInputAtom,
  analysisWorkingInputAtom,
} from "../src/features/design-data/state";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";
import {
  canonicalJson,
  compareDesignData,
  type AnalysisInput,
} from "../src/features/design-data/comparison";
import {
  computeAnalysisComparison,
  computeAnalysisGaps,
} from "../src/features/design-data/analysisWork";
import { assessGaps, gapRegister } from "../src/features/design-data/gaps";
import { VALUE_CONTEXT_POLICY } from "../src/features/design-data/colorOpacityAssessment";
import { editModeAtom } from "../src/state/view/editMode";

const defaults = defaultsAnalysisInput();
const reference: AnalysisInput = {
  source: {
    ...defaults.source,
    kind: "reference",
    hash: "fixture",
    revision: gapRegister.gaps[0].revision,
    dirty: false,
  },
  records: defaults.records
    .filter((record) => record.category === "tokens")
    .slice(0, 8),
  categories: ["tokens"],
  schemas: [],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
};
const defaultSource = {
  dataset: "defaults" as const,
  get saved(): never {
    throw new Error("Defaults must not project saved authoring.");
  },
  get working(): never {
    throw new Error("Defaults must not project working authoring.");
  },
};
const shipped = await computeAnalysisComparison({
  type: "compare",
  source: defaultSource,
  reference,
});
assert.equal(
  canonicalJson(shipped.app.records),
  canonicalJson(defaults.records),
);
assert.match(shipped.app.source.hash, /^[a-f0-9]{64}$/);
assert.equal(shipped.unsaved, undefined);
assert.deepEqual(shipped.report, compareDesignData(shipped.app, reference));

{
  const unavailable = await computeAnalysisComparison(
    {
      type: "compare",
      source: defaultSource,
      cachedApp: shipped.app,
      reference,
      resolveValues: true,
    },
    async () => {
      throw new Error("WASM initialization failed.");
    },
  );
  assert(
    unavailable.app.limitations.some((message) =>
      message.includes("WASM initialization failed."),
    ),
  );
  assert(unavailable.report, "Resolution failure must not block comparison.");
  let resolutions = 0;
  const resolve = async (input: AnalysisInput, reference?: AnalysisInput) => {
    resolutions += 1;
    return {
      ...input,
      valueResolution: {
        datasetHash: input.source.hash,
        ...(reference && { referenceHash: reference.source.hash }),
        contextPolicy: VALUE_CONTEXT_POLICY,
        engine: "fixture",
      },
      resolvedValues: [],
    };
  };
  const updated = await computeAnalysisComparison(
    {
      type: "compare",
      source: defaultSource,
      reference,
      resolveValues: true,
      cachedApp: {
        ...shipped.app,
        valueResolution: {
          datasetHash: shipped.app.source.hash,
          referenceHash: reference.source.hash,
          contextPolicy: "old-policy",
          engine: "fixture",
        },
      },
    },
    resolve,
  );
  assert.equal(
    resolutions,
    2,
    "An older context policy must be resolved again.",
  );
  assert.equal(
    updated.app.valueResolution?.contextPolicy,
    VALUE_CONTEXT_POLICY,
  );
  await computeAnalysisComparison(
    {
      type: "compare",
      source: defaultSource,
      reference: updated.reference,
      resolveValues: true,
      cachedApp: updated.app,
    },
    resolve,
  );
  assert.equal(
    resolutions,
    2,
    "Current policy and reference evidence may be reused.",
  );
}

const store = createStore();
store.set(editSessionSnapshotAtom, createDefaultSnapshot());
store.set(editModeAtom, true);
store.set(updateColorSystemSettingsAtom, { backgroundBlend: 0.7 });
const snapshots = {
  working: store.get(authoringSourceSnapshotAtom),
  saved: store.get(editSessionSnapshotAtom)!,
};
for (const dataset of ["saved", "working"] as const) {
  const result = await computeAnalysisComparison({
    type: "compare",
    source: { dataset, ...snapshots },
    reference,
  });
  const expected = store.get(
    dataset === "saved" ? analysisSavedInputAtom : analysisWorkingInputAtom,
  );
  assert.equal(
    canonicalJson(result.app.records),
    canonicalJson(expected.records),
    `${dataset}: exact native projection`,
  );
  assert.deepEqual(
    result.app.outputMetadata,
    expected.outputMetadata,
    `${dataset}: exact provenance`,
  );
  assert.deepEqual(result.app.errors, expected.errors);
  assert.equal(result.unsaved, store.get(analysisAuthoringAtom).unsaved);
  assert.deepEqual(result.report, compareDesignData(result.app, reference));
  const reused = await computeAnalysisComparison({
    type: "compare",
    source: { dataset, ...snapshots },
    reference,
    cachedApp: result.app,
  });
  assert.equal(
    reused.app,
    result.app,
    "Unchanged selected inputs reuse their complete projection.",
  );
  assert.deepEqual(reused, result);
  for (const stale of [false, true]) {
    const gaps = computeAnalysisGaps({
      type: "gaps",
      comparison: result,
      reference,
      saved: snapshots.saved,
      stale,
    });
    assert.deepEqual(
      gaps.selected,
      assessGaps(
        result.app,
        reference,
        result.report!.findings,
        gapRegister,
        stale,
      ),
    );
    const saved = store.get(analysisSavedInputAtom);
    assert.deepEqual(
      gaps.saved,
      assessGaps(
        saved,
        reference,
        compareDesignData(saved, reference).findings,
        gapRegister,
        stale,
      ),
    );
    if (stale)
      assert(
        gaps.saved.every((gap) =>
          gap.criteria.every((criterion) => !criterion.passed),
        ),
      );
  }
}
const noReference = await computeAnalysisComparison({
  type: "compare",
  source: defaultSource,
  cachedApp: shipped.app,
});
assert.equal(noReference.report, undefined);
assert(
  computeAnalysisGaps({
    type: "gaps",
    comparison: noReference,
    saved: snapshots.saved,
    stale: false,
  }).selected.every((gap) => gap.disposition === "unassessable"),
);
await assert.rejects(
  computeAnalysisComparison({
    type: "compare",
    source: { dataset: "saved", ...snapshots },
    cachedApp: shipped.app,
  }),
  /different dataset/,
);
const invalid = structuredClone(snapshots.working);
invalid.colorSystem.backgroundScaleId = "missing";
const failed = await computeAnalysisComparison({
  type: "compare",
  source: { dataset: "working", working: invalid, saved: snapshots.saved },
  reference,
});
assert(failed.app.errors.length > 0);
assert.equal(failed.report?.valid, false);
assert.notEqual(
  canonicalJson(failed.app.records),
  canonicalJson(defaults.records),
  "Invalid input never borrows shipped output.",
);
console.log(
  "Analysis work: exact selected projections, hashes, reports, saved gap evidence, reuse, stale/unavailable evidence and invalid inputs passed.",
);
