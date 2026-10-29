// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { MODE_SET_DEFAULTS, type Mode, type ModeSet } from "../../modes/model";
import { FOUNDATION_PARAMETERS, parameterValue } from "../../modes/parameters";
import { modeSetsAtom } from "../../modes/state";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

// Per-mode scale stop overrides are a slot too, though not a global mode-controllable parameter.
const SCALE_STOPS_SLOT = "color.scaleStops";

function slotValue(mode: Mode | undefined, slot: string) {
  if (!mode) return undefined;
  return slot === SCALE_STOPS_SLOT
    ? mode.foundations.color?.scaleStops
    : parameterValue(mode, slot);
}

function modesById(modeSets: readonly ModeSet[]) {
  return new Map(
    modeSets.flatMap((modeSet) =>
      modeSet.modes.map((mode) => [`${modeSet.id}/${mode.id}`, mode] as const),
    ),
  );
}

/** Each mode × overridable parameter is one slot; a slot is edited when its override differs from the default data. */
export function modeFoundationParameters(
  modeSets: readonly ModeSet[],
): FoundationParameterRecord[] {
  const before = modesById(MODE_SET_DEFAULTS);
  const after = modesById(modeSets);
  const slots = [
    ...FOUNDATION_PARAMETERS.map((parameter) => parameter.id),
    SCALE_STOPS_SLOT,
  ];
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((modeId) =>
    slots
      .map((slot) => ({
        id: `mode/${modeId}/${slot}`,
        category: "modes" as const,
        edited:
          JSON.stringify(slotValue(before.get(modeId), slot)) !==
          JSON.stringify(slotValue(after.get(modeId), slot)),
      }))
      .concat(
        before.get(modeId)?.foundations.color?.scaleContrasts ||
          after.get(modeId)?.foundations.color?.scaleContrasts
          ? [
              {
                id: `mode/${modeId}/color.scaleContrasts`,
                category: "modes" as const,
                edited:
                  JSON.stringify(
                    before.get(modeId)?.foundations.color?.scaleContrasts,
                  ) !==
                  JSON.stringify(
                    after.get(modeId)?.foundations.color?.scaleContrasts,
                  ),
              },
            ]
          : [],
      )
      .concat(
        (["dataVisSources", "dataVisContrasts"] as const).flatMap((field) => {
          const old = before.get(modeId)?.foundations.color?.[field],
            next = after.get(modeId)?.foundations.color?.[field];
          return old || next
            ? [
                {
                  id: `mode/${modeId}/color.${field}`,
                  category: "modes" as const,
                  edited: JSON.stringify(old) !== JSON.stringify(next),
                },
              ]
            : [];
        }),
      ),
  );
}

export const modeFoundationSource: FoundationImpactSource = {
  id: "mode-foundation-overrides",
  recordsAtom: atom((get) => modeFoundationParameters(get(modeSetsAtom))),
};
