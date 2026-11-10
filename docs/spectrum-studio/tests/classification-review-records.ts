// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { EMPTY_ALIASES } from "../src/features/tokens/aliases";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import {
  assertClassificationReviewExport,
  buildClassificationReviewExport,
  type ClassificationReviewExport,
} from "../src/features/taxonomy/reviewedExport";

const snapshot = createDefaultSnapshot();
const selection = Object.fromEntries(
  snapshot.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
);
const rows = canonicalAliasRows(
  completeAliasSource(snapshot),
  undefined,
  "strict",
  { excludeColors: true },
);
const row = rows.find(
  (row) =>
    row.token.type === "radius" &&
    row.canonicalName &&
    row.compatibleModes &&
    (JSON.parse(row.context) as [string, string][]).every(
      ([axis, mode]) => selection[axis] === mode,
    ),
);
assert.ok(row);
const before = structuredClone(row);
const aliases = {
  ...EMPTY_ALIASES,
  tokens: [
    {
      id: crypto.randomUUID(),
      name: "Review alias",
      $ref: row.id,
      contexts: [canonicalTokenModeKey(selection)],
    },
  ],
};
const internalRow = { ...row, internalPreviewState: "not persisted" };
const packet = await buildClassificationReviewExport(
  snapshot.taxonomy!,
  [internalRow],
  aliases,
  "compatibility",
);
assert.deepEqual(row, before);
assert.deepEqual(packet.source.records[0].canonicalName, row.canonicalName);
assert.deepEqual(packet.source.records[0].compatibleModes, row.compatibleModes);
assert.equal("internalPreviewState" in packet.source.records[0], false);
assert.equal(packet.aliases[0].$ref, row.rowId);
const restored: ClassificationReviewExport = JSON.parse(JSON.stringify(packet));
await assertClassificationReviewExport(restored);
assert.equal(
  canonicalJson(
    await buildClassificationReviewExport(
      restored.source.taxonomy,
      restored.source.records,
      restored.source.aliases,
      restored.exportKind,
    ),
  ),
  canonicalJson(packet),
  "Import/re-export preserves canonical names, compatible contexts and source fingerprints.",
);

const legacyRow = {
  id: row.id,
  rowId: row.rowId,
  name: row.name,
  context: row.context,
  token: row.token,
};
const legacy = await buildClassificationReviewExport(
  snapshot.taxonomy!,
  [legacyRow],
  EMPTY_ALIASES,
  "compatibility",
);
await assertClassificationReviewExport(JSON.parse(JSON.stringify(legacy)));
assert.equal(legacy.schemaVersion, 1);
assert.equal("canonicalName" in legacy.source.records[0], false);
assert.equal("compatibleModes" in legacy.source.records[0], false);

for (const fields of [
  { unknownField: true },
  { canonicalName: { property: false } },
  { compatibleModes: { axis: "not an array" } },
  { compatibleModes: { axis: ["duplicate", "duplicate"] } },
]) {
  const invalid = structuredClone(packet);
  Object.assign(invalid.source.records[0], fields);
  await assert.rejects(
    () => assertClassificationReviewExport(invalid),
    /Invalid classification review packet/,
  );
}
console.log(
  "Classification review records preserve public evidence, reject unknown fields and retain v1 compatibility.",
);
