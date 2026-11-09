// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import tokenSchema from "../../../packages/design-data-spec/schemas/token.schema.json" with { type: "json" };
import colorSchema from "../../../packages/design-data-spec/schemas/value-types/color.schema.json" with { type: "json" };
import documentSchema from "../../../packages/design-data-spec/schemas/document-block.schema.json" with { type: "json" };
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { upgradeCanonicalTokenIdentities } from "../src/features/edit-session/canonicalIdentityUpgrade";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { canonicalTokenRecord } from "../src/features/taxonomy/export";
import { aliasTargetsForContext } from "../src/features/tokens/aliases";
import {
  applyBrowserTokenEdits,
  canonicalTokenModeKey,
  isBrowserTokenEdits,
} from "../src/features/tokens/browserModel";
import {
  isTokenIdentity,
  resetTokenEdit,
} from "../src/features/tokens/canonicalIdentity";
import {
  browserSourcesForSnapshot,
  browserTokenImpactRecordsAtom,
} from "../src/features/tokens/browserSavedState";
import {
  hasManualTokenEdits,
  manualTokenResetPlan,
  prepareChangeReset,
} from "../src/features/changelog/resetPlans";
import { compareAuthoring } from "../src/features/changelog/registry";
import { tokenOutputMetadata } from "../src/features/tokens/outputMetadata";
import { synchronizeVariantIdentities } from "../src/features/structures/semanticIdentity";
import { canonicalTokenDefinitions } from "../src/features/tokens/canonicalCatalogue";

const ajv = new Ajv2020({ allErrors: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-valueType", valid: true });
for (const schema of [colorSchema, documentSchema]) ajv.addSchema(schema);
const validate = ajv.compile(tokenSchema);
const conceptId = "56d6a66d-931e-4f8b-bf07-c1a73e7924e8";
const uuid = "ae4398f5-6ead-4928-adf9-f39c0cfcec11";
const literal = {
  uuid,
  conceptId,
  name: { property: "gap", structure: "accessory", size: "xl" },
  value: "8px",
};
assert(validate(literal), ajv.errorsText(validate.errors));
const identity = { uuid, conceptId, name: literal.name };
assert(validate({ ...identity, $ref: uuid }), ajv.errorsText(validate.errors));
assert(!validate({ ...literal, conceptId: "not-a-uuid" }));
assert(!validate({ ...literal, unknown: true }));
assert(!validate({ ...literal, $ref: uuid }));
assert(!validate(identity));
assert(validate({ ...literal, name: { ...literal.name, scaleIndex: 100 } }));
assert(validate({ ...literal, name: { ...literal.name, scaleIndex: "100" } }));
assert(!validate({ ...literal, name: { ...literal.name, scaleIndex: 1.5 } }));
assert(!validate({ ...literal, name: { ...literal.name, futureMode: 100 } }));

const before = createDefaultSnapshot();
const baselineImpact = createStore().get(browserTokenImpactRecordsAtom);
assert(baselineImpact.length > 0);
assert(
  baselineImpact.every(
    (record) =>
      !record.nameChanged &&
      !record.metadataChanged &&
      record.modeValues.every((value) => !value.changed),
  ),
  "Unchanged canonical publication metadata must not fabricate Token impact.",
);
const snapshot = upgradeCanonicalTokenIdentities(before);
assert.deepEqual(
  before,
  createDefaultSnapshot(),
  "Identity adoption does not mutate its input.",
);
const repeated = upgradeCanonicalTokenIdentities(snapshot);
assert.deepEqual(repeated, snapshot, "Reconciliation retains persisted UUIDs.");
const explicitDefault = {
  uuid: crypto.randomUUID(),
  conceptId,
  name: {
    ...literal.name,
    legacyKey: "accessory-gap-extra-large",
    scale: "desktop",
  },
};
canonicalTokenDefinitions.push(explicitDefault);
try {
  const unclaimed = structuredClone(snapshot);
  const accessoryIdentity =
    unclaimed.browserTokenEdits![conceptId].authoring!.identity!;
  delete unclaimed.browserTokenEdits![conceptId];
  unclaimed.components = { ...unclaimed.components!, components: [] };
  const adopted = upgradeCanonicalTokenIdentities(unclaimed);
  assert.equal(
    adopted.browserTokenEdits![conceptId].authoring!.identity!.rows["[]"],
    uuid,
    "An explicit default reference row must not displace or block adoption of its fallback.",
  );
  assert.equal(
    adopted.browserTokenEdits![conceptId].authoring!.identity!.sourceId,
    accessoryIdentity.sourceId,
  );
} finally {
  canonicalTokenDefinitions.pop();
}
const bundle = buildTshirtArtifacts(snapshot);
const spacingOutput = bundle.tokens.filter(
  (token) => token.name.property === "spacing",
);
assert(spacingOutput.length > 0);
assert(
  spacingOutput.every((token) => !Object.hasOwn(token.name, "scale")),
  "An invariant primitive does not inherit the mode conditions of its semantic consumers.",
);
const rows = canonicalAliasRows(completeAliasSource(snapshot), bundle);
const primitiveSource = browserSourcesForSnapshot(
  snapshot,
  snapshot.modeSets.map(
    (axis) => axis.modes.find((mode) => mode.id === axis.defaultModeId)!,
  ),
).find(
  (source) => source.type === "spacing" && source.sourceId?.endsWith("-100"),
)!;
const primitiveIdentity =
  snapshot.browserTokenEdits![primitiveSource.id].authoring!.identity!;
const overrideKey = canonicalTokenModeKey(
  Object.fromEntries(
    snapshot.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  ),
);
const overridden = applyBrowserTokenEdits(
  [primitiveSource],
  snapshot.browserTokenEdits!,
  [primitiveSource.id],
  overrideKey,
  { value: Number(primitiveSource.value) + 1 },
);
const overriddenIdentity = overridden[primitiveSource.id].authoring!.identity!;
assert.equal(overriddenIdentity.conceptId, primitiveIdentity.conceptId);
assert.ok(overriddenIdentity.rows[overrideKey]);
assert.notEqual(
  overriddenIdentity.rows[overrideKey],
  primitiveIdentity.rows["[]"],
);
const overrideBundle = buildTshirtArtifacts({
  ...snapshot,
  browserTokenEdits: overridden,
});
for (const row of overrideBundle.semantics) {
  assert(overrideBundle.tokens.some((token) => token.uuid === row.token.uuid));
  if (row.token.$ref)
    assert(
      overrideBundle.tokens.some((token) => token.uuid === row.token.$ref),
    );
}
const reset = resetTokenEdit(overridden[primitiveSource.id])!;
assert.deepEqual(reset.authoring!.identity, overriddenIdentity);
assert.deepEqual(reset.values, {});
const unchanged = applyBrowserTokenEdits(
  [primitiveSource],
  snapshot.browserTokenEdits!,
  [primitiveSource.id],
  overrideKey,
  { description: "" },
);
assert.deepEqual(
  unchanged[primitiveSource.id].authoring!.identity,
  primitiveIdentity,
);
assert.equal(
  hasManualTokenEdits(snapshot),
  false,
  "Publication metadata alone is not a manual override.",
);
const manualSnapshot = {
  ...snapshot,
  browserTokenEdits: overridden,
  attachments: {},
};
assert.equal(hasManualTokenEdits(manualSnapshot), true);
const cleared = prepareChangeReset(
  manualSnapshot,
  manualTokenResetPlan(manualSnapshot),
);
assert.equal(hasManualTokenEdits(cleared), false);
for (const [id, edit] of Object.entries(overridden))
  assert.deepEqual(
    cleared.browserTokenEdits![id].authoring!.identity,
    edit.authoring!.identity,
    "Clearing manual edits preserves every active and inactive publication identity.",
  );
const accessory = rows.filter((row) => row.id === conceptId);
assert.equal(accessory.length, 2);
const base = accessory.find((row) => row.context === "[]")!;
assert.equal(base.rowId, uuid);
assert.equal(base.token.id, conceptId);
assert.equal(base.token.value, 8);
const mobile = accessory.find((row) => row !== base)!;
assert.notEqual(mobile.rowId, uuid);
assert.equal(mobile.token.value, 10);
assert.deepEqual(
  tokenOutputMetadata(
    {
      ...mobile,
      token: {
        ...mobile.token,
        description: "",
        lifecycle: {
          deprecatedIn: "1.0.0",
          deprecatedComment: "",
          replacementIds: [conceptId],
        },
      },
    },
    rows,
  ),
  {
    lifecycle: { deprecatedIn: "1.0.0", replacedBy: mobile.rowId },
  },
  "Released replacements use the specific mode row, not its fallback.",
);
assert.deepEqual(
  JSON.parse(mobile.context).map(([axis]: [string, string]) => axis),
  ["mode-set-platform-scale"],
);
const emitted = canonicalTokenRecord(base, rows);
assert.equal(emitted.uuid, uuid);
assert.equal(emitted.conceptId, conceptId);
assert.equal(emitted.name.size, "xl");
assert(validate(emitted), ajv.errorsText(validate.errors));
assert.deepEqual(Object.keys(emitted).sort(), [
  "conceptId",
  "name",
  "uuid",
  "value",
]);
assert.deepEqual(emitted.name, {
  property: "gap",
  size: "xl",
  structure: "accessory",
  legacyKey: "accessory-gap-extra-large",
});
assert.equal(new Set(rows.map((row) => row.rowId)).size, rows.length);
for (const row of rows) {
  const record = canonicalTokenRecord(row, rows);
  assert(validate(record), `${row.name}: ${ajv.errorsText(validate.errors)}`);
  assert.equal(("value" in record ? 1 : 0) + ("$ref" in record ? 1 : 0), 1);
}
for (const token of bundle.tokens) {
  assert(validate(token), `${token.uuid}: ${ajv.errorsText(validate.errors)}`);
  if (token.$ref)
    assert(bundle.tokens.some((target) => target.uuid === token.$ref));
}
const fullSelection = Object.fromEntries(
  snapshot.modeSets.map((axis) => [
    axis.id,
    axis.modes.find((mode) =>
      axis.key === "scale"
        ? mode.key === "mobile"
        : mode.id !== axis.defaultModeId,
    )?.id ?? axis.defaultModeId,
  ]),
);
assert.deepEqual(
  aliasTargetsForContext(
    rows,
    conceptId,
    canonicalTokenModeKey(fullSelection),
  ).map((row) => row.rowId),
  [mobile.rowId],
  "Unrelated preview selections still select the specific mobile row.",
);
const palette = rows.find((row) => row.token.paletteColorId)!;
assert.equal(palette.context, "[]");
assert.equal(rows.filter((row) => row.id === palette.id).length, 1);
assert.deepEqual(
  aliasTargetsForContext(
    rows,
    palette.id,
    canonicalTokenModeKey(fullSelection),
  ).map((row) => row.rowId),
  [palette.rowId],
);
const equal = structuredClone(snapshot);
equal.modeSets
  .find((axis) => axis.key === "scale")!
  .modes.find(
    (mode) => mode.key === "mobile",
  )!.foundations.size!.componentSize = 1;
const equalRows = canonicalAliasRows(
  completeAliasSource(equal),
  buildTshirtArtifacts(equal),
).filter((row) => row.id === conceptId);
assert.equal(
  equalRows.length,
  2,
  "Deliberately authored branches are never deduplicated by equal values.",
);
assert(equalRows.every((row) => row.token.value === 8));
assert.deepEqual(
  equalRows.map((row) => row.rowId).sort(),
  accessory.map((row) => row.rowId).sort(),
);
const changed = structuredClone(snapshot);
changed.modeSets
  .find((axis) => axis.key === "scale")!
  .modes.find(
    (mode) => mode.key === "mobile",
  )!.foundations.size!.componentSize = 1.5;
const changedRows = canonicalAliasRows(
  completeAliasSource(changed),
  buildTshirtArtifacts(changed),
).filter((row) => row.id === conceptId);
assert.equal(changedRows.find((row) => row.rowId === uuid)?.token.value, 8);
assert.equal(
  changedRows.find((row) => row.rowId === mobile.rowId)?.token.value,
  12,
);
const expanded = structuredClone(snapshot);
const scaleAxis = expanded.modeSets.find((axis) => axis.key === "scale")!;
const addedMode = {
  ...structuredClone(scaleAxis.modes.find((mode) => mode.key === "mobile")!),
  id: "mode-test-tablet",
  key: "tablet",
  name: "Tablet",
};
addedMode.foundations.size!.componentSize = 1.5;
scaleAxis.modes.push(addedMode);
expanded.structures = synchronizeVariantIdentities(
  expanded.structures!,
  expanded.modeSets,
);
const published = upgradeCanonicalTokenIdentities(expanded);
const publishedRows = canonicalAliasRows(
  completeAliasSource(published),
  buildTshirtArtifacts(published),
).filter((row) => row.id === conceptId);
assert.equal(publishedRows.length, 3);
const addedRow = publishedRows.find(
  (row) => row.canonicalName?.scale === "tablet",
)!;
assert(addedRow);
assert.equal(addedRow.token.value, 12);
assert(!accessory.some((row) => row.rowId === addedRow.rowId));
const removedMode = structuredClone(published);
removedMode.modeSets.find((axis) => axis.id === scaleAxis.id)!.modes =
  scaleAxis.modes.filter((mode) => mode.id !== addedMode.id);
const dormant = upgradeCanonicalTokenIdentities(removedMode);
assert.deepEqual(
  dormant.browserTokenEdits![conceptId].authoring!.identity!.rows,
  published.browserTokenEdits![conceptId].authoring!.identity!.rows,
  "Removing a mode does not discard its publication identity.",
);
dormant.modeSets
  .find((axis) => axis.id === scaleAxis.id)!
  .modes.push(addedMode);
dormant.modeSets.reverse();
dormant.structures!.structures.reverse();
const restoredModes = upgradeCanonicalTokenIdentities(dormant);
assert.deepEqual(
  canonicalAliasRows(
    completeAliasSource(restoredModes),
    buildTshirtArtifacts(restoredModes),
  )
    .filter((row) => row.id === conceptId)
    .map((row) => row.rowId)
    .sort(),
  publishedRows.map((row) => row.rowId).sort(),
  "Reordering sources and re-enabling a mode retains published row UUIDs.",
);
assert.equal(compareAuthoring(snapshot, repeated).groups.length, 0);
const identityOnly = structuredClone(snapshot);
identityOnly.browserTokenEdits![conceptId].authoring!.identity!.rows["[]"] =
  crypto.randomUUID();
assert.equal(compareAuthoring(snapshot, identityOnly).groups.length, 0);
assert(
  isTokenIdentity(snapshot.browserTokenEdits![conceptId].authoring!.identity),
);
assert(
  !isTokenIdentity({
    ...snapshot.browserTokenEdits![conceptId].authoring!.identity,
    rows: { "[]": uuid, '[["axis","mode"]]': uuid },
  }),
  "Different mode rows cannot publish the same UUID.",
);
const duplicatePublication = structuredClone(snapshot.browserTokenEdits!);
const otherPublication = Object.values(duplicatePublication).find(
  (edit) =>
    edit.authoring?.identity?.conceptId !== conceptId &&
    edit.authoring?.identity,
)!.authoring!.identity!;
otherPublication.rows = { "[]": uuid };
assert(
  !isBrowserTokenEdits(duplicatePublication),
  "Different concepts cannot publish the same row UUID.",
);
for (const context of [
  '{"invalid":true}',
  '[["axis","mode"],["axis","other"]]',
  '[["axis",42]]',
])
  assert(
    !isTokenIdentity({
      ...snapshot.browserTokenEdits![conceptId].authoring!.identity,
      rows: { [context]: uuid },
    }),
  );
console.log(
  "Canonical schema, exact accessory identities, authored modes, and stable reconciliation pass.",
);
