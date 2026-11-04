// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { MODE_SET_DEFAULTS, type ModeSet } from "../../modes/model";
import { FOUNDATION_PARAMETERS, parameterValue } from "../../modes/parameters";
import { modeSetsAtom } from "../../modes/state";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

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
  const slots = FOUNDATION_PARAMETERS.map((parameter) => parameter.id);
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((modeId) => {
    const beforeMode = before.get(modeId),
      afterMode = after.get(modeId);
    return slots
      .map((slot) => ({
        id: `mode/${modeId}/${slot}`,
        category: "modes" as const,
        edited:
          JSON.stringify(
            beforeMode ? parameterValue(beforeMode, slot) : undefined,
          ) !==
          JSON.stringify(
            afterMode ? parameterValue(afterMode, slot) : undefined,
          ),
      }))
      .concat([
        {
          id: `mode/${modeId}/color.scaleAdjustment`,
          category: "modes" as const,
          edited:
            JSON.stringify(beforeMode?.foundations.color?.scaleAdjustment) !==
            JSON.stringify(afterMode?.foundations.color?.scaleAdjustment),
        },
      ])
      .concat(
        beforeMode?.foundations.color?.scaleContrasts ||
          afterMode?.foundations.color?.scaleContrasts
          ? [
              {
                id: `mode/${modeId}/color.scaleContrasts`,
                category: "modes" as const,
                edited:
                  JSON.stringify(
                    beforeMode?.foundations.color?.scaleContrasts,
                  ) !==
                  JSON.stringify(afterMode?.foundations.color?.scaleContrasts),
              },
            ]
          : [],
      )
      .concat(
        beforeMode?.foundations.color?.dataVisContrasts ||
          afterMode?.foundations.color?.dataVisContrasts
          ? [
              {
                id: `mode/${modeId}/color.dataVisContrasts`,
                category: "modes" as const,
                edited:
                  JSON.stringify(
                    beforeMode?.foundations.color?.dataVisContrasts,
                  ) !==
                  JSON.stringify(
                    afterMode?.foundations.color?.dataVisContrasts,
                  ),
              },
            ]
          : [],
      );
  });
}

export const modeFoundationSource: FoundationImpactSource = {
  id: "mode-foundation-overrides",
  recordsAtom: atom((get) => modeFoundationParameters(get(modeSetsAtom))),
};
