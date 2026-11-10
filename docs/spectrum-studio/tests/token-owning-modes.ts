// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { authoringSnapshotAtom } from "../src/features/edit-session/state";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { tokenOwningModeKey } from "../src/features/tokens/owningModes";
import { modeSelections } from "../src/features/modes/combinations";
import { COLOR_PARAMETERS } from "../src/features/color-system/resolution";
import { removeModeCapability } from "../src/features/modes/foundationSettings";
import { capabilityOwners } from "../src/features/modes/ownership";
import { categoricalMemberAxes } from "../src/features/color-system/data-vis/axes";
import type { CategoricalMember } from "../src/features/color-system/data-vis/model";
import { scaleContrasts } from "../src/features/color-system/contrastSteps";
import {
  tokenEdit,
  tokenIdentity,
} from "../src/features/tokens/canonicalIdentity";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";

const store = createStore();
const baseline = store.get(authoringSnapshotAtom);
const token = store
  .get(browserTokensAtom)
  .find((token) => token.type === "radius")!;
const defaults = Object.fromEntries(
  baseline.modeSets.map((set) => [set.id, set.defaultModeId]),
);
const keys = modeSelections(baseline.modeSets, defaults).map(
  canonicalTokenModeKey,
);
const originalScopes = keys.map((key) =>
  tokenOwningModeKey(token, baseline, key),
);
const working = structuredClone(baseline);
const explicitKeys = keys.slice(0, 2);
working.browserTokenEdits![token.id] = {
  ...working.browserTokenEdits![token.id],
  values: Object.fromEntries(
    explicitKeys.map((key) => [
      key,
      { value: token.value, baseline: token.value },
    ]),
  ),
};
const scopes = keys.map((key, index) => {
  const expected = explicitKeys.includes(key) ? key : originalScopes[index];
  assert.equal(tokenOwningModeKey(token, working, key), expected);
  assert.equal(tokenOwningModeKey(token, baseline, key, working), expected);
  assert.equal(tokenOwningModeKey(token, working, key, baseline), expected);
  return expected;
});
assert.equal(
  new Set(scopes).size,
  new Set(originalScopes).size + explicitKeys.length,
  "Explicit equal-valued assignments add their contexts, not a Cartesian product of unrelated modes.",
);
assert.deepEqual(
  keys.map((key) => tokenOwningModeKey(token, baseline, key)),
  originalScopes,
  "Ownership reads leave the original snapshot unchanged.",
);
const color = store
  .get(browserTokensAtom)
  .find(
    (token) =>
      token.type === "colors" &&
      !token.paletteColorId &&
      !token.dataVis &&
      !token.semantic &&
      !token.manual,
  )!;
assert.ok(color);
const categoricalId = crypto.randomUUID();
const colorScale = baseline.colorSystem.scales[0];
const member: CategoricalMember = {
  id: crypto.randomUUID(),
  source: {
    kind: "ui-swatch",
    scaleId: colorScale.id,
    contrastId: scaleContrasts(baseline.colorSystem, colorScale)[0].id,
  },
};
for (const parameter of COLOR_PARAMETERS) {
  const isolated = {
    ...baseline,
    modeSets: baseline.modeSets.map((axis) =>
      COLOR_PARAMETERS.filter((candidate) => candidate !== parameter).reduce(
        (axis, capability) => removeModeCapability(axis, capability),
        axis,
      ),
    ),
  };
  const owner = capabilityOwners(isolated.modeSets)[parameter];
  if (parameter === "color.scaleAdjustment")
    assert.ok(owner, "Scale adjustment retains its owning axis.");
  for (const key of keys) {
    const expected = canonicalTokenModeKey(
      Object.fromEntries(
        (JSON.parse(key) as [string, string][]).filter(
          ([axis]) => axis === owner,
        ),
      ),
    );
    assert.equal(tokenOwningModeKey(color, isolated, key), expected);
  }
  assert.deepEqual(
    categoricalMemberAxes(
      categoricalId,
      member,
      isolated.modeSets,
      isolated.browserTokenEdits!,
      {},
    ),
    new Set(owner ? [owner] : []),
  );
  assert.deepEqual(
    categoricalMemberAxes(
      categoricalId,
      member,
      isolated.modeSets,
      isolated.browserTokenEdits!,
      { staticColors: [] },
    ),
    new Set(),
    "Static categorical colors remain independent of adaptive color modes.",
  );
}
const uiId = tokenUuid(
  tokenStableKey(member.source.scaleId, member.source.contrastId),
);
const uiIdentity = tokenIdentity(baseline.browserTokenEdits!, uiId)!;
assert.ok(uiIdentity);
const fullKey = keys[0];
const canonicalEdits = {
  ...baseline.browserTokenEdits,
  [uiIdentity.conceptId]: {
    ...tokenEdit(baseline.browserTokenEdits!, uiId)!,
    values: { [fullKey]: { value: "#111111", baseline: "#333333" } },
  },
};
const canonicalAxes = categoricalMemberAxes(
  categoricalId,
  member,
  baseline.modeSets,
  canonicalEdits,
);
assert.deepEqual(
  canonicalAxes,
  new Set(baseline.modeSets.map((axis) => axis.id)),
);
const legacyEdits = { ...canonicalEdits };
delete legacyEdits[uiIdentity.conceptId];
legacyEdits[uiId] = { values: canonicalEdits[uiIdentity.conceptId].values };
assert.deepEqual(
  categoricalMemberAxes(categoricalId, member, baseline.modeSets, legacyEdits),
  canonicalAxes,
  "Canonical adoption preserves upstream UI override dependencies.",
);
console.log(
  "Token ownership: exact explicit contexts, generated baseline ownership and comparison symmetry passed.",
);
