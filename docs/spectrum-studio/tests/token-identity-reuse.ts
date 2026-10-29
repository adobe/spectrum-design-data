// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { tokenUuid } from "../src/features/tokens/model";

const existingIdentities = [
  ["", "5db4a501-3c02-864f-9e0e-11fa2119b22c"],
  ["scale-red:contrast-100", "3217d574-7078-89c4-a742-48de1bf08d46"],
  ["dimension-row:example:100", "98cc830d-34d5-8e1a-85e9-2c609562e648"],
  ["palette:blue", "2e74c2a8-1cfb-87b8-a389-d423bdcc8d1b"],
  ["seed-0", "975c36bc-7cc3-8335-9467-e3107bfd508b"],
] as const;
for (const [key, expected] of existingIdentities) {
  assert.equal(tokenUuid(key), expected);
  assert.equal(tokenUuid(key), expected);
}
const many = Array.from({ length: 10_000 }, (_, index) => {
  const key = `dimension:scale-${index}:mode-${index % 12}`;
  return [key, tokenUuid(key)] as const;
});
for (const [key, expected] of many) assert.equal(tokenUuid(key), expected);
for (const [key, expected] of existingIdentities)
  assert.equal(tokenUuid(key), expected);
const oversized = "x".repeat(1_048_577);
const oversizedIdentity = tokenUuid(oversized);
assert.match(
  oversizedIdentity,
  /^[a-f\d]{8}-[a-f\d]{4}-8[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/,
);
assert.equal(tokenUuid(oversized), oversizedIdentity);
assert.equal(tokenUuid("palette:blue"), existingIdentities[3][1]);
console.log(
  "Token identities remain exact through reuse, eviction and oversized inputs.",
);
