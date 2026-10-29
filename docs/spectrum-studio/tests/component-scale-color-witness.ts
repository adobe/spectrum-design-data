// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  withPreparedScaleColors,
  type PreparedScaleColors,
} from "../src/features/components/scaleColorWitness";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  generateScaleColorTokenOutcomes,
  type ColorTokenOutcomeReuse,
} from "../src/features/tokens/colorGeneration";
import { ColorOutputError } from "../src/features/color-system/outputContrast";

const source = createDefaultSnapshot();
type Input = Parameters<ColorTokenOutcomeReuse>[0];
function reusePreparedScaleColors(
  previous: readonly PreparedScaleColors[] = [],
  prepared?: PreparedScaleColors[],
): ColorTokenOutcomeReuse {
  return (input, generate) =>
    withPreparedScaleColors(previous, prepared, (reuse) =>
      reuse ? reuse(input, generate) : generate(),
    );
}
const input: Input = [
  structuredClone(
    source.colorSystem.scales.find((scale) => scale.name === "Red")!,
  ),
  structuredClone(source.colorSystem.contrasts),
  [1, 1, 1],
  structuredClone(source.colorSystem.settings),
  structuredClone(source.colorSystem.settings.colorOutput),
  structuredClone(source.rules!),
];
const generate = (value: Input = input) =>
  generateScaleColorTokenOutcomes(...value);
const original = structuredClone(input);
const canonical = generate();
assert(canonical.every((outcome) => outcome.status === "ready"));
const prepared: PreparedScaleColors[] = [];
const recorder = reusePreparedScaleColors([], prepared)!;
assert.deepEqual(
  generateScaleColorTokenOutcomes(...input, recorder),
  canonical,
);
assert.equal(prepared.length, 1);
assert.deepEqual(input, original);
assert.deepEqual(
  prepared,
  structuredClone(prepared),
  "Prepared evidence must contain transportable data only.",
);
const reuse = reusePreparedScaleColors(structuredClone(prepared))!;
let computations = 0;
const resolve = (value: Input) =>
  reuse(value, () => {
    computations++;
    return generate(value);
  });
assert.deepEqual(resolve(input), canonical);
assert.equal(
  computations,
  0,
  "A transported exact scale input cannot repeat the color solver.",
);
const returned = resolve(input);
returned[0].token.name.colorName = "Caller changed";
returned[0].token.source.scaleId = "Caller changed";
assert.deepEqual(
  resolve(input),
  canonical,
  "Returned token names and source records remain caller-owned.",
);

const changes: ((value: Input) => void)[] = [
  (value) => {
    value[0].id = "Different scale identity";
  },
  (value) => {
    value[0].name = "Different scale name";
  },
  (value) => {
    value[0].stops[0].hue += 1;
  },
  (value) => {
    value[0].stops[0].lightness += 0.001;
  },
  (value) => {
    value[0].stops[0].chroma += 0.001;
  },
  (value) => {
    value[1][0].id = "Different contrast identity";
  },
  (value) => {
    value[1][0].value += 0.01;
  },
  (value) => {
    value[1].reverse();
  },
  (value) => {
    value[3].side = "light";
  },
  (value) => {
    value[3].extOffset += 0.01;
  },
  (value) => {
    value[3].extSteep += 0.01;
  },
  (value) => {
    if (typeof value[4] === "object") value[4].outputFormat = "rgb";
  },
  (value) => {
    value[5][0].name = "Different rule metadata";
  },
];
for (const change of changes) {
  const proposal = structuredClone(input);
  change(proposal);
  const before = computations;
  assert.deepEqual(resolve(proposal), generate(proposal));
  assert.equal(
    computations,
    before + 1,
    "Every changed argument must use the complete canonical generator.",
  );
  assert.deepEqual(
    resolve(input),
    canonical,
    "A changed or failed calculation cannot poison the prepared source.",
  );
}
const background: Input = [
  input[0],
  input[1],
  [0, 0, 0],
  input[3],
  input[4],
  input[5],
];
const beforeBackground = computations;
assert.deepEqual(resolve(background), generate(background));
assert.equal(computations, beforeBackground + 1);

for (const ignored of [
  undefined,
  NaN,
  Infinity,
  -0,
  () => 1,
  Symbol("ignored"),
  1n,
  new Date(),
  { toJSON: () => "ignored" },
]) {
  const proposal: Input = [
    input[0],
    input[1],
    input[2],
    { ...input[3], ...{ ignored } },
    input[4],
    input[5],
  ];
  const entries: PreparedScaleColors[] = [];
  const candidate = reusePreparedScaleColors([], entries)!;
  assert.deepEqual(
    candidate(proposal, () => generate(proposal)),
    generate(proposal),
  );
  assert.equal(
    entries.length,
    0,
    "Non-JSON, signed-zero and custom serialization inputs cannot acquire ambiguous evidence.",
  );
}
const cycle: { self?: unknown } = {};
cycle.self = cycle;
for (const ignored of [
  cycle,
  new Array(2),
  Object.setPrototypeOf([1, 2], { toJSON: () => ["Masked array prototype"] }),
  Object.defineProperty({}, "getter", { enumerable: true, get: () => 1 }),
]) {
  const entries: PreparedScaleColors[] = [];
  const candidate = reusePreparedScaleColors([], entries)!;
  const proposal: Input = [
    input[0],
    input[1],
    input[2],
    { ...input[3], ...{ ignored } },
    input[4],
    input[5],
  ];
  assert.deepEqual(
    candidate(proposal, () => generate(proposal)),
    generate(proposal),
  );
  assert.equal(entries.length, 0);
}
const zero: Input = [
  input[0],
  input[1],
  input[2],
  { ...input[3], extOffset: 0 },
  input[4],
  input[5],
];
const zeroEntries: PreparedScaleColors[] = [];
reusePreparedScaleColors([], zeroEntries)!(zero, () => generate(zero));
assert.equal(zeroEntries.length, 1);
const negativeZero: Input = [
  input[0],
  input[1],
  input[2],
  { ...input[3], extOffset: -0 },
  input[4],
  input[5],
];
let negativeZeroComputed = false;
assert.deepEqual(
  reusePreparedScaleColors(zeroEntries)!(negativeZero, () => {
    negativeZeroComputed = true;
    return generate(negativeZero);
  }),
  generate(negativeZero),
);
assert(negativeZeroComputed);

const blockedEntries: PreparedScaleColors[] = [];
const blockedReuse = reusePreparedScaleColors([], blockedEntries)!;
const error = new ColorOutputError({
  requestedContrast: 21,
  achievableContrast: 4,
  gamut: "srgb",
  background: "#fff",
  source: "Test",
});
const { value, ...token } = canonical[0].token;
void value;
for (let repeat = 0; repeat < 2; repeat++) {
  const result = blockedReuse(input, () => [
    { status: "blocked", token, error },
  ]);
  assert.equal(result[0].status, "blocked");
  if (result[0].status === "blocked") assert.equal(result[0].error, error);
  assert.equal(
    blockedEntries.length,
    0,
    "Typed output failures are never cached or flattened.",
  );
  assert.throws(
    () =>
      blockedReuse(input, () => {
        throw new Error("Canonical failure");
      }),
    /Canonical failure/,
  );
}
const capacity: PreparedScaleColors[] = [];
withPreparedScaleColors([], capacity, (capacityReuse) => {
  for (let index = 0; index < 160; index++) {
    const proposal: Input = [
      { ...input[0], name: `Capacity fixture ${index}` },
      input[1],
      input[2],
      input[3],
      input[4],
      input[5],
    ];
    capacityReuse!(proposal, () => generate(proposal));
  }
});
assert(capacity.length > 0 && capacity.length <= 128);
assert(
  new TextEncoder().encode(JSON.stringify(capacity)).byteLength <= 1_000_000,
);
const oversized: PreparedScaleColors[] = [];
const large: Input = [
  { ...input[0], name: "\u00e9".repeat(600_000) },
  input[1],
  input[2],
  input[3],
  input[4],
  input[5],
];
reusePreparedScaleColors([], oversized)!(large, () => canonical);
assert.equal(
  oversized.length,
  0,
  "Oversized UTF-8 evidence must use generation without retaining a record.",
);
let escaped: ColorTokenOutcomeReuse | undefined;
withPreparedScaleColors(prepared, undefined, (reuse) => {
  escaped = reuse;
});
let escapedComputed = false;
assert.deepEqual(
  escaped!(input, () => {
    escapedComputed = true;
    return generate();
  }),
  canonical,
);
assert(
  escapedComputed,
  "A callback cannot keep the read-only signature scope alive across source changes.",
);
assert.throws(
  () =>
    withPreparedScaleColors(prepared, undefined, (reuse) => {
      escaped = reuse;
      throw new Error("Interrupted inventory");
    }),
  /Interrupted inventory/,
);
let failedScopeComputed = false;
assert.deepEqual(
  escaped!(input, () => {
    failedScopeComputed = true;
    return generate();
  }),
  canonical,
);
assert(
  failedScopeComputed,
  "Failed inventories must also discard the read-only signature scope.",
);
const mutable = structuredClone(input);
assert.deepEqual(resolve(mutable), canonical);
mutable[0].stops[0].hue += 2;
const beforeMutable = computations;
assert.deepEqual(resolve(mutable), generate(mutable));
assert.equal(
  computations,
  beforeMutable + 1,
  "The same mutable object must be re-inspected between complete invocations.",
);
assert.deepEqual(input, original);
console.log(
  "Prepared scale colors: exact canonical outputs, every input, transport, mutable-source invalidation, caller ownership, non-JSON/signed-zero bypass, typed failures and bounded UTF-8 storage passed.",
);
