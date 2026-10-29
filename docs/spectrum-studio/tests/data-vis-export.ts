// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import Color from "colorjs.io";
import { createStore } from "jotai";
import { createDataVisSnapshot, DATA_VIS_IDS } from "./fixtures/dataVis";
import {
  assertStoredSnapshot,
  captureSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import { buildDataVisSourcePacket } from "../src/features/color-system/data-vis/export";
import { buildDataVisCategoricalCss } from "../src/features/color-system/data-vis/css";
import { createDataVisRuntime } from "../src/features/color-system/data-vis/adapter";
import { completeAliasSource } from "../src/features/tokens/aliasTargets";
import {
  dataVisContinuousOutputsAtom,
  dataVisPrimitiveColorsAtom,
  editDataVisPointAtom,
  resolvedCategoricalTokensAtom,
} from "../src/features/color-system/data-vis/state";
import { setDataVisStaticAtom } from "../src/features/color-system/data-vis/frozenState";
import {
  editBrowserTokensAtom,
  browserModeContextAtom,
} from "../src/features/tokens/browserState";
import { editModeAtom } from "../src/state/view/editMode";
import { dataVisMemberId } from "../src/features/color-system/data-vis/identity";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { serializeOutputColor } from "../src/features/color-system/outputSerialization";
import { ColorOutputError } from "../src/features/color-system/outputContrast";

const snapshot = createDataVisSnapshot(),
  before = structuredClone(snapshot);
assertStoredSnapshot(snapshot);
const packet = buildDataVisSourcePacket(snapshot);
assert.deepEqual(
  snapshot,
  before,
  "Source closure must not mutate a working or saved snapshot.",
);
assert.equal(packet.color.surfaces.length, 0);
assert.ok(packet.color.scales.length < snapshot.colorSystem.scales.length);
assert.ok(
  packet.modeSets.every((axis) =>
    axis.modes.every(
      (mode) =>
        !mode.foundations.typography &&
        !mode.foundations.elevation &&
        mode.platformIds.length === 0,
    ),
  ),
);
assert.throws(
  () => buildDataVisSourcePacket({ ...snapshot, rules: undefined }),
  /authoritative rule library/,
);
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, snapshot);
const scheme = snapshot.modeSets.find((axis) => axis.key === "colorScheme")!,
  contrast = snapshot.modeSets.find((axis) => axis.key === "contrast")!;
for (const mode of scheme.modes)
  for (const strength of contrast.modes)
    for (const multiplier of [0, 1, 1.25]) {
      store.set(modeSelectionAtom, {
        [scheme.key]: mode.id,
        [contrast.key]: strength.id,
      });
      store.set(previewOverridesAtom, {
        "color.contrastMultiplier": multiplier,
      });
      const runtime = createDataVisRuntime(packet, {
        modes: { [scheme.key]: mode.key, [contrast.key]: strength.key },
        contrastMultiplier: multiplier,
      });
      for (const output of store.get(dataVisContinuousOutputsAtom)) {
        if (output.status !== "ready") throw new Error(output.error);
        for (const value of [-2, 0, 0.07, 0.25, 0.5, 0.83, 1, 9])
          assert.equal(
            runtime.continuous(output.scale.id)(value),
            output.scale.evaluate(value),
          );
        assert.deepEqual(
          runtime.diagnostics(output.scale.id),
          output.scale.diagnostics,
        );
      }
      assert.deepEqual(
        runtime.categorical(DATA_VIS_IDS.categorical),
        store.get(resolvedCategoricalTokensAtom).map((token) => token.value),
      );
    }
const dark = createDataVisRuntime(packet, { modes: { colorScheme: "dark" } });
assert.equal(
  dark
    .withContext({ contrastMultiplier: 1.25 })
    .continuous(DATA_VIS_IDS.diverging)(1),
  createDataVisRuntime(packet, {
    modes: { colorScheme: "dark" },
    contrastMultiplier: 1.25,
  }).continuous(DATA_VIS_IDS.diverging)(1),
);
assert.throws(() => dark.continuous(DATA_VIS_IDS.categorical), /categorical/);
assert.throws(() => dark.categorical(DATA_VIS_IDS.sequential), /continuous/);
assert.throws(() => dark.continuous("missing"), /available/);
assert.throws(
  () => dark.continuous(DATA_VIS_IDS.sequential)(Number.NaN),
  /finite/,
);
assert.throws(
  () => createDataVisRuntime(packet, { modes: { missing: "dark" } }),
  /Unknown mode set/,
);
assert.throws(
  () => createDataVisRuntime(packet, { modes: { colorScheme: "missing" } }),
  /unavailable/,
);
assert.throws(
  () => createDataVisRuntime(packet, { contrastMultiplier: Infinity }),
  /finite/,
);
assert.throws(
  () => createDataVisRuntime(packet, { backgroundLightness: 2 }),
  /background lightness/,
);
assert.throws(
  () => createDataVisRuntime(packet, { backgroundScaleId: "missing" }),
  /outside/,
);
const malformed = structuredClone(packet);
malformed.color.scales[0].stops[0].lightness = Number.NaN;
assert.throws(
  () => createDataVisRuntime(malformed),
  /invalid UI scale geometry/,
);
const badMode = structuredClone(packet);
badMode.modeSets[0].modes[0].foundations.color = {
  dataVisContrasts: { [DATA_VIS_IDS.sequential]: { start: 22 } },
};
assert.throws(() => createDataVisRuntime(badMode), /invalid color parameters/);
const badSource = structuredClone(packet);
const sequence = badSource.color.dataVisScales.find(
  (scale) => scale.id === DATA_VIS_IDS.sequential,
)!;
if (sequence.kind === "categorical")
  throw new Error("Expected a continuous fixture.");
sequence.points[1].source = {
  kind: "ui-swatch",
  scaleId: "missing",
  contrastId: "missing",
};
assert.throws(() => createDataVisRuntime(badSource), /unavailable/);
for (const [invalid, expected] of [
  [
    Object.assign(structuredClone(packet), { modeSets: [null] }),
    /invalid mode sets/,
  ],
  [
    Object.assign(structuredClone(packet), {
      modeSets: [{ ...packet.modeSets[0], modes: [null] }],
    }),
    /unique modes/,
  ],
  [
    Object.assign(structuredClone(packet), {
      modeSets: [{ ...packet.modeSets[0], authoringCapabilities: {} }],
    }),
    /unique modes/,
  ],
  [
    Object.assign(structuredClone(packet), {
      color: { ...packet.color, scales: [null] },
    }),
    /invalid UI scale geometry/,
  ],
  [
    Object.assign(structuredClone(packet), {
      color: {
        ...packet.color,
        scales: [{ ...packet.color.scales[0], stops: [null] }],
      },
    }),
    /invalid UI scale geometry/,
  ],
] as const)
  assert.throws(() => createDataVisRuntime(invalid), expected);
const invalidDefault = structuredClone(packet),
  sourceAxis = invalidDefault.modeSets.find(
    (axis) => axis.key === "colorScheme",
  )!;
sourceAxis.defaultModeId = sourceAxis.modes.find(
  (mode) => mode.key === "dark",
)!.id;
assert.throws(
  () => createDataVisRuntime(invalidDefault),
  /clear.*data vis overrides.*default/,
);

store.set(restoreAuthoringSnapshotAtom, snapshot);
const categorical = snapshot.colorSystem.dataVisScales.find(
  (scale) => scale.kind === "categorical",
)!;
if (categorical.kind !== "categorical")
  throw new Error("Expected a categorical fixture.");
const sourceId = tokenUuid(
  tokenStableKey(
    categorical.members[0].source.scaleId,
    categorical.members[0].source.contrastId,
  ),
);
const memberId = dataVisMemberId(categorical.id, categorical.members[1].id);
const key = canonicalTokenModeKey(
  Object.fromEntries(
    snapshot.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  ),
);
const invalidEdits = {
  [sourceId]: {
    values: { [key]: { value: "rgb(30 100 190 / 0.7)", baseline: "#000000" } },
  },
  [memberId]: { values: { [key]: { value: "#335522", baseline: "#000000" } } },
};
store.set(browserTokenEditsAtom, invalidEdits);
assert.throws(
  () =>
    createDataVisRuntime(buildDataVisSourcePacket(captureSnapshot(store.get))),
  ColorOutputError,
  "An under-target manual UI source must not escape through standalone data vis output.",
);
const manualColor = "rgb(0 20 40 / 0.9)";
const formattedManualColor = serializeOutputColor(
  new Color(manualColor),
  snapshot.colorSystem.settings.colorOutput,
);
store.set(browserTokenEditsAtom, {
  ...invalidEdits,
  [sourceId]: {
    values: { [key]: { value: manualColor, baseline: "#000000" } },
  },
});
const edited = captureSnapshot(store.get),
  editedPacket = buildDataVisSourcePacket(edited),
  runtime = createDataVisRuntime(editedPacket);
assert.deepEqual(runtime.categorical(categorical.id), [
  formattedManualColor,
  "#335522",
]);
assert.equal(
  runtime.continuous(DATA_VIS_IDS.sequential)(0.5),
  formattedManualColor,
);
const copied = runtime.categorical(categorical.id);
copied[0] = "#ffffff";
assert.equal(runtime.categorical(categorical.id)[0], formattedManualColor);
const css = buildDataVisCategoricalCss(completeAliasSource(snapshot));
assert.match(css, /--data-categories-color-1:/);
assert.match(css, /var\(--blue-color-/);
assert.match(css, /\[data-color-scheme="dark"\]/);
const editedCss = buildDataVisCategoricalCss(completeAliasSource(edited));
assert.ok(editedCss.includes(formattedManualColor));
assert.match(editedCss, /#335522/);
assert.ok(
  !editedCss.includes("var(--blue-color-"),
  "A manual source cannot reference the generated UI variable.",
);
assert.equal(
  buildColorLibrary(snapshot.colorSystem),
  buildColorLibrary({ ...snapshot.colorSystem, dataVisScales: [] }),
  "Data vis recipes cannot alter the existing CSS-only UI library.",
);

const artifact = new URL("../public/data-vis/data-vis.js", import.meta.url);
const compiled: typeof import("../src/features/color-system/data-vis/adapter") =
  await import(pathToFileURL(artifact.pathname).href);
const text = await readFile(artifact, "utf8");
assert.ok(
  Buffer.byteLength(text, "utf8") < 150_000,
  "The compiled standalone runtime has a deterministic uncompressed byte budget.",
);
assert.match(text, /Copyright \(c\) 2021 Lea Verou, Chris Lilley/);
assert.match(text, /Permission is hereby granted, free of charge/);
assert.ok(
  !/\b(?:document|window|Worker)\s*[.(]|from\s*["'](?:react|jotai|@react-spectrum)|function\s+(?:suggestCategorical|useSuggestions)/.test(
    text,
  ),
);
assert.deepEqual(
  compiled.createDataVisRuntime(editedPacket).categorical(categorical.id),
  runtime.categorical(categorical.id),
);
const polarSnapshot = createDataVisSnapshot();
polarSnapshot.colorSystem.settings.colorOutput = {
  authoringGamut: "srgb",
  outputFormat: "oklch",
  mapOutputsToSrgb: false,
};
const polarScale = polarSnapshot.colorSystem.dataVisScales.find(
  (scale) => scale.id === DATA_VIS_IDS.sequential,
)!;
if (polarScale.kind !== "sequential")
  throw new Error("Expected a sequential fixture.");
polarScale.staticColors = [
  { id: "polar-start", position: 0, value: "oklch(0.6 0.08 20)" },
  { id: "polar-end", position: 1, value: "oklch(0.8 0.08 100)" },
];
const polarPacket = buildDataVisSourcePacket(polarSnapshot);
for (const mode of ["light", "dark"]) {
  const actual = compiled.createDataVisRuntime(polarPacket, {
    modes: { colorScheme: mode },
    contrastMultiplier: 1.5,
  });
  for (const position of [0.25, 0.5, 0.75]) {
    const color = new Color(
      actual.continuous(DATA_VIS_IDS.sequential)(position),
    ).to("oklch");
    assert.ok(
      Math.abs(Number(color.coords[0]) - (0.6 + 0.2 * position)) < 0.000002,
    );
    assert.ok(
      Math.abs(Number(color.coords[1]) - 0.08) < 0.000002,
      "The compiled runtime must interpolate polar chroma, not Cartesian OKLab.",
    );
    assert.ok(
      Math.abs(Number(color.coords[2]) - (20 + 80 * position)) < 0.0002,
    );
  }
}
for (const mode of ["light", "dark"])
  for (const multiplier of [0, 1, 1.5]) {
    const options = {
      modes: { colorScheme: mode },
      contrastMultiplier: multiplier,
    };
    const actual = compiled.createDataVisRuntime(packet, options),
      expected = createDataVisRuntime(packet, options);
    for (const id of [DATA_VIS_IDS.sequential, DATA_VIS_IDS.diverging])
      for (const value of [0, 0.2, 0.5, 0.8, 1]) {
        assert.equal(
          actual.continuous(id)(value),
          expected.continuous(id)(value),
        );
      }
    store.set(restoreAuthoringSnapshotAtom, snapshot);
    store.set(editModeAtom, true);
    store.set(modeSelectionAtom, {});
    store.set(previewOverridesAtom, {});
    for (const origin of ["palette", "ui-swatch", "categorical"]) {
      const color = store
        .get(dataVisPrimitiveColorsAtom)
        .find((color) => color.origin.kind === origin)!;
      store.set(editDataVisPointAtom, {
        scaleId: DATA_VIS_IDS.sequential,
        pointId: "named",
        source: { kind: "primitive-token", tokenId: color.id },
        scope: "base",
      });
      const nativePacket = buildDataVisSourcePacket(captureSnapshot(store.get));
      const actual = compiled.createDataVisRuntime(nativePacket),
        expected = createDataVisRuntime(nativePacket);
      for (const value of [0, 0.2, 0.5, 0.8, 1])
        assert.equal(
          actual.continuous(DATA_VIS_IDS.sequential)(value),
          expected.continuous(DATA_VIS_IDS.sequential)(value),
        );
    }
    for (const id of [
      DATA_VIS_IDS.sequential,
      DATA_VIS_IDS.diverging,
      DATA_VIS_IDS.categorical,
    ]) {
      store.set(setDataVisStaticAtom, { scaleId: id, from: "current" });
    }
    store.set(editBrowserTokensAtom, {
      ids: [memberId],
      modeKey: store.get(browserModeContextAtom).key,
      patch: { value: "color(display-p3 0.12 0.23 0.34 / 0.45)" },
    });
    const staticPacket = buildDataVisSourcePacket(captureSnapshot(store.get));
    for (const mode of ["light", "dark"])
      for (const multiplier of [0, 1.5]) {
        const options = {
          modes: { colorScheme: mode },
          contrastMultiplier: multiplier,
        };
        const actual = compiled.createDataVisRuntime(staticPacket, options),
          expected = createDataVisRuntime(staticPacket);
        assert.deepEqual(
          actual.categorical(DATA_VIS_IDS.categorical),
          expected.categorical(DATA_VIS_IDS.categorical),
        );
        assert.equal(
          actual.categorical(DATA_VIS_IDS.categorical)[1],
          serializeOutputColor(
            new Color("color(display-p3 0.12 0.23 0.34 / 0.45)"),
            snapshot.colorSystem.settings.colorOutput,
          ),
        );
        for (const id of [DATA_VIS_IDS.sequential, DATA_VIS_IDS.diverging])
          for (const value of [0, 0.2, 0.5, 0.8, 1]) {
            assert.equal(
              actual.continuous(id)(value),
              expected.continuous(id)(value),
            );
          }
      }
    const { colorOutput, ...legacySettings } = packet.color.settings;
    void colorOutput;
    const oldPacket = {
      ...packet,
      schemaVersion: 1,
      color: {
        ...packet.color,
        schemaVersion: 3,
        settings: { ...legacySettings, outputGamut: "srgb" },
      },
    };
    assert.equal(
      compiled
        .createDataVisRuntime(oldPacket)
        .continuous(DATA_VIS_IDS.sequential)(0.37),
      createDataVisRuntime(packet).continuous(DATA_VIS_IDS.sequential)(0.37),
    );
  }
for (const origin of ["palette", "ui-swatch", "categorical"]) {
  store.set(restoreAuthoringSnapshotAtom, snapshot);
  store.set(editModeAtom, true);
  store.set(modeSelectionAtom, {
    [scheme.key]: scheme.modes.find((mode) => mode.key === "dark")!.id,
  });
  store.set(previewOverridesAtom, {});
  const color = store
    .get(dataVisPrimitiveColorsAtom)
    .find((color) => color.origin.kind === origin)!;
  store.set(editDataVisPointAtom, {
    scaleId: DATA_VIS_IDS.sequential,
    pointId: "named",
    source: { kind: "primitive-token", tokenId: color.id },
    scope: "mode",
  });
  const nativeModePacket = buildDataVisSourcePacket(captureSnapshot(store.get));
  const actual = compiled.createDataVisRuntime(nativeModePacket, {
    modes: { colorScheme: "dark" },
  });
  const output = store
    .get(dataVisContinuousOutputsAtom)
    .find(
      (output) =>
        output.status === "ready" &&
        output.scale.id === DATA_VIS_IDS.sequential,
    );
  assert.ok(output?.status === "ready");
  for (const position of [0, 0.2, 0.5, 0.8, 1])
    assert.equal(
      actual.continuous(DATA_VIS_IDS.sequential)(position),
      output.scale.evaluate(position),
    );
  const { colorOutput, ...legacySettings } = nativeModePacket.color.settings;
  void colorOutput;
  assert.throws(
    () =>
      compiled.createDataVisRuntime({
        ...nativeModePacket,
        schemaVersion: 1,
        color: {
          ...nativeModePacket.color,
          schemaVersion: 3,
          settings: { ...legacySettings, outputGamut: "srgb" },
        },
      }),
    /Version-one packets cannot contain primitive-token patches/,
  );
}
console.log(
  "Data vis export: native mode/fluid parity, final overrides, source closure, exact categorical CSS, malformed input, unchanged UI CSS and compiled pure ESM passed.",
);
