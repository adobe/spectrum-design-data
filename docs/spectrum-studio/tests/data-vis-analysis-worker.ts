// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  dataVisComparisonPage,
  dataVisMetricPoints,
} from "../src/features/color-system/data-vis/analysis";
import {
  createDataVisWorkerHandler,
  type SuggestionWorkerOutput,
} from "../src/features/color-system/data-vis/workerRuntime";
import {
  inspectPalette,
  inspectPaletteAsync,
  INSPECTION_BUDGET,
  suggestCategorical,
} from "../src/features/color-system/data-vis/categorical";
import { MeasurementCache } from "../src/features/color-system/data-vis/measurements";
import { DEFAULT_CATEGORICAL_PREFERENCES } from "../src/features/color-system/data-vis/model";
import {
  uiSwatchKey,
  type UiSwatch,
} from "../src/features/color-system/data-vis/resolution";
import {
  dataVisExampleBars,
  dataVisExampleCells,
} from "../src/features/color-system/data-vis/examples";

const sequentialCells = dataVisExampleCells(),
  divergingCells = dataVisExampleCells(true);
assert.equal(sequentialCells.length, 48);
assert.equal(new Set(sequentialCells.map((cell) => cell.value)).size, 48);
assert.ok(sequentialCells.every((cell) => cell.position === cell.value));
assert.ok(
  divergingCells.every((cell) => cell.position >= 0 && cell.position <= 1),
);
assert.ok(
  divergingCells
    .filter((cell) => cell.value === -4)
    .every((cell) => cell.position === 0),
);
assert.ok(
  divergingCells
    .filter((cell) => cell.value === 0)
    .every((cell) => cell.position === 0.5),
);
assert.ok(
  divergingCells
    .filter((cell) => cell.value === 7)
    .every((cell) => cell.position === 1),
);
assert.equal(dataVisExampleBars(25).length, 20);
assert.deepEqual(dataVisExampleBars(2), [
  { category: 1, value: 50 },
  { category: 2, value: 87 },
]);
assert.deepEqual(dataVisExampleBars(0), []);
assert.throws(() => dataVisExampleBars(-1), /valid categorical/);

const swatch = (value: string, index: number): UiSwatch => {
  const source = {
    kind: "ui-swatch" as const,
    scaleId: `scale-${index}`,
    contrastId: "step",
  };
  return {
    id: uiSwatchKey(source),
    source,
    label: `Color ${index}`,
    value,
    generatedValue: value,
    manuallyOverridden: false,
  };
};
const colors = ["#777777", "#004488", "#aa5500", "#226622"].map(swatch),
  prefs = {
    ...DEFAULT_CATEGORICAL_PREFERENCES,
    minimumBackgroundContrast: 1,
    minimumDeltaE: 0,
  };
const observations = colors.map((color, index) => ({
  id: color.id,
  label: color.label,
  position: index / 3,
  value: color.value,
}));
assert.equal(
  dataVisMetricPoints(observations, "#ffffff", "srgb", "hue")[0].y,
  null,
);
const background = dataVisComparisonPage(
  observations,
  "#ffffff",
  "srgb",
  "normal",
  { kind: "background" },
);
assert.equal(background.total, 4);
assert.equal(background.rows[0].wcagNonText, "pass");
assert.ok(
  dataVisComparisonPage(observations, "#ffffff", "srgb", "protanopia", {
    kind: "background",
  }).rows.every((row) => row.wcagNonText === "not-applicable"),
);
const adjacent = dataVisComparisonPage(
  observations,
  "#ffffff",
  "srgb",
  "normal",
  { kind: "adjacent" },
);
assert.equal(adjacent.total, 3);
const all = [0, 1, 2].flatMap(
  (page) =>
    dataVisComparisonPage(
      observations,
      "#ffffff",
      "srgb",
      "normal",
      { kind: "all" },
      page,
      2,
    ).rows,
);
assert.equal(all.length, 6);
assert.equal(new Set(all.map((row) => row.id)).size, 6);
const cache = new MeasurementCache(),
  big = Array.from({ length: 1000 }, (_, index) => ({
    ...observations[index % 4],
    id: String(index),
  }));
const small = dataVisComparisonPage(
  big,
  "#ffffff",
  "srgb",
  "normal",
  { kind: "all" },
  500,
  50,
  cache,
);
assert.equal(small.rows.length, 50);
assert.equal(small.total, 499500);
assert.ok(
  cache.comparisons <= 50,
  "All-pairs pagination must not materialize a quadratic matrix.",
);
assert.throws(
  () =>
    dataVisComparisonPage(observations, "#ffffff", "srgb", "normal", {
      kind: "color",
      id: "missing",
    }),
  /unavailable/,
);
assert.throws(
  () =>
    dataVisComparisonPage(
      observations,
      "#ffffff",
      "srgb",
      "normal",
      { kind: "all" },
      -1,
    ),
  /valid comparison page/,
);
assert.equal(
  dataVisComparisonPage(observations.slice(0, 1), "#ffffff", "srgb", "normal", {
    kind: "all",
  }).total,
  0,
);

const expected = inspectPalette(colors, prefs, "#ffffff");
assert.deepEqual(await inspectPaletteAsync(colors, prefs, "#ffffff"), expected);
const duplicateColors = Array.from({ length: 20 }, (_, index) =>
  swatch("#777777", index),
);
const failed = inspectPalette(
  duplicateColors,
  DEFAULT_CATEGORICAL_PREFERENCES,
  "#ffffff",
);
assert.equal(failed.failureCount, 190 * 4);
assert.equal(
  failed.failures.length,
  INSPECTION_BUDGET.displayedFailures,
  "Detailed warnings are bounded without hiding the total failures.",
);
const controller = new AbortController();
await assert.rejects(
  inspectPaletteAsync(colors, prefs, "#ffffff", "srgb", {
    signal: controller.signal,
    budget: { yieldEvery: 1 },
    yieldControl: async () => {
      controller.abort();
    },
  }),
  /cancelled/,
);
await assert.rejects(
  inspectPaletteAsync(colors, prefs, "#ffffff", "srgb", {
    budget: { measurements: 1 },
  }),
  /not been fully checked/,
);
const messages: SuggestionWorkerOutput[] = [],
  handle = createDataVisWorkerHandler((message) => messages.push(message));
await handle({
  kind: "inspect",
  requestId: 1,
  fingerprint: "inspect-one",
  palettes: [
    {
      id: "palette",
      members: colors,
      preferences: prefs,
      background: "#ffffff",
      gamut: "srgb",
    },
  ],
});
assert.equal(messages[0].kind, "reports");
if (messages[0].kind !== "reports")
  throw new Error("Expected an inspection report.");
assert.deepEqual(messages[0].reports.palette, {
  status: "ready",
  report: expected,
});
const request = {
  candidates: colors,
  preferences: { ...prefs, size: { kind: "count" as const, count: 2 } },
  background: "#ffffff",
  gamut: "srgb" as const,
};
await handle({ kind: "search", requestId: 2, fingerprint: "current", request });
const first = messages.at(-1)!;
assert.equal(first.kind, "result");
if (first.kind !== "result") throw new Error("Expected suggestions.");
assert.equal(first.result.status, "ready");
await handle({
  kind: "search",
  requestId: 3,
  fingerprint: "renamed",
  request: {
    ...request,
    candidates: colors.map((color) => ({
      ...color,
      label: `Renamed ${color.label}`,
    })),
  },
});
const repeated = messages.at(-1)!;
if (repeated.kind !== "result") throw new Error("Expected suggestions.");
assert.equal(
  repeated.result.stats.conversions,
  0,
  "A name-only change reuses color science.",
);
assert.equal(repeated.result.stats.measurements, 0);
const many = Array.from({ length: 512 }, (_, index) =>
  swatch(
    `rgb(${index % 256} ${(index * 13) % 256} ${(index * 37) % 256})`,
    index,
  ),
);
const pending = handle({
  kind: "search",
  requestId: 4,
  fingerprint: "old",
  request: { ...request, candidates: many },
});
await new Promise((resolve) => setTimeout(resolve, 0));
await handle({ kind: "search", requestId: 5, fingerprint: "new", request });
await pending;
assert.equal(
  messages.some((message) => message.requestId === 4),
  false,
  "A superseded worker request cannot emit an old result.",
);
const inspecting = handle({
  kind: "inspect",
  requestId: 6,
  fingerprint: "cancel",
  palettes: [
    {
      id: "big",
      members: many,
      preferences: prefs,
      background: "#ffffff",
      gamut: "srgb",
    },
  ],
});
await new Promise((resolve) => setTimeout(resolve, 0));
await handle({ kind: "cancel", requestId: 6 });
await inspecting;
assert.equal(
  messages.some((message) => message.requestId === 6),
  false,
);
await handle({
  kind: "inspect",
  requestId: 7,
  fingerprint: "bad",
  palettes: [
    {
      id: "bad",
      members: [swatch("var(--missing)", 1)],
      preferences: prefs,
      background: "#ffffff",
      gamut: "srgb",
    },
  ],
});
const unavailable = messages.at(-1)!;
if (unavailable.kind !== "reports")
  throw new Error("Expected explicit inspection errors.");
assert.equal(unavailable.reports.bad.status, "error");
const noResult = await suggestCategorical({
  ...request,
  preferences: {
    ...prefs,
    size: { kind: "count", count: 4 },
    minimumDeltaE: 1000,
  },
});
assert.equal(noResult.suggestions.length, 0);
assert.equal(noResult.stats.largestFound, 1);
assert.match(noResult.message, /largest set found has 1/);
console.log(
  "Data vis analysis/workers: exact normal/CVD semantics, paginated pairs, neutral hue, yielded inspections, bounded warnings, cache reuse, cancellation and stale-response suppression passed.",
);
