// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import {
  analysisInputInvalidator,
  analysisWatchEvents,
} from "../scripts/design-data-vite";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { computeAnalysisComparison } from "../src/features/design-data/analysisWork";
import {
  canonicalJson,
  type AnalysisInput,
} from "../src/features/design-data/comparison";
import { VALUE_CONTEXT_POLICY } from "../src/features/design-data/colorOpacityAssessment";
import { isInventoryToken } from "../src/features/design-data/tokenInventory";

const roots = [
  "packages/design-data",
  "packages/design-data-spec",
  "src/features",
  "src/data",
].map((path) => resolve(path));
const documents = [resolve("docs/design-data-target-contract.md")];
const watcher = new EventEmitter();
let revision = 0;
let cached: string | undefined = "old";
const invalidate = analysisInputInvalidator(roots, documents, () => {
  cached = undefined;
  revision++;
});
for (const event of analysisWatchEvents) watcher.on(event, invalidate);
for (const [event, path] of [
  ["add", "packages/design-data/tokens/new.json"],
  ["change", "packages/design-data/tokens/typography.tokens.json"],
  ["unlink", "packages/design-data/tokens/removed.json"],
  ["change", "packages/design-data/registry/property-terms.json"],
  ["change", "packages/design-data-spec/schemas/token-types/new.json"],
  ["change", "src/data/design-system.defaults.json"],
  ["change", "src/features/typography/typographyGeneration.ts"],
  ["addDir", "packages/design-data/tokens/future"],
  ["unlinkDir", "packages/design-data"],
] as const) {
  const before = revision;
  cached = "old";
  watcher.emit(event, resolve(path));
  assert.equal(
    revision,
    before + 1,
    `${event} ${path} must invalidate source evidence.`,
  );
  assert.equal(cached, undefined);
}
const latest = revision;
watcher.emit(
  "change",
  resolve("packages/design-data/node_modules/ignored.json"),
);
watcher.emit(
  "change",
  resolve("packages/design-data-sibling/tokens/ignored.json"),
);
assert.equal(
  revision,
  latest,
  "Unrelated files do not invalidate source evidence.",
);
for (const event of analysisWatchEvents) watcher.off(event, invalidate);
assert(
  analysisWatchEvents.every((event) => watcher.listenerCount(event) === 0),
);

const saved = createDefaultSnapshot();
const working = structuredClone(saved);
working.typography.largeSizes = saved.typography.largeSizes === 14 ? 13 : 14;
const before = canonicalJson({ saved, working });
const reference: AnalysisInput = {
  source: {
    kind: "reference",
    hash: "initial",
    revision: "fixture",
    root: "fixture",
    version: "fixture",
    dirty: false,
    validator: "fixture",
  },
  records: [],
  errors: [],
  limitations: [],
  schemas: [],
  categories: [],
  inventoryStatus: "complete",
};
const savedResult = await computeAnalysisComparison({
  type: "compare",
  source: { dataset: "saved", saved, working },
  reference,
});
const workingResult = await computeAnalysisComparison({
  type: "compare",
  source: { dataset: "working", saved, working },
  reference,
});
const tokenIds = (input: AnalysisInput) =>
  input.records
    .filter(isInventoryToken)
    .map((row) => row.id)
    .sort();
assert.notDeepEqual(
  tokenIds(savedResult.app),
  tokenIds(workingResult.app),
  "Scale range changes propagate into working inventory.",
);
assert.notEqual(savedResult.app.source.hash, workingResult.app.source.hash);
assert.equal(workingResult.unsaved, true);
assert.equal(
  canonicalJson({ saved, working }),
  before,
  "Analysis does not alter or save either snapshot.",
);
assert.deepEqual(
  workingResult
    .report!.colorOpacity!.inventory!.entries.filter(
      (entry) => entry.side === "app",
    )
    .map((entry) => entry.record.id)
    .sort(),
  tokenIds(workingResult.app),
);
const zoomed = structuredClone(working);
const scaling = zoomed.modeSets.find((set) => set.key === "textScaling")!;
const larger = scaling.modes.find((mode) => mode.key === "larger")!;
larger.foundations.typography = {
  ...larger.foundations.typography,
  textZoom: 3,
};
const zoomedBefore = canonicalJson(zoomed);
const zoomedResult = await computeAnalysisComparison({
  type: "compare",
  source: { dataset: "working", saved, working: zoomed },
  reference,
});
const baseline = (input: AnalysisInput) =>
  input.records
    .filter(
      (row) =>
        row.name === "text-size-100" && row.context?.textScaling === "default",
    )
    .map((row) => row.value);
const largerValues = (input: AnalysisInput) =>
  input.records
    .filter(
      (row) =>
        row.name === "text-size-100" && row.context?.textScaling === "larger",
    )
    .map((row) => row.value);
assert.deepEqual(baseline(zoomedResult.app), baseline(workingResult.app));
assert.notDeepEqual(
  largerValues(zoomedResult.app),
  largerValues(workingResult.app),
);
assert.equal(canonicalJson(zoomed), zoomedBefore);
const hidden = structuredClone(saved);
hidden.typography.hideFromPublishing = true;
const hiddenResult = await computeAnalysisComparison({
  type: "compare",
  source: { dataset: "working", saved, working: hidden },
  reference,
});
assert(
  hiddenResult.report!.colorOpacity!.inventory!.exclusions.some(
    (item) =>
      item.source === "/system/foundations/typography" &&
      item.reason.includes("excluded from publishing"),
  ),
);
const originalFetch = globalThis.fetch;
const requests: string[] = [];
try {
  let referenceHash = reference.source.hash;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body)) as AnalysisInput;
    requests.push(body.source.hash);
    return Response.json({
      resolvedValues: [],
      valueResolution: {
        datasetHash: body.source.hash,
        referenceHash,
        contextPolicy: VALUE_CONTEXT_POLICY,
        engine: "fixture",
      },
    });
  };
  const initial = await computeAnalysisComparison({
    type: "compare",
    source: { dataset: "working", saved, working },
    cachedApp: workingResult.app,
    reference,
    resolveValues: true,
  });
  assert.equal(requests.length, 1);
  referenceHash = "updated";
  const nextReference = {
    ...reference,
    source: { ...reference.source, hash: referenceHash },
    records: [
      {
        id: "new-reference-type",
        category: "tokens",
        name: "future-token",
        source: "fixture",
        pointer: "",
        classification: "authored" as const,
        structuredName: { property: "future-property" },
        value: 1,
      },
    ],
  };
  const updated = await computeAnalysisComparison({
    type: "compare",
    source: { dataset: "working", saved, working },
    cachedApp: initial.app,
    reference: nextReference,
    resolveValues: true,
  });
  assert.equal(
    requests.length,
    2,
    "A new reference fingerprint invalidates resolved evidence.",
  );
  assert(
    updated.report!.colorOpacity!.inventory!.entries.some(
      (entry) => entry.record.id === "new-reference-type",
    ),
  );
  assert.deepEqual(tokenIds(updated.app), tokenIds(workingResult.app));
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  "Reference add/change/remove/schema/directory invalidation, working/saved membership and resolution-cache refresh pass.",
);
