// Copyright 2026 Adobe. All rights reserved.
import { createStore } from "jotai";
import {
  captureSnapshot,
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../../src/features/edit-session/state";
import { colorSystemDocumentAtom } from "../../src/features/color-system/state";
import { modeSetsAtom } from "../../src/features/modes/state";
import { STANDARD_SCALE_NAMING_RULE_ID } from "../../src/features/logic/model";

export function createGraySnapshot(custom = true) {
  const store = createStore();
  store.set(restoreAuthoringSnapshotAtom, createDefaultSnapshot());
  const color = structuredClone(store.get(colorSystemDocumentAtom));
  const shippedGray = color.scales.find((scale) => scale.name === "Gray");
  const shared = color.scales.find((scale) => !scale.customContrasts);
  if (!shippedGray || !shared)
    throw new Error(
      "The contrast fixture needs its shipped Gray and shared scales.",
    );
  [shippedGray.name, shared.name] = [shared.name, shippedGray.name];
  [shippedGray.nameRef, shared.nameRef] = [shared.nameRef, shippedGray.nameRef];
  color.scales = [
    shared,
    ...color.scales.filter(
      (scale) => scale !== shared && scale !== shippedGray,
    ),
    shippedGray,
  ];
  if (custom)
    color.scales[0].customContrasts = {
      steps: color.contrasts.slice(0, 13).map((step) => ({ ...step })),
      baseContrastId: color.contrasts[3].id,
      namingRuleId: STANDARD_SCALE_NAMING_RULE_ID,
    };
  store.set(colorSystemDocumentAtom, color);
  if (custom) {
    const sets = structuredClone(store.get(modeSetsAtom));
    const owner = sets.find((axis) =>
      axis.authoringCapabilities?.includes("color.contrastMultiplier"),
    )!;
    const high = owner.modes.find((mode) => mode.key === "high")!;
    high.foundations.color = {
      ...high.foundations.color,
      scaleContrasts: {
        ...high.foundations.color?.scaleContrasts,
        [color.scales[0].id]: { [color.contrasts[3].id]: 5.5 },
      },
    };
    store.set(modeSetsAtom, sets);
  }
  return structuredClone(captureSnapshot(store.get));
}
