// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  assertTshirtGraph,
  assertTshirtToken,
  type TshirtTokenRecord,
} from "../src/features/design-data/tshirtProfile";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";
import { SHADOW_VALUE_TYPE } from "../src/features/design-data/shadowValue";

const scale = {
  key: "scale",
  defaultModeId: "desktop",
  modes: [
    { id: "desktop", key: "desktop" },
    { id: "mobile", key: "mobile" },
  ],
};
const literal: TshirtTokenRecord = {
  uuid: crypto.randomUUID(),
  conceptId: crypto.randomUUID(),
  name: {
    property: "size",
    scaleIndex: 100,
    tokenCategory: "primitive",
    legacyKey: "test-size-100",
  },
  value: "12px",
};
const alias: TshirtTokenRecord = {
  uuid: crypto.randomUUID(),
  conceptId: crypto.randomUUID(),
  name: {
    property: "width",
    structure: "test",
    tokenCategory: "semantic",
  },
  $ref: literal.uuid,
};
const check = (tokens: readonly TshirtTokenRecord[]) =>
  assertTshirtGraph(tokens, undefined, [], [scale]);

assertTshirtToken({
  ...literal,
  name: { property: "unitless-line-height" },
  value: "1.25",
});
assert.throws(
  () =>
    assertTshirtToken({
      ...literal,
      name: { property: "unregistered-property" },
    }),
  /Unmapped property/,
);
check([literal, alias]);
check([literal, { ...alias, name: { ...alias.name, scale: "mobile" } }]);
check([{ ...literal, name: { ...literal.name, scale: "desktop" } }, alias]);
assert.throws(
  () =>
    check([{ ...literal, name: { ...literal.name, scale: "mobile" } }, alias]),
  /incompatible scale context/,
);
check([
  literal,
  {
    ...literal,
    uuid: crypto.randomUUID(),
    name: { ...literal.name, scale: "mobile" },
    value: "15px",
  },
]);
check([
  literal,
  {
    ...literal,
    uuid: crypto.randomUUID(),
    name: { ...literal.name, scale: "desktop" },
  },
]);
assert.throws(
  () =>
    check([
      { ...literal, name: { ...literal.name, scale: "desktop" } },
      {
        ...literal,
        uuid: crypto.randomUUID(),
        name: {
          ...literal.name,
          scale: "desktop",
          tokenCategory: "semantic",
        },
      },
    ]),
  /Duplicate/,
);
assert.throws(
  () =>
    check([
      literal,
      {
        ...literal,
        uuid: crypto.randomUUID(),
        name: { ...literal.name, tokenCategory: "semantic" },
      },
    ]),
  /Duplicate/,
);
assert.throws(() => check([literal, literal]), /Duplicate/);
assert.throws(
  () => check([{ ...alias, $ref: crypto.randomUUID() }]),
  /not in the emitted bundle/,
);
assert.throws(() => check([{ ...alias, $ref: alias.uuid }]), /cycle/);
assert.throws(
  () => check([{ ...literal, value: "-1px" }]),
  /finite non-negative/,
);
assert.throws(
  () => check([{ ...literal, $valueType: "unsupported" }]),
  /unsupported value type/,
);
assert.throws(
  () =>
    check([
      {
        ...literal,
        name: { property: "shadow" },
        $valueType: SHADOW_VALUE_TYPE,
        value: [],
      },
    ]),
  /valid pinned shadow array/,
);
assert.throws(
  () => check([{ ...literal, name: { ...literal.name, scale: "unknown" } }]),
  /Invalid scale context/,
);
assert.throws(
  () =>
    check([
      { ...literal, name: { ...literal.name, property: "spacing" } },
      alias,
    ]),
  /incompatible primitive family/,
);
check([
  {
    ...literal,
    name: { ...literal.name, property: "radius" },
  },
  {
    ...alias,
    name: { ...alias.name, property: "corner-radius" },
  },
]);

const snapshot = createDefaultSnapshot();
const before = structuredClone(snapshot);
const bundle = buildTshirtArtifacts(snapshot);
assertTshirtGraph(
  bundle.tokens,
  undefined,
  bundle.vocabulary.sizes?.map((term) => term.value),
  snapshot.modeSets,
);
assert.deepEqual(snapshot, before);
assert.ok(bundle.tokens.some((token) => token.conceptId));
assert.ok(bundle.tokens.some((token) => token.name.scale === "mobile"));
const sizeTarget = bundle.tokens.find(
  (token) =>
    token.name.property === "size" &&
    !token.name.structure &&
    bundle.tokens.some((row) => row.$ref === token.uuid),
);
assert.ok(sizeTarget);
const lineage = bundle.primitiveLineage.find(
  (row) => row.uuid === sizeTarget.uuid,
);
assert.ok(lineage);
const changed = structuredClone(snapshot);
const identity = tokenIdentity(changed.browserTokenEdits!, lineage.nativeId);
assert.ok(identity);
identity.name = { ...identity.name, property: "spacing" };
identity.rows = Object.fromEntries(
  Object.keys(identity.rows).map((context) => [context, crypto.randomUUID()]),
);
assert.throws(
  () => buildTshirtArtifacts(changed),
  /incompatible primitive family/,
  "Canonical remapping must not bypass final alias-family validation.",
);
console.log(
  "Structure graphs preserve mode contexts and validate canonical output.",
);
