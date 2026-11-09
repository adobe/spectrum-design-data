// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  FOUNDATION_SETTING_IDS,
  foundationParameterDefaults,
  type FoundationParameterSettings,
} from "../../modes/foundationSettings";
import { foundationParameterSettingsAtom } from "../../modes/foundationSettingsState";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

export function foundationSettingsParameters(
  settings: FoundationParameterSettings,
): FoundationParameterRecord[] {
  const baseline = foundationParameterDefaults();
  return FOUNDATION_SETTING_IDS.flatMap((id) =>
    (["modal", "adaptive"] as const).map((kind) => ({
      id: `foundation-parameters/${id}/${kind}`,
      category: id.startsWith("color.")
        ? "color"
        : id.startsWith("typography.")
          ? "typography"
          : "elevation",
      edited: settings[id][kind] !== baseline[id][kind],
    })),
  );
}

export const foundationSettingsSource: FoundationImpactSource = {
  id: "foundation-parameter-settings",
  recordsAtom: atom((get) =>
    foundationSettingsParameters(get(foundationParameterSettingsAtom)),
  ),
};
