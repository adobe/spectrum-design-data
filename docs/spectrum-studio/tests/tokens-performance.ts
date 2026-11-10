// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createStore } from "jotai";
import {
  colorSystemDocumentAtom,
  updateColorStopAtom,
} from "../src/features/color-system/state";
import { generatedColorTokensAtom } from "../src/features/tokens/state";
import "../src/features/edit-session/state";

const store = createStore();
store.get(generatedColorTokensAtom);
const scales = store.get(colorSystemDocumentAtom).scales;
const start = performance.now();
for (let iteration = 0; iteration < 20; iteration += 1) {
  const scale = scales[iteration % scales.length];
  store.set(updateColorStopAtom, {
    scaleId: scale.id,
    stopId: scale.stops[0].id,
    chroma: 20 + (iteration % 10),
  });
  store.get(generatedColorTokensAtom);
}
const averageMs = (performance.now() - start) / 20;
assert.ok(
  averageMs < 16,
  `single-scale token regeneration averaged ${averageMs.toFixed(2)}ms, budget is 16ms`,
);
console.log(`tokens: ${averageMs.toFixed(2)}ms average regeneration`);
