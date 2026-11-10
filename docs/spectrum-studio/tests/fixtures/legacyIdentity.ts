// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { componentTokenCatalog } from "../../src/features/components/references";
import { canonicalJson } from "../../src/features/design-data/canonicalJson";
import { tokenIdentity } from "../../src/features/tokens/canonicalIdentity";

export function createLegacyIdentitySnapshot() {
  const seeded = createDefaultSnapshot();
  const legacy = structuredClone(seeded);
  legacy.browserTokenEdits = {};
  const previousTargets = componentTokenCatalog(seeded);
  const legacyTargets = componentTokenCatalog(legacy);
  for (const component of legacy.components!.components)
    for (const assignment of component.assignments) {
      if (!assignment.$ref) continue;
      const previous = previousTargets.find(
        (target) => target.id === assignment.$ref,
      );
      assert.ok(previous, "The shipped component reference must resolve.");
      const identity = tokenIdentity(
        seeded.browserTokenEdits!,
        previous.browserId!,
      );
      assert.ok(identity, "The shipped target has a publication identity.");
      const matches = legacyTargets.filter(
        (target) =>
          target.browserId === identity.sourceId &&
          canonicalJson(target.context) === canonicalJson(previous.context),
      );
      assert.equal(
        matches.length,
        1,
        `Legacy component target ${previous.name} must be unambiguous.`,
      );
      assignment.$ref = matches[0].id;
    }
  return legacy;
}
