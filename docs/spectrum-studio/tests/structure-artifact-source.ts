// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { tshirtArtifactSourceAtom } from "../src/features/design-data/artifactSources";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { tshirtCacheSource } from "../src/features/design-data/tshirtCache";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import {
  authoringSourceSnapshotAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { interpolationsAtom } from "../src/features/logic/scaleTypeLibrary";

const store = createStore();
const authored = store.get(authoringSourceSnapshotAtom);
const request = store.get(tshirtArtifactSourceAtom);
assert.equal(
  request.interpolations,
  authored.interpolations,
  "The cached Structure generation request retains the authored interpolation library.",
);
assert.equal(
  request.tokenOverrides,
  authored.tokenOverrides,
  "The cached Structure generation request retains authored token overrides.",
);
assert.deepEqual(
  buildTshirtArtifacts(request),
  buildTshirtArtifacts(authored),
  "Cached and full-source generation produce identical Structure outputs, including typography.",
);

store.set(enterEditModeAtom);
const before = store.get(tshirtArtifactSourceAtom);
store.set(interpolationsAtom, (library) =>
  library.map((interpolation, index) =>
    index === 0
      ? { ...interpolation, name: `${interpolation.name} updated` }
      : interpolation,
  ),
);
const after = store.get(tshirtArtifactSourceAtom);
assert.notEqual(
  after,
  before,
  "Interpolation edits invalidate the generation request.",
);
assert.equal(after.interpolations, store.get(interpolationsAtom));
assert.notEqual(
  canonicalJson(tshirtCacheSource(after)),
  canonicalJson(tshirtCacheSource(before)),
  "Interpolation edits also change the persisted artifact cache key.",
);
assert.deepEqual(
  buildTshirtArtifacts(after),
  buildTshirtArtifacts(store.get(authoringSourceSnapshotAtom)),
);
console.log(
  "Structure artifact requests preserve interpolation dependencies and invalidate on edits.",
);
