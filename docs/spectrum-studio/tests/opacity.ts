// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { compensatedOpacity } from "../src/features/opacity/polarity";
import { isOpacityDocument } from "../src/features/opacity/model";
import { OPACITY_DEFAULTS } from "../src/features/opacity/defaults";

assert.ok(isOpacityDocument(OPACITY_DEFAULTS));
assert.deepEqual(
  OPACITY_DEFAULTS.levels.map((level) => level.value),
  [
    0.02, 0.03, 0.04, 0.06, 0.08, 0.12, 0.16, 0.2, 0.24, 0.32, 0.4, 0.48, 0.56,
    0.64, 0.8, 0.96, 1,
  ],
);
assert.equal(OPACITY_DEFAULTS.polarityCompensation, 0);
const ids = OPACITY_DEFAULTS.levels.flatMap((level) => [
  level.id,
  ...Object.values(level.rows),
]);
assert.equal(new Set(ids).size, 51);
assert.equal(OPACITY_DEFAULTS.levels[7].value, 0.2);
for (const strength of [0, 0.01, 0.5, 1]) {
  let previous = -1;
  for (let index = 0; index <= 1000; index++) {
    const alpha = index / 1000;
    assert.equal(compensatedOpacity(alpha, 0), alpha);
    assert.equal(compensatedOpacity(alpha, strength, 0), alpha);
    const result = compensatedOpacity(alpha, strength);
    assert.ok(result >= alpha - 1e-14 && result <= 1);
    assert.ok(result > previous, `order at ${alpha} and strength ${strength}`);
    assert.ok(compensatedOpacity(alpha, strength, 0.5) <= result);
    previous = result;
  }
  assert.equal(compensatedOpacity(0, strength), 0);
  assert.equal(compensatedOpacity(1, strength), 1);
}
assert.ok(Math.abs(compensatedOpacity(0.1, 1) - 0.1921151485433343) < 1e-12);
assert.ok(Math.abs(compensatedOpacity(0.44, 1) - 0.5326200413025226) < 1e-12);
for (const invalid of [-1, 2, NaN, Infinity]) {
  assert.throws(() => compensatedOpacity(invalid, 1));
  assert.throws(() => compensatedOpacity(0.2, invalid));
  assert.throws(() => compensatedOpacity(0.2, 1, invalid));
  assert.equal(
    isOpacityDocument({ ...OPACITY_DEFAULTS, polarityCompensation: invalid }),
    false,
  );
}
assert.equal(
  isOpacityDocument({
    ...OPACITY_DEFAULTS,
    levels: [...OPACITY_DEFAULTS.levels, OPACITY_DEFAULTS.levels[0]],
  }),
  false,
);
console.log(
  "Opacity defaults, UUIDs, compensation boundaries and monotonic progression pass.",
);
