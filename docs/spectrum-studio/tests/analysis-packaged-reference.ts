// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { packagedAnalysisReference } from "../scripts/packaged-analysis-reference";
import { referenceRoot } from "../scripts/design-data-loader";
import {
  reconstructPackagedReference,
  type PackagedReference,
} from "../src/features/design-data/packagedReference";
import { referenceRecords } from "../src/features/design-data/referenceRecords";
import { Dataset } from "@adobe/design-data-wasm";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import { createHash } from "node:crypto";

const root = referenceRoot();
const json = await packagedAnalysisReference(root);
assert(
  !json.includes(root),
  "Packaged data must not expose the build checkout path.",
);
const snapshot: PackagedReference = JSON.parse(json);
const dataset = Dataset.embedded();
try {
  const tokens = dataset.query("");
  const reference = reconstructPackagedReference(
    snapshot,
    tokens,
    snapshot.wasmHash,
  );
  assert.equal(reference.source.referenceOrigin, "packaged");
  assert.equal(reference.architecture, undefined);
  assert(reference.records.some((row) => row.category !== "tokens"));
  assert.equal(
    createHash("sha256").update(canonicalJson(reference.records)).digest("hex"),
    snapshot.recordsHash,
    "Embedded tokens, companion content and provenance reconstruct the exact build inventory.",
  );
  assert.throws(
    () => reconstructPackagedReference(snapshot, tokens, "different-build"),
    /different builds/,
  );
  assert.throws(
    () =>
      reconstructPackagedReference(
        snapshot,
        tokens.slice(1),
        snapshot.wasmHash,
      ),
    /missing/,
  );
  assert.throws(
    () =>
      reconstructPackagedReference(
        snapshot,
        [...tokens, tokens[0]],
        snapshot.wasmHash,
      ),
    /duplicate/,
  );
} finally {
  dataset.free();
}
const raw = {
  uuid: "fixture",
  name: { property: "size", density: "compact" },
  value: { value: 8, unit: "px" },
  lifecycle: { deprecatedIn: "1.0" },
};
const row = referenceRecords("tokens/fixture.json", [raw], ["density"])[0];
assert.deepEqual(row.context, { density: "compact" });
assert.equal(row.pointer, "/0");
assert.equal(row.unit, "px");
assert.equal(row.value, 8);
assert.equal(row.lifecycle?.deprecatedIn, "1.0");
assert.throws(
  () => referenceRecords("tokens/invalid.json", [null]),
  /expected an object/,
);
console.log(
  "Packaged Analysis reference: full inventory parity, custom modes, provenance, source paths and mixed-build rejection passed.",
);
