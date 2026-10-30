// Copyright 2026 Adobe. All rights reserved.
import { createStore } from "jotai";
import {
  captureSnapshot,
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../../src/features/edit-session/state";
import { colorSystemDocumentAtom } from "../../src/features/color-system/state";
import { modeSetsAtom } from "../../src/features/modes/state";
import {
  DEFAULT_CATEGORICAL_PREFERENCES,
  type DataVisScale,
} from "../../src/features/color-system/data-vis/model";

export const DATA_VIS_IDS = {
  sequential: "data-sequential",
  diverging: "data-diverging",
  categorical: "data-categorical",
};

export function createDataVisSnapshot(categoricalCount = 2) {
  const store = createStore();
  store.set(restoreAuthoringSnapshotAtom, createDefaultSnapshot());
  const color = structuredClone(store.get(colorSystemDocumentAtom));
  color.settings.colorOutput.outputFormat = "hex";
  const blue = color.scales.find((scale) => scale.name === "blue"),
    orange = color.scales.find((scale) => scale.name === "orange");
  const gray = color.scales.find((scale) => scale.name === "gray"),
    green = color.scales.find((scale) => scale.name === "green");
  const swatch = color.contrasts.find((step) => step.value >= 4.5);
  if (!blue || !orange || !gray || !green || !swatch)
    throw new Error("The data vis fixture needs its shipped UI sources.");
  const scales: DataVisScale[] = [
    {
      id: DATA_VIS_IDS.sequential,
      name: "Data sequence",
      kind: "sequential",
      points: [
        {
          id: "start",
          position: 0,
          source: { kind: "ui-scale", scaleId: blue.id },
          contrast: { value: 1.3, oppositeValue: 1.5 },
        },
        {
          id: "named",
          position: 0.5,
          source: {
            kind: "ui-swatch",
            scaleId: blue.id,
            contrastId: swatch.id,
          },
        },
        {
          id: "end",
          position: 1,
          source: {
            kind: "key-color",
            color: { lightness: 0.6, hue: 260, chroma: 50 },
          },
          contrast: { value: 8 },
        },
      ],
    },
    {
      id: DATA_VIS_IDS.diverging,
      name: "Data divergence",
      kind: "diverging",
      points: [
        {
          id: "left",
          position: 0,
          source: { kind: "ui-scale", scaleId: blue.id },
          contrast: { value: 8 },
        },
        {
          id: "center",
          position: 0.5,
          source: { kind: "ui-scale", scaleId: gray.id },
          contrast: { value: 1.3 },
        },
        {
          id: "right",
          position: 1,
          source: { kind: "ui-scale", scaleId: orange.id },
          contrast: { value: 8 },
        },
      ],
    },
    {
      id: DATA_VIS_IDS.categorical,
      name: "Data categories",
      kind: "categorical",
      members: [
        {
          id: "blue-member",
          source: {
            kind: "ui-swatch",
            scaleId: blue.id,
            contrastId: swatch.id,
          },
        },
        {
          id: "orange-member",
          source: {
            kind: "ui-swatch",
            scaleId: orange.id,
            contrastId: swatch.id,
          },
        },
      ],
      preferences: {
        ...structuredClone(DEFAULT_CATEGORICAL_PREFERENCES),
        minimumBackgroundContrast: 1,
        minimumDeltaE: 0,
      },
    },
  ];
  const categorical = scales.find((scale) => scale.kind === "categorical");
  if (!categorical || categorical.kind !== "categorical")
    throw new Error("Missing categorical fixture.");
  for (
    let index = categorical.members.length;
    index < categoricalCount;
    index++
  ) {
    categorical.members.push({
      id: `comparison-member-${index}`,
      source: {
        kind: "ui-swatch",
        scaleId: blue.id,
        contrastId: color.contrasts[index % color.contrasts.length].id,
      },
    });
  }
  store.set(colorSystemDocumentAtom, { ...color, dataVisScales: scales });
  const sets = structuredClone(store.get(modeSetsAtom));
  const scheme = sets.find((axis) => axis.key === "colorScheme"),
    contrast = sets.find((axis) => axis.key === "contrast");
  const dark = scheme?.modes.find((mode) => mode.key === "dark"),
    high = contrast?.modes.find((mode) => mode.key === "high");
  if (!scheme || !contrast || !dark || !high)
    throw new Error(
      "The data vis fixture needs Light/Dark and Contrast modes.",
    );
  scheme.authoringCapabilities = [
    ...(scheme.authoringCapabilities ?? []),
    "color.scales",
  ];
  dark.foundations.color = {
    ...dark.foundations.color,
    dataVisSources: {
      [DATA_VIS_IDS.diverging]: { right: { scaleId: green.id } },
    },
  };
  high.foundations.color = {
    ...high.foundations.color,
    dataVisContrasts: { [DATA_VIS_IDS.sequential]: { start: 2.4 } },
  };
  store.set(modeSetsAtom, sets);
  return structuredClone(captureSnapshot(store.get));
}
