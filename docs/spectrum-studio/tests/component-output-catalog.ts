// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDataVisSnapshot } from "./fixtures/dataVis";
import { upgradeCanonicalTokenIdentities } from "../src/features/edit-session/canonicalIdentityUpgrade";
import { assertStoredSnapshot } from "../src/features/edit-session/state";
import { componentTokenCatalog } from "../src/features/components/references";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { ColorOutputError } from "../src/features/color-system/outputContrast";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";

function assertCanonicalColors(
  snapshot: ReturnType<typeof upgradeCanonicalTokenIdentities>,
  catalog: ReturnType<typeof componentTokenCatalog>,
) {
  const expected = new Map(
    canonicalAliasRows(
      completeAliasSource(snapshot),
      undefined,
      "preserve-for-review",
    )
      .filter((row) => row.token.type === "colors")
      .map((row) => [row.rowId, row]),
  );
  let compared = 0;
  for (const token of catalog) {
    if (token.property !== "color" || !token.browserId) continue;
    const row = expected.get(token.id);
    assert.ok(row, `Color ${token.id} retains its canonical output identity.`);
    assert.equal(token.browserId, row.token.id);
    assert.equal(token.name, row.token.name);
    const selection = new Map(JSON.parse(row.context) as [string, string][]);
    assert.deepEqual(
      token.context,
      Object.fromEntries(
        snapshot.modeSets.flatMap((axis) => {
          const mode = axis.modes.find(
            (mode) => mode.id === selection.get(axis.id),
          );
          return mode && mode.id !== axis.defaultModeId
            ? [[axis.key, mode.key]]
            : [];
        }),
      ),
    );
    assert.equal(!!token.outputError, !!row.outputError);
    if (!token.outputError) assert.deepEqual(token.value, row.token.value);
    compared += 1;
  }
  assert.ok(compared > 0);
}

const source = upgradeCanonicalTokenIdentities(createDataVisSnapshot());
assertStoredSnapshot(source);
assert.ok(source.browserTokenEdits);
assert.ok(source.components);
const original = structuredClone(source);
const before = new Map(
  componentTokenCatalog(source).map((token) => [token.id, token]),
);
assertCanonicalColors(source, [...before.values()]);
const edited = structuredClone(source);
edited.colorSystem.scales[0].stops[0].chroma += 1;
assertCanonicalColors(edited, componentTokenCatalog(edited));
const categorical = source.colorSystem.dataVisScales.find(
  (scale) => scale.kind === "categorical",
)!;
assert.equal(categorical.kind, "categorical");
const member = categorical.members[0].source;
const identity = tokenIdentity(
  source.browserTokenEdits,
  tokenUuid(tokenStableKey(member.scaleId, member.contrastId)),
)!;
const key = canonicalTokenModeKey(
  Object.fromEntries(
    source.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  ),
);
const candidate = structuredClone(source);
assert.ok(candidate.browserTokenEdits);
candidate.browserTokenEdits[identity.conceptId].values[key] = {
  value: "rgb(30 100 190 / 0.7)",
  baseline: "#000000",
};
const after = new Map(
  componentTokenCatalog(candidate).map((token) => [token.id, token]),
);
assert.ok(
  [...after.values()].some(
    (token) =>
      token.browserId === identity.conceptId &&
      token.outputError instanceof ColorOutputError,
  ),
  "The invalid output remains visibly unavailable.",
);
let unchangedReferences = 0;
for (const component of source.components.components)
  for (const assignment of component.assignments) {
    if (!assignment.$ref) continue;
    const previous = before.get(assignment.$ref);
    assert.ok(previous);
    if (previous.browserId === identity.conceptId) continue;
    assert.deepEqual(
      after.get(assignment.$ref),
      previous,
      "A scoped color edit must not add unrelated mode conditions to component references.",
    );
    unchangedReferences += 1;
  }
assert.ok(unchangedReferences > 0);
assertStoredSnapshot(candidate);
assert.deepEqual(source, original);
console.log(
  "Component output catalog: invalid colors remain unavailable without changing unrelated reference contexts, identities or values.",
);
