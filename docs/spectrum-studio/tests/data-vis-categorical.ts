// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  suggestCategorical,
  inspectPalette,
  SEARCH_BUDGET,
} from "../src/features/color-system/data-vis/categorical";
import { MeasurementCache } from "../src/features/color-system/data-vis/measurements";
import { DEFAULT_CATEGORICAL_PREFERENCES } from "../src/features/color-system/data-vis/model";
import {
  uiSwatchKey,
  type UiSwatch,
} from "../src/features/color-system/data-vis/resolution";

const swatch = (value: string, index: number): UiSwatch => {
  const source = {
    kind: "ui-swatch" as const,
    scaleId: `ui-scale-${index}`,
    contrastId: `swatch-${index}`,
  };
  return {
    id: uiSwatchKey(source),
    source,
    label: `Source ${index}`,
    value,
    generatedValue: value,
    manuallyOverridden: false,
  };
};
const candidates = [
  "#aa0000",
  "#007700",
  "#0000aa",
  "#886600",
  "#770088",
  "#008888",
  "#222222",
].map(swatch);
const preferences = {
  ...DEFAULT_CATEGORICAL_PREFERENCES,
  size: { kind: "count" as const, count: 3 },
  minimumBackgroundContrast: 1,
  minimumDeltaE: 10,
  cvdProfiles: [],
};
const request = {
  candidates,
  preferences,
  background: "#ffffff",
  gamut: "srgb" as const,
};
const cache = new MeasurementCache();
const result = await suggestCategorical(request, { cache });
assert.equal(result.status, "ready");
assert.equal(result.suggestions.length, 2);
for (const suggestion of result.suggestions) {
  assert.equal(suggestion.sourceIds.length, 3);
  assert.equal(suggestion.sizeLabel, "requested count");
  assert.equal(
    inspectPalette(
      suggestion.sourceIds.map(
        (id) => candidates.find((color) => color.id === id)!,
      ),
      preferences,
      request.background,
    ).failures.length,
    0,
  );
}
const repeat = await suggestCategorical(
  { ...request, candidates: [...candidates].reverse() },
  { cache },
);
assert.deepEqual(repeat.suggestions, result.suggestions);
assert.equal(repeat.stats.measurements, 0);
assert.equal(repeat.stats.conversions, 0);
const auto = await suggestCategorical({
  ...request,
  preferences: { ...preferences, size: { kind: "auto" } },
});
assert.ok(
  auto.suggestions.every(
    (suggestion) => suggestion.sizeLabel === "largest found",
  ),
);
assert.equal(
  (await suggestCategorical({ ...request, candidates: [] })).status,
  "empty",
);
assert.equal(
  (
    await suggestCategorical({
      ...request,
      candidates: [swatch("var(--unknown)", 0)],
    })
  ).status,
  "unavailable",
);
const duplicates = await suggestCategorical({
  ...request,
  candidates: [swatch("#000000", 0), swatch("rgb(0 0 0)", 1)],
  preferences: { ...preferences, size: { kind: "auto" } },
});
assert.equal(duplicates.stats.pool, 2);
assert.equal(duplicates.stats.distinct, 1);
assert.ok(
  duplicates.suggestions.every(
    (suggestion) => suggestion.sourceIds.length === 1,
  ),
);
const duplicateManual = inspectPalette(
  [swatch("#000000", 0), swatch("#000000", 1)],
  preferences,
  "#ffffff",
);
assert.ok(
  duplicateManual.failures.length > 0,
  "Distinct source identities do not excuse equal rendered values.",
);
assert.equal(
  inspectPalette([candidates[0]], preferences, "#ffffff").minimumDeltaE,
  null,
);
assert.equal(
  inspectPalette([candidates[0]], preferences, "#ffffff").pairCount,
  0,
);
assert.throws(
  () => inspectPalette([swatch("currentColor", 0)], preferences, "#ffffff"),
  /concrete/,
);
const impossible = await suggestCategorical({
  ...request,
  preferences: { ...preferences, minimumDeltaE: 1000 },
});
assert.equal(impossible.status, "no-result");
assert.match(impossible.message, /does not prove/);
const bounded = await suggestCategorical(request, {
  budget: { measurements: 1 },
});
assert.equal(bounded.status, "budget-exhausted");
assert.ok(bounded.stats.measurements <= 1);
const controller = new AbortController();
let yielded = false;
const cancelled = await suggestCategorical(request, {
  signal: controller.signal,
  budget: { yieldEvery: 1 },
  yieldControl: async () => {
    yielded = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
  },
});
assert.ok(yielded);
assert.equal(cancelled.status, "cancelled");
assert.equal(cancelled.suggestions.length, 0);
const large = Array.from({ length: 512 }, (_, index) =>
  swatch(
    `rgb(${index % 256} ${Math.floor(index / 2) % 256} ${(index * 37) % 256})`,
    index,
  ),
);
const profile = await suggestCategorical(
  { ...request, candidates: large },
  { budget: { startsPerStyle: 2 } },
);
assert.ok(profile.stats.operations <= SEARCH_BUDGET.operations + 1);
assert.ok(profile.stats.measurements <= SEARCH_BUDGET.measurements);
assert.ok(cache.pairCacheSize <= 32768 && cache.colorCacheSize <= 40965);
console.log(
  "Data vis categorical: exact counts, deterministic styles, largest-found limits, identity, cache budgets and yielded cancellation passed.",
);
