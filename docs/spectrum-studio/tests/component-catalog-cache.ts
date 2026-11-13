// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  componentTokenCatalog,
  componentTokenCatalogWithColorWitness,
} from "../src/features/components/references";
import { tshirtBuildStats } from "../src/features/design-data/tshirtArtifacts";
import { createDefaultSnapshot } from "../src/features/edit-session/state";

const builds = () => tshirtBuildStats().full;
const source = createDefaultSnapshot();
// The witness variant always builds, so it gives an independent reference result.
const prepared = componentTokenCatalogWithColorWitness(source);
const expected = prepared.tokens;
const first = componentTokenCatalog(source);
assert.deepEqual(first, expected);

const before = builds();
const repeat = componentTokenCatalog(structuredClone(source));
assert.equal(builds(), before, "Equal content reuses the earlier build.");
assert.deepEqual(repeat, expected);

for (const tokens of [first, repeat]) {
  const shadow = tokens.find((token) => Array.isArray(token.value))!;
  assert.ok(shadow, "The default catalog includes shadow values.");
  (shadow.value as unknown[]).length = 0;
  shadow.context.changed = "changed";
  shadow.name = "Changed by a consumer";
}
assert.deepEqual(
  componentTokenCatalog(source),
  expected,
  "Changes made by one caller never reach later callers.",
);
assert.equal(builds(), before);

const changed = structuredClone(source);
changed.spacing!.scales[0].above += 1;
const rebuilt = componentTokenCatalog(changed);
assert.ok(builds() > before, "Changed content builds again.");
assert.notDeepEqual(rebuilt, expected);
assert.deepEqual(
  rebuilt,
  componentTokenCatalogWithColorWitness(changed).tokens,
  "A changed source never receives an earlier result.",
);

// JSON writes -0 as 0, so only data JSON keeps exactly may share a result.
const zero = structuredClone(source);
zero.spacing!.scales[0].startStep = 0;
componentTokenCatalog(zero);
const signed = structuredClone(zero);
signed.spacing!.scales[0].startStep = -0;
const beforeSigned = builds();
componentTokenCatalog(signed);
assert.ok(
  builds() > beforeSigned,
  "Data that JSON cannot represent exactly always builds.",
);

const beforeWitness = builds();
assert.deepEqual(
  componentTokenCatalog(source, prepared.componentColorWitness),
  expected,
);
assert.ok(
  builds() > beforeWitness,
  "A result built without color evidence is never reused for a call with evidence.",
);

console.log("component catalog cache: ok");
