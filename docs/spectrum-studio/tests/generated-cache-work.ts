// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  createTshirtCacheWriter,
  hashArtifactText,
  prepareTshirtCache,
  prepareTshirtWorkResult,
  TSHIRT_CACHE_KEY,
} from "../src/features/design-data/tshirtCache";
import { TSHIRT_PROFILE } from "../src/features/design-data/tshirtProfile";
import type { TshirtArtifactBundle } from "../src/features/design-data/tshirtTypes";

const source = createDefaultSnapshot();
const bundle: TshirtArtifactBundle = {
  profile: TSHIRT_PROFILE,
  sourceKind: "working",
  tokens: [],
  semantics: [],
  primitiveLineage: [],
  diagnostics: [],
  fields: [],
  vocabulary: {
    structures: [{ id: "example", label: "Original", value: "example" }],
    foundationScales: [],
    physicalPositions: [],
  },
  modeSets: [],
};
const pending = prepareTshirtCache(source, bundle);
bundle.vocabulary.structures[0].label = "Later edit";
const prepared = await pending;
assert.equal(
  JSON.parse(prepared.serialized).bundle.vocabulary.structures[0].label,
  "Original",
  "The worker result owns its captured data even when the caller edits later.",
);
const values = new Map<string, string>();
let writes = 0;
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    writes++;
    values.set(key, value);
  },
};
let mainThreadHashes = 0;
const writer = createTshirtCacheWriter(storage, async (text) => {
  mainThreadHashes++;
  return hashArtifactText(text);
});
const unreadableBundle = {
  ...bundle,
  get tokens(): TshirtArtifactBundle["tokens"] {
    throw new Error("Prepared output must not be cloned or encoded again.");
  },
};
assert.equal(
  (await writer.update(source, unreadableBundle, prepared)).status,
  "ready",
);
assert.equal(storage.getItem(TSHIRT_CACHE_KEY), prepared.serialized);
assert.equal(mainThreadHashes, 0);
await writer.update(source, unreadableBundle, prepared);
assert.equal(writes, 1, "Identical completed cache output is not rewritten.");
assert.equal(mainThreadHashes, 0);
values.set(TSHIRT_CACHE_KEY, prepared.serialized.replace("Original", "Forged"));
const repaired = await writer.update(source, unreadableBundle, prepared);
assert(repaired.status === "ready" && repaired.repaired);
assert.equal(storage.getItem(TSHIRT_CACHE_KEY), prepared.serialized);
values.set(TSHIRT_CACHE_KEY, "{broken");
assert.equal(
  (await writer.update(source, unreadableBundle, prepared)).status,
  "ready",
);
assert.equal(storage.getItem(TSHIRT_CACHE_KEY), prepared.serialized);
const superseded = writer.update(source, bundle);
writer.invalidate();
assert.equal((await superseded).status, "superseded");
const withoutCache = await prepareTshirtWorkResult(source, bundle, async () => {
  throw new Error("Injected cache encoding failure.");
});
assert.equal(withoutCache.bundle, bundle);
assert.deepEqual(withoutCache.cache, {
  status: "unavailable",
  error: "Injected cache encoding failure.",
});
console.log(
  "Generated cache work: captured bytes, no repeated main-thread encoding/hash, unchanged-write suppression, repair and cancellation passed.",
);
