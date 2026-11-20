// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  sliderDraftEvents,
  sliderPreviewEvents,
} from "../src/components/editable/useSliderDraft";
import {
  clearPreviewParametersAtom,
  previewOverridesAtom,
  previewResetVersionsAtom,
  setPreviewParameterAtom,
} from "../src/features/modes/previewState";

const frames = new Map<number, () => void>();
const cancelled: number[] = [];
const published: number[] = [];
let sequence = 0;
const preview = sliderPreviewEvents(
  (value) => published.push(value),
  (callback) => {
    const handle = ++sequence;
    frames.set(handle, callback);
    return handle;
  },
  (handle) => cancelled.push(handle),
);
preview.change(1);
preview.change(2);
preview.change(3);
assert.equal(frames.size, 1);
assert.deepEqual(published, []);
frames.get(1)!();
assert.deepEqual(published, [3]);

preview.change(4);
preview.cancel();
frames.get(2)!();
assert.deepEqual(published, [3], "A cancelled frame cannot publish.");
preview.change(5);
preview.change(6);
frames.get(3)!();
assert.deepEqual(published, [3, 6], "A later drag can publish normally.");
assert.deepEqual(cancelled, [2]);

const accepted: number[] = [];
const pending = { current: undefined as number | undefined };
const events = sliderDraftEvents(
  pending,
  6,
  () => {},
  (value) => accepted.push(value),
);
events.onChange(7);
preview.change(7);
events.onChange(8);
preview.change(8);
preview.cancel();
events.onChangeEnd(8);
frames.get(4)!();
events.flush();
assert.deepEqual(accepted, [8], "Release accepts the latest value once.");
assert.deepEqual(
  published,
  [3, 6],
  "Queued preview work must not overwrite the released value.",
);
const deferredValues: number[] = [];
let shown: number | undefined;
const live = sliderDraftEvents(
  { current: undefined },
  6,
  (value) => {
    shown = value;
  },
  (value) => deferredValues.push(value),
  true,
);
live.onChange(7);
live.onChangeEnd(7);
assert.equal(
  shown,
  7,
  "Release retains the draft while acceptance is pending.",
);
live.onChange(8);
live.onChangeEnd(6);
assert.equal(shown, 6);
assert.deepEqual(
  deferredValues,
  [7, 6],
  "Release back to the accepted baseline must replace an earlier proposal.",
);
const store = createStore();
store.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 3,
});
const first = store.get(previewOverridesAtom);
store.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 3,
});
assert.equal(
  store.get(previewOverridesAtom),
  first,
  "Settling an already displayed preview does not invalidate its consumers.",
);
store.set(setPreviewParameterAtom, {
  parameterId: "color.contrastMultiplier",
  value: 2,
});
store.set(clearPreviewParametersAtom, ["typography.textZoom"]);
assert.deepEqual(store.get(previewOverridesAtom), {
  "color.contrastMultiplier": 2,
});
assert.deepEqual(store.get(previewResetVersionsAtom), {
  "typography.textZoom": 1,
});
store.set(clearPreviewParametersAtom, ["typography.textZoom"]);
assert.equal(
  store.get(previewResetVersionsAtom)["typography.textZoom"],
  2,
  "Reset invalidates a queued first frame even before an override exists.",
);
console.log("Live slider coalescing, cancellation and release checks passed.");
