// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  categoricalExample,
  normalizeExampleValue,
  quantitativeExample,
} from "../src/features/color-system/data-vis/examples";
import { categoricalProfiles } from "../src/features/color-system/data-vis/exampleFixtures";
import { dataVisStatePaths } from "../src/assets/dataVisStates";

for (const count of [0, 1, 3, 12, 21, 25, 40]) {
  const data = categoricalExample(count);
  const expected = Array.from(
    { length: count },
    (_, index) => `Category ${index + 1}`,
  );
  assert.deepEqual(
    [...new Set(data.records.map((record) => record.category))],
    expected,
  );
  assert.deepEqual(
    data.donut.map((record) => record.category),
    expected,
  );
  assert.deepEqual(data, categoricalExample(count));
  assert.equal(data.records.length, count * 5);
  for (const category of expected) {
    const records = data.records.filter(
      (record) => record.category === category,
    );
    assert.deepEqual(
      records.map((record) => record.sample),
      ["Sample 1", "Sample 2", "Sample 3", "Sample 4", "Sample 5"],
    );
    assert.ok(
      records.every(
        (record) =>
          record.metric1 > 0 &&
          Number.isFinite(record.metric2) &&
          Number.isFinite(record.metric3),
      ),
    );
    assert.ok(
      categoricalProfiles.some((profile) =>
        profile.every(
          ([magnitude, x, y], index) =>
            records[index].metric1 === magnitude / 1_000_000 &&
            records[index].metric2 === x / 1_000 &&
            records[index].metric3 === y,
        ),
      ),
    );
    assert.deepEqual(
      data.donut.find((record) => record.category === category),
      records[4],
    );
  }
}
for (const count of [-1, 0.5, NaN, Infinity])
  assert.throws(() => categoricalExample(count), /valid categorical/);

for (const kind of ["sequential", "diverging"] as const) {
  const inputs: number[] = [];
  const first = quantitativeExample(kind, (position) => {
    inputs.push(position);
    return `first-${position}`;
  });
  const second = quantitativeExample(kind, (position) => `second-${position}`);
  assert.equal(first.length, 50);
  assert.equal(new Set(first.map((record) => record.id)).size, 50);
  assert.deepEqual(
    new Set(first.map((record) => record.id)),
    new Set(dataVisStatePaths.map((state) => state.id)),
  );
  assert.equal(Math.min(...inputs), 0);
  assert.equal(Math.max(...inputs), 1);
  assert.deepEqual(
    first.map(({ color: _color, ...record }) => record),
    second.map(({ color: _color, ...record }) => record),
  );
  assert.ok(
    first.every(
      (record, index) =>
        record.color === `first-${inputs[index]}` &&
        record.region === `Region ${index + 1}` &&
        record.row * 10 + record.column === index,
    ),
  );
  assert.ok(
    second.every((record) => record.color === `second-${record.position}`),
  );
  if (kind === "diverging") {
    assert.ok(first.some((record) => record.value < 0));
    assert.ok(first.some((record) => record.value > 0));
  } else assert.ok(first.every((record) => record.value >= 0));
}
assert.notDeepEqual(
  quantitativeExample("sequential", String).map((record) => record.value),
  quantitativeExample("diverging", String).map((record) => record.value),
);
assert.equal(normalizeExampleValue(-4, "diverging", -4, 7), 0);
assert.equal(normalizeExampleValue(0, "diverging", -4, 7), 0.5);
assert.equal(normalizeExampleValue(7, "diverging", -4, 7), 1);
assert.equal(normalizeExampleValue(-2, "diverging", -4, 7), 0.25);
assert.equal(normalizeExampleValue(3.5, "diverging", -4, 7), 0.75);
assert.equal(normalizeExampleValue(20, "sequential", 10, 30), 0.5);
assert.throws(
  () => normalizeExampleValue(NaN, "sequential", 10, 30),
  /finite value/,
);
assert.throws(
  () => normalizeExampleValue(31, "sequential", 10, 30),
  /data domain/,
);
assert.throws(() => normalizeExampleValue(1, "diverging", 0, 3), /data domain/);
assert.ok(
  dataVisStatePaths.every(
    (state) =>
      state.path.startsWith("M") &&
      state.path.endsWith("Z") &&
      !state.path.includes("NaN"),
  ),
);
console.log(
  "Data vis examples: empirical categories, shared regional records, normalization and map joins passed.",
);
