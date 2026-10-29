// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createStore } from "jotai";
import {
  LatestRequest,
  type DerivedState,
} from "../src/features/derived-work/LatestRequest";
import {
  asyncComparisonAtom,
  comparisonPublicationAtom,
  comparisonRequestAtom,
  retryComparisonAtom,
} from "../src/features/changelog/asyncComparisonState";
import { computeComparison } from "../src/features/changelog/computeComparison";
import {
  authoredComparisonAtom,
  parityChangeGroupsAtom,
  tokenComparisonResultAtom,
} from "../src/features/changelog/comparisonState";
import type {
  ComparisonOutput,
  ComparisonProgress,
} from "../src/features/changelog/comparisonWork";
import {
  dimensionArtifactRequestAtom,
  tshirtArtifactSourceAtom,
} from "../src/features/design-data/artifactSources";
import {
  dimensionArtifactPublicationAtom,
  dimensionArtifactStateAtom,
} from "../src/features/design-data/dimensionArtifactState";
import { computeDimensionWork } from "../src/features/design-data/dimensionWork";
import { enterEditModeAtom } from "../src/features/edit-session/state";
import { platformsAtom } from "../src/features/platforms/state";
import { spacingDocumentAtom } from "../src/features/spacing/state";

mock.timers.enable({ apis: ["setTimeout"] });
const publications: DerivedState<string, string, string>[] = [];
const requests: {
  input: string;
  signal: AbortSignal;
  progress: (value: string) => void;
  resolve: (value: string) => void;
  reject: (failure: Error) => void;
}[] = [];
const controller = new LatestRequest<string, string, string>(
  (input, signal, progress) =>
    new Promise((resolve, reject) => {
      requests.push({ input, signal, progress, resolve, reject });
    }),
  (state) => publications.push(state),
);
async function advance(ms = 0) {
  mock.timers.tick(ms);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

controller.request("obsolete");
controller.request("latest");
await advance(99);
assert.equal(requests.length, 0);
await advance(1);
assert.equal(requests.length, 1);
assert.equal(requests[0].input, "latest");
requests[0].progress("authored");
assert.equal(publications.at(-1)?.status, "pending");
controller.request("newer", "visible");
assert.equal(requests[0].signal.aborted, true);
await advance();
requests[0].resolve("old output");
await advance();
assert.notEqual(publications.at(-1)?.status, "ready");
requests[1].resolve("new output");
await advance();
assert.deepEqual(publications.at(-1), {
  status: "ready",
  input: "newer",
  value: "new output",
});
requests[1].progress("late partial");
assert.equal(publications.at(-1)?.status, "ready");

controller.request("failure", "visible");
await advance();
requests[2].reject(new Error("Explicit worker failure"));
await advance();
assert.deepEqual(publications.at(-1), {
  status: "unavailable",
  input: "failure",
  error: "Explicit worker failure",
});
controller.retry();
await advance();
requests[3].resolve("recovered");
await advance();
assert.equal(publications.at(-1)?.status, "ready");
controller.request("cancelled", "nearby");
await advance();
controller.cancel();
const beforeCancellationReply = publications.length;
requests[4].reject(new Error("Cancelled failure"));
await advance();
assert.equal(publications.length, beforeCancellationReply);
controller.request("promoted");
controller.request("promoted", "visible");
await advance();
assert.equal(requests.at(-1)?.input, "promoted");
controller.cancel();
const beforeQueuedCancellation = requests.length;
controller.request("cancel-before-execution", "visible");
mock.timers.tick(0);
controller.cancel();
await advance();
assert.equal(requests.length, beforeQueuedCancellation);
mock.timers.reset();

const store = createStore();
const input = store.get(comparisonRequestAtom);
let partial: ComparisonProgress | undefined;
const result: ComparisonOutput = computeComparison(input, (value) => {
  partial = value;
});
assert(partial);
assert.deepEqual(result.authored, store.get(authoredComparisonAtom));
assert.deepEqual(result.groups, store.get(parityChangeGroupsAtom));
const synchronousTokens = store.get(tokenComparisonResultAtom);
assert.equal(result.tokens.status, synchronousTokens.status);
if (result.tokens.status === "ready" && synchronousTokens.status === "ready") {
  assert.deepEqual(result.tokens.comparison, synchronousTokens.comparison);
}
store.set(comparisonPublicationAtom, { status: "pending", input, partial });
assert.equal(store.get(asyncComparisonAtom).status, "pending");
store.set(comparisonPublicationAtom, { status: "ready", input, value: result });
assert.equal(store.get(asyncComparisonAtom).status, "ready");
store.set(retryComparisonAtom);
assert.notEqual(store.get(comparisonRequestAtom), input);
assert.equal(
  store.get(asyncComparisonAtom).status,
  "pending",
  "An older result must not become current after a retry.",
);
store.set(comparisonPublicationAtom, {
  status: "unavailable",
  input,
  error: "Obsolete failure",
});
assert.equal(store.get(asyncComparisonAtom).status, "pending");
const sources = createStore();
sources.set(enterEditModeAtom);
const dimensionInput = sources.get(dimensionArtifactRequestAtom),
  tshirtInput = sources.get(tshirtArtifactSourceAtom);
sources.set(platformsAtom, (platforms) =>
  platforms.map((platform, index) =>
    index ? platform : { ...platform, name: "Renamed platform" },
  ),
);
assert.equal(
  sources.get(dimensionArtifactRequestAtom),
  dimensionInput,
  "Unrelated metadata must not regenerate dimensions.",
);
assert.equal(
  sources.get(tshirtArtifactSourceAtom),
  tshirtInput,
  "Unrelated metadata must not regenerate semantic cache output.",
);
const dimensions = await computeDimensionWork(dimensionInput);
sources.set(dimensionArtifactPublicationAtom, {
  ...dimensions,
  input: dimensionInput,
  status: "ready",
  isSaved: true,
});
assert.equal(sources.get(dimensionArtifactStateAtom).status, "ready");
sources.set(spacingDocumentAtom, (document) => ({
  ...document,
  scales: document.scales.map((scale, index) =>
    index ? scale : { ...scale, base: 12 },
  ),
}));
assert.notEqual(sources.get(dimensionArtifactRequestAtom), dimensionInput);
assert.notEqual(sources.get(tshirtArtifactSourceAtom), tshirtInput);
assert.equal(
  sources.get(dimensionArtifactStateAtom).status,
  "pending",
  "Changed input invalidates actionability before an effect runs.",
);
sources.set(dimensionArtifactPublicationAtom, {
  ...dimensions,
  input: dimensionInput,
  status: "ready",
  isSaved: true,
});
assert.equal(
  sources.get(dimensionArtifactStateAtom).isSaved,
  false,
  "An obsolete artifact cannot become current after a late reply.",
);
console.log(
  "Prioritized work: coalescing, cancellation, promotion, stale replies, partial results, retry and canonical Changes parity passed.",
);
