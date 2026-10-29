// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import Color from "colorjs.io";
import { sequentialDefaults } from "./fixtures/sequentialDefaults";
import { createColorDefaults } from "../src/data/defaults";
import { changeGroupsAtom } from "../src/features/changelog/state";
import { pathId } from "../src/features/changelog/contract";
import {
  applyChangeResetPlanAtom,
  itemResetPlan,
} from "../src/features/changelog/resetPlans";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { createDataVisRuntime } from "../src/features/color-system/data-vis/adapter";
import { concreteColor } from "../src/features/color-system/data-vis/colors";
import { buildDataVisSourcePacket } from "../src/features/color-system/data-vis/export";
import { deltaE2000 } from "../src/features/color-system/data-vis/measurements";
import {
  isDataVisScale,
  type DataVisPoint,
} from "../src/features/color-system/data-vis/model";
import { blockedUiSourceRemoval } from "../src/features/color-system/data-vis/references";
import {
  dataVisContinuousOutputsAtom,
  dataVisPrimitiveColorsAtom,
  editDataVisPointAtom,
  removeDataVisScaleAtom,
} from "../src/features/color-system/data-vis/state";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  removeColorScaleAtom,
  removePaletteColorAtom,
  updateColorScalePublishingAtom,
  updatePaletteColorAtom,
} from "../src/features/color-system/state";
import { paletteChannelsFromCss } from "../src/features/color-system/palette";
import {
  captureSnapshot,
  createDefaultSnapshot,
  resetAllAuthoringAtom,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import { colorFoundationParameters } from "../src/features/impact/sources/colorFoundation";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import {
  browserModeContextAtom,
  browserTokenSourcesAtom,
  editBrowserTokensAtom,
} from "../src/features/tokens/browserState";
import { browserTokenImpactRecordsAtom } from "../src/features/tokens/browserSavedState";
import { editModeAtom } from "../src/state/view/editMode";
import {
  contrastRatio,
  luminance,
} from "../src/features/color-system/colorMath";
import { scaleContrasts } from "../src/features/color-system/contrastSteps";
import { parsedOutputLinear } from "../src/features/color-system/outputContrast";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";

const correctedLightValues = new Map([
  ["fuchsia-color-1500", "#360041"],
  ["celery-color-800", "#5c8c36"],
  ["green-color-1200", "#004c34"],
  ["celery-color-400", "#b3d69e"],
  ["green-color-500", "#7fc69a"],
  ["pink-color-600", "#ec79be"],
  ["fuchsia-color-900", "#b33bc7"],
  ["purple-color-1200", "#5f0ca7"],
  ["indigo-color-1500", "#1e0062"],
  ["fuchsia-color-1200", "#6f1580"],
  ["turquoise-color-300", "#c0e7ed"],
  ["cyan-color-500", "#85bcee"],
  ["blue-color-800", "#4c77f6"],
]);
const verifiedCorrections = new Set<string>();

const base = createColorDefaults();
const snapshot = createDefaultSnapshot();
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, snapshot);
function select(scheme: string, contrast = 1) {
  store.set(
    modeSelectionAtom,
    Object.fromEntries(
      snapshot.modeSets.map((axis) => [
        axis.key,
        axis.key === "colorScheme"
          ? axis.modes.find((mode) => mode.key === scheme)!.id
          : axis.defaultModeId,
      ]),
    ),
  );
  store.set(
    previewOverridesAtom,
    contrast === 1 ? {} : { "color.contrastMultiplier": contrast },
  );
}
function compiled(id: string) {
  const output = store
    .get(dataVisContinuousOutputsAtom)
    .find(
      (output) =>
        (output.status === "ready" ? output.scale.id : output.id) === id,
    );
  assert.ok(output);
  if (output.status !== "ready") throw new Error(output.error);
  return output.scale;
}

select("light");
const pool = store.get(dataVisPrimitiveColorsAtom);
const lightDocument = store.get(resolvedColorSystemDocumentAtom);
const backgroundLuminance = luminance(resolvedBackgroundLinear(lightDocument));
assert.ok(pool.every((color) => !color.error && !color.hidden));
assert.deepEqual(
  base.dataVisScales.map((scale) => scale.name),
  sequentialDefaults.map((scale) => scale.name),
);
for (const expected of sequentialDefaults) {
  const scale = base.dataVisScales.find(
    (scale) => scale.name === expected.name,
  )!;
  assert.ok(isDataVisScale(scale));
  assert.equal(scale.id, `data-vis-${expected.name.toLowerCase()}`);
  assert.equal(scale.kind, "sequential");
  if (scale.kind === "categorical")
    throw new Error("Expected a sequential default.");
  assert.equal(
    scale.staticColors,
    undefined,
    "Shipped sequential colors are live, not captured.",
  );
  assert.ok(scale.nameRef);
  const term = snapshot.taxonomy.terms.find(
    (term) => term.id === scale.nameRef!.termId,
  );
  assert.equal(term?.value, expected.name);
  assert.equal(term?.categoryId, scale.nameRef.categoryId);
  assert.equal(
    snapshot.taxonomy.terms.filter(
      (term) =>
        term.categoryId === scale.nameRef!.categoryId &&
        term.value.toLowerCase() === expected.name.toLowerCase(),
    ).length,
    1,
  );
  assert.deepEqual(
    scale.points.map((point) => [point.id, point.position]),
    expected.stops.map((_, index) => [
      `${expected.name.toLowerCase()}-stop-${index + 1}`,
      index / 4,
    ]),
  );
  for (const [
    index,
    [requested, tokenId, tokenName, lightValue],
  ] of expected.stops.entries()) {
    assert.deepEqual(scale.points[index].source, {
      kind: "primitive-token",
      tokenId,
    });
    assert.equal(
      scale.points[index].contrast,
      undefined,
      "Exact links never apply a second contrast target.",
    );
    const token = pool.find((token) => token.id === tokenId)!;
    assert.ok(token);
    assert.equal(token.name, tokenName);
    const corrected = correctedLightValues.get(tokenName);
    assert.equal(token.value, corrected ?? lightValue);
    if (corrected) {
      if (token.origin.kind !== "ui-swatch")
        throw new Error("Expected a generated UI color correction.");
      const { scaleId, contrastId } = token.origin;
      const source = lightDocument.scales.find(
        (scale) => scale.id === scaleId,
      )!;
      const target = scaleContrasts(lightDocument, source).find(
        (contrast) => contrast.id === contrastId,
      )!.value;
      assert(
        contrastRatio(
          luminance(parsedOutputLinear(lightValue, "srgb")),
          backgroundLuminance,
        ) < target,
        "Historical values are changed only when their final rounded output was below target.",
      );
      assert(
        contrastRatio(
          luminance(parsedOutputLinear(token.value, "srgb")),
          backgroundLuminance,
        ) >= target,
        "Every exact corrected golden must meet the target after serialization.",
      );
      for (const offset of [1, 3, 5]) {
        assert(
          Math.abs(
            parseInt(token.value.slice(offset, offset + 2), 16) -
              parseInt(lightValue.slice(offset, offset + 2), 16),
          ) <= 1,
          "Corrections must stay within one byte step per channel.",
        );
      }
      verifiedCorrections.add(tokenName);
    }
    const nearest = pool
      .map((candidate) => ({
        id: candidate.id,
        distance: deltaE2000(
          concreteColor(requested),
          concreteColor(candidate.value),
        ),
      }))
      .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0];
    assert.equal(
      tokenId,
      nearest.id,
      `${expected.name} ${index * 25}% uses the nearest published Light-mode output.`,
    );
    assert.equal(compiled(scale.id).evaluate(index / 4), token.value);
  }
  assert.deepEqual(
    compiled(scale.id).diagnostics,
    [],
    "Normal Light-mode defaults have distinct, monotonic stops.",
  );
}
assert.deepEqual(verifiedCorrections, new Set(correctedLightValues.keys()));
const fire = base.dataVisScales[0];
assert.equal(fire.nameRef!.termId, "a323d4fe-336f-4034-b7a0-78d6db9f0e63");
assert.deepEqual(
  store.get(changeGroupsAtom).flatMap((group) => group.items),
  [],
);
assert.ok(colorFoundationParameters(base).every((record) => !record.edited));
assert.ok(
  store
    .get(browserTokenImpactRecordsAtom)
    .every(
      (record) =>
        !record.nameChanged &&
        !record.manuallyOverridden &&
        record.modeValues.every((value) => !value.changed),
    ),
);

const previous = createDefaultSnapshot();
previous.colorSystem.dataVisScales = [];
const defaultNameIds = new Set(
  base.dataVisScales.map((scale) => scale.nameRef!.termId),
);
previous.taxonomy.terms = previous.taxonomy.terms.filter(
  (term) => !defaultNameIds.has(term.id),
);
const previousStore = createStore();
previousStore.set(restoreAuthoringSnapshotAtom, previous);
assert.deepEqual(
  previousStore.get(colorSystemDocumentAtom).dataVisScales,
  [],
  "Saved designs are not merged with new scales.",
);
assert.deepEqual(
  store.get(browserTokenSourcesAtom),
  previousStore.get(browserTokenSourcesAtom),
  "Continuous inputs preserve every existing token source, identity and value.",
);
assert.deepEqual(
  store
    .get(browserTokenImpactRecordsAtom)
    .map((record) => [record.tokenId, record.modeValues.length]),
  previousStore
    .get(browserTokenImpactRecordsAtom)
    .map((record) => [record.tokenId, record.modeValues.length]),
  "Token-concept and mode-value denominators are unchanged.",
);
assert.equal(buildColorLibrary(base), buildColorLibrary(previous.colorSystem));

const packet = buildDataVisSourcePacket(captureSnapshot(store.get));
const lightValues = sequentialDefaults.map((scale) =>
  compiled(`data-vis-${scale.name.toLowerCase()}`).evaluate(0),
);
for (const scheme of ["light", "dark"])
  for (const contrast of [0, 1, 1.5]) {
    select(scheme, contrast);
    const runtime = createDataVisRuntime(packet, {
      modes: { colorScheme: scheme },
      contrastMultiplier: contrast,
    });
    const primitives = store.get(dataVisPrimitiveColorsAtom);
    for (const expected of sequentialDefaults) {
      const id = `data-vis-${expected.name.toLowerCase()}`,
        output = compiled(id),
        evaluate = runtime.continuous(id);
      for (const [index, [, tokenId]] of expected.stops.entries()) {
        assert.equal(
          output.evaluate(index / 4),
          primitives.find((token) => token.id === tokenId)!.value,
        );
        assert.equal(
          evaluate(index / 4),
          output.evaluate(index / 4),
          "Export uses the exact current token, without contrast reapplication.",
        );
      }
      for (const position of [0.125, 0.375, 0.625, 0.875]) {
        assert.equal(evaluate(position), output.evaluate(position));
        assert.ok(new Color(evaluate(position)).inGamut("srgb"));
      }
      assert.deepEqual(
        runtime.diagnostics(id),
        output.diagnostics,
        "Warnings use the existing shared engine.",
      );
    }
    assert.deepEqual(
      store.get(colorSystemDocumentAtom).dataVisScales,
      base.dataVisScales,
      "Modes do not rematch sources.",
    );
  }
select("dark");
assert.notDeepEqual(
  sequentialDefaults.map((scale) =>
    compiled(`data-vis-${scale.name.toLowerCase()}`).evaluate(0),
  ),
  lightValues,
);
select("light");
store.set(editModeAtom, true);
const beforeEdit = compiled(fire.id).evaluate(0.25);
const paletteEdit = store.set(updatePaletteColorAtom, {
  id: "illustrator-color",
  hue: 45,
  name: "Changed orange",
});
assert.deepEqual(paletteEdit, { ok: true });
assert.notEqual(
  compiled(fire.id).evaluate(0.25),
  beforeEdit,
  "Palette value edits update linked scales immediately.",
);
assert.equal(
  compiled(fire.id).evaluate(0.25),
  store
    .get(dataVisPrimitiveColorsAtom)
    .find((token) => token.id === sequentialDefaults[0].stops[1][1])!.value,
  "Renaming a source preserves the stable token link.",
);
assert.equal(
  createDataVisRuntime(
    buildDataVisSourcePacket(captureSnapshot(store.get)),
  ).continuous(fire.id)(0.25),
  compiled(fire.id).evaluate(0.25),
);
assert.deepEqual(
  store.get(colorSystemDocumentAtom).dataVisScales,
  base.dataVisScales,
);

store.set(editBrowserTokensAtom, {
  ids: [sequentialDefaults[0].stops[2][1]],
  modeKey: store.get(browserModeContextAtom).key,
  patch: { value: "#123456" },
});
assert.equal(
  compiled(fire.id).evaluate(0.5),
  "#123456",
  "A final UI-token override updates Fire exactly.",
);
assert.equal(
  createDataVisRuntime(
    buildDataVisSourcePacket(captureSnapshot(store.get)),
  ).continuous(fire.id)(0.5),
  "#123456",
);
select("dark");
assert.notEqual(
  compiled(fire.id).evaluate(0.5),
  "#123456",
  "The manual source value stays scoped to its authored modes.",
);
select("light");
assert.equal(compiled(fire.id).evaluate(0.5), "#123456");
assert.deepEqual(
  store.get(colorSystemDocumentAtom).dataVisScales,
  base.dataVisScales,
);

store.set(editBrowserTokensAtom, {
  ids: [sequentialDefaults[0].stops[3][1]],
  modeKey: store.get(browserModeContextAtom).key,
  patch: { value: "#654321" },
});
const beforeProtection = captureSnapshot(store.get);
for (const id of ["illustrator-color", "dimension-color"]) {
  assert.throws(() => store.set(removePaletteColorAtom, id), /replacement/i);
}
const linkedUiScaleIds = new Set(
  pool
    .filter(
      (token) =>
        token.origin.kind === "ui-swatch" &&
        sequentialDefaults.some((scale) =>
          scale.stops.some(([, tokenId]) => tokenId === token.id),
        ),
    )
    .flatMap((token) =>
      token.origin.kind === "ui-swatch" ? [token.origin.scaleId] : [],
    ),
);
for (const scaleId of linkedUiScaleIds) {
  assert.match(
    blockedUiSourceRemoval(
      store.get(colorSystemDocumentAtom),
      snapshot.modeSets,
      scaleId,
    )!,
    /replacement/i,
  );
  assert.throws(
    () =>
      store.set(updateColorScalePublishingAtom, {
        scaleId,
        hideFromPublishing: true,
      }),
    /replacement/i,
  );
  const removed = store.set(removeColorScaleAtom, scaleId);
  assert.equal(
    removed.ok,
    false,
    "Removing an entire linked UI scale returns the ordinary actionable error before cleanup.",
  );
  if (removed.ok) throw new Error("A linked UI scale must not be removed.");
  assert.match(removed.error, /replacement|tint source/i);
}
assert.deepEqual(
  captureSnapshot(store.get),
  beforeProtection,
  "Blocked source losses do not mutate saved or working data.",
);
const missing = structuredClone(packet);
missing.color.palette = missing.color.palette.filter(
  (color) => color.id !== "illustrator-color",
);
assert.throws(() => createDataVisRuntime(missing), /unavailable|replacement/i);

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
select("light");
for (const scale of base.dataVisScales) {
  if (scale.kind === "categorical")
    throw new Error("Expected a sequential scale.");
  const changeId = pathId([
    "colorSystem",
    "dataVisScales",
    { key: "id", id: scale.id },
  ]);
  store.set(editDataVisPointAtom, {
    scaleId: scale.id,
    pointId: scale.points[1].id,
    position: 0.2,
    scope: "base",
  });
  assert.deepEqual(
    colorFoundationParameters(store.get(colorSystemDocumentAtom))
      .filter((record) => record.edited)
      .map((record) => record.id),
    [`data-vis/${scale.id}/point/${scale.points[1].id}/position`],
  );
  const changed = store
    .get(changeGroupsAtom)
    .flatMap((group) => group.items)
    .find((item) => item.id === changeId);
  assert.ok(
    changed,
    "The current Changes registry identifies the edited recipe by its stable source path.",
  );
  assert.equal(changed.kind, "modified");
  store.set(applyChangeResetPlanAtom, itemResetPlan(changed));
  assert.deepEqual(
    store.get(colorSystemDocumentAtom).dataVisScales,
    base.dataVisScales,
  );
  store.set(removeDataVisScaleAtom, scale.id);
  assert.ok(
    colorFoundationParameters(store.get(colorSystemDocumentAtom))
      .filter((record) => record.id.startsWith(`data-vis/${scale.id}/`))
      .every((record) => record.edited),
  );
  const removed = store
    .get(changeGroupsAtom)
    .flatMap((group) => group.items)
    .find((item) => item.id === changeId);
  assert.ok(
    removed,
    "A removed recipe retains the same stable Changes source path.",
  );
  assert.equal(removed.kind, "removed");
  store.set(applyChangeResetPlanAtom, itemResetPlan(removed));
  assert.deepEqual(
    store.get(colorSystemDocumentAtom).dataVisScales,
    base.dataVisScales,
    "Revert restores each shipped recipe and its order.",
  );
}
const legacyFire = structuredClone(snapshot);
legacyFire.colorSystem.dataVisScales = [
  {
    ...fire,
    kind: "sequential",
    points: sequentialDefaults[0].stops.map(([value], index): DataVisPoint => {
      const color = paletteChannelsFromCss(value, "srgb");
      assert.ok(color);
      return {
        id: `fire-stop-${index + 1}`,
        position: index / 4,
        source: { kind: "key-color", color },
        contrast: { value: Color.contrast("#ffffff", value, "WCAG21") },
      };
    }),
    staticColors: sequentialDefaults[0].stops.map(([value], index) => ({
      id: `fire-stop-${index + 1}`,
      position: index / 4,
      value,
    })),
  },
];
previousStore.set(restoreAuthoringSnapshotAtom, legacyFire);
assert.deepEqual(
  previousStore.get(colorSystemDocumentAtom).dataVisScales,
  legacyFire.colorSystem.dataVisScales,
  "Earlier saved Static Fire values remain intact.",
);
assert.deepEqual(
  sequentialDefaults[0].stops.map((_, index) =>
    createDataVisRuntime(
      buildDataVisSourcePacket(captureSnapshot(previousStore.get)),
    ).continuous("Fire")(index / 4),
  ),
  sequentialDefaults[0].stops.map(([value]) => value),
  "Earlier saved Fire still renders its original exact colors.",
);
previousStore.set(resetAllAuthoringAtom);
assert.deepEqual(
  previousStore.get(colorSystemDocumentAtom).dataVisScales,
  base.dataVisScales,
);
assert.deepEqual(
  previousStore.get(changeGroupsAtom).flatMap((group) => group.items),
  [],
);

console.log(
  "Sequential defaults: 30 nearest token links, live modes/edits, runtime parity, source protection, clean baselines, unchanged token counts, saved preservation, reset and revert passed.",
);
