// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { foundationDocumentsAtom } from "./foundationDocuments";
import { modeSetsAtom } from "./state";
import {
  modeSelectionAtom,
  resolveActiveMode,
  selectModeAtom,
} from "./selection";
import {
  clearPreviewParametersAtom,
  previewOverridesAtom,
} from "./previewState";
import { adaptiveClaimsAtom } from "./adaptive";
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
  const claims = get(adaptiveClaimsAtom);

  const displayed: Record<string, string> = {};
  for (const modeSet of modeSets) {
    const active = resolveActiveMode(modeSet, selection);
    const parameterIds = responsibleParameterIds(modeSets, modeSet.id, claims);
    const current = parameterIds.map(
      (id) => preview[id] ?? effectiveValue(active, id, base),
    );

    const matches = modeSet.modes.filter((mode) =>
      parameterIds.every((id, index) =>
        parameterValuesMatch(effectiveValue(mode, id, base), current[index]),
      ),
    );
    const chosen = matches.find((mode) => mode.id === active?.id) ?? matches[0];
    displayed[modeSet.key] = chosen?.id ?? CUSTOM_MODE_KEY;
  }
  return displayed;
});

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
      responsibleParameterIds(modeSets, modeSet.id, get(adaptiveClaimsAtom)),
    );
  },
);
