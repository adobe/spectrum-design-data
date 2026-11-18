// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { foundationDocumentsAtom } from "./foundationDocuments";
import { modeSetsAtom } from "./documentState";
import {
  modeSelectionAtom,
  resolveActiveMode,
  selectModeAtom,
} from "./selection";
import {
  clearPreviewParametersAtom,
  previewOverridesAtom,
} from "./previewState";
import { ADAPTIVE_COLOR_CHANNEL_IDS } from "./foundationSettings";
import {
  parameterValuesMatch,
  responsibleParameterIds,
  effectiveParameterValue,
  type FoundationDocuments,
} from "./parameters";
import type { Mode } from "./model";

/** Selected key for a control whose values no longer match any of its modes. */
export const CUSTOM_MODE_KEY = "__custom__";

function effectiveValue(
  mode: Mode | undefined,
  parameterId: string,
  base: FoundationDocuments,
) {
  return effectiveParameterValue(mode, parameterId, base);
}

/**
 * The mode each control should display, which is derived from resolved values rather than from
 * `modeSelectionAtom` so previewing back onto a mode's saved values re-selects that mode.
 */
export const displayedModeIdsAtom = atom((get) => {
  const modeSets = get(modeSetsAtom);
  const selection = get(modeSelectionAtom);
  const preview = get(previewOverridesAtom);
  const base = get(foundationDocumentsAtom);

  const displayed: Record<string, string> = {};
  for (const modeSet of modeSets) {
    const active = resolveActiveMode(modeSet, selection);
    const parameterIds = responsibleParameterIds(modeSets, modeSet.id);
    const colorIsCustom = ADAPTIVE_COLOR_CHANNEL_IDS.some(
      (id, index) =>
        parameterIds.includes(id) &&
        preview[id] !== undefined &&
        !parameterValuesMatch(preview[id], index === 0 ? 0 : 100),
    );
    if (colorIsCustom) {
      displayed[modeSet.key] = CUSTOM_MODE_KEY;
      continue;
    }
    const comparableIds = parameterIds.filter(
      (id) => !ADAPTIVE_COLOR_CHANNEL_IDS.some((channel) => channel === id),
    );
    const current = comparableIds.map(
      (id) => preview[id] ?? effectiveValue(active, id, base),
    );

    const matches = modeSet.modes.filter((mode) =>
      comparableIds.every((id, index) =>
        parameterValuesMatch(effectiveValue(mode, id, base), current[index]),
      ),
    );
    const chosen = matches.find((mode) => mode.id === active?.id) ?? matches[0];
    displayed[modeSet.key] = chosen?.id ?? CUSTOM_MODE_KEY;
  }
  return displayed;
});

/**
 * Previewed setting ids whose values match no published mode: their mode set shows as
 * custom, or no mode set covers them and the value differs from the saved document.
 */
export const previewOnlyParameterIdsAtom = atom((get) => {
  const modeSets = get(modeSetsAtom);
  const preview = get(previewOverridesAtom);
  const displayed = get(displayedModeIdsAtom);
  const base = get(foundationDocumentsAtom);
  const ids: string[] = [];
  for (const id of Object.keys(preview)) {
    if (preview[id] === undefined) continue;
    const owners = modeSets.filter((modeSet) =>
      responsibleParameterIds(modeSets, modeSet.id).includes(id),
    );
    const custom = owners.length
      ? owners.some((modeSet) => displayed[modeSet.key] === CUSTOM_MODE_KEY)
      : !parameterValuesMatch(preview[id], effectiveValue(undefined, id, base));
    if (custom) ids.push(id);
  }
  return ids;
});

/** True when any chart driver, matched exactly or by `prefix.*`, is preview-only. */
export function isPreviewDriven(
  previewOnlyIds: readonly string[],
  drivers: readonly string[],
) {
  return previewOnlyIds.some((id) =>
    drivers.some((driver) =>
      driver.endsWith(".*")
        ? id.startsWith(driver.slice(0, -1))
        : id === driver,
    ),
  );
}

/** Selects a mode and discards any preview that mode set is responsible for. */
export const resetModeAtom = atom(
  null,
  (get, set, input: { modeSetKey: string; modeId: string }) => {
    set(selectModeAtom, input);
    const modeSets = get(modeSetsAtom);
    const modeSet = modeSets.find(
      (candidate) => candidate.key === input.modeSetKey,
    );
    if (!modeSet) return;
    set(
      clearPreviewParametersAtom,
      responsibleParameterIds(modeSets, modeSet.id),
    );
  },
);
