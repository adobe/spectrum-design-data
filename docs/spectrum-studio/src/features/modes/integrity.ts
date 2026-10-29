// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  AUTHORING_CAPABILITIES,
  type AuthoringCapability,
  type ModeSet,
} from "./model";
import { modeOverridesCapability } from "./parameters";
import { adaptiveClaimsAtom, type AdaptiveClaims } from "./adaptive";
import { modeSelectionAtom, type ModeSelection } from "./selection";
import { modeSetsAtom } from "./state";

export interface ModeState {
  modeSets: ModeSet[];
  selection: ModeSelection;
  claims: AdaptiveClaims;
}

export interface NormalizedModeState extends ModeState {
  corrections: string[];
}

function isCapability(value: string): value is AuthoringCapability {
  return (AUTHORING_CAPABILITIES as readonly string[]).includes(value);
}

/**
 * Restores the invariants mode resolution depends on, for any sets and registered parameters:
 * one owner per parameter, stored overrides are owned, claims and selections reference live data.
 */
export function normalizeModeState({
  modeSets,
  selection,
  claims,
}: ModeState): NormalizedModeState {
  const corrections: string[] = [];
  const owners = new Map<AuthoringCapability, string>();

  let sets = modeSets.map((modeSet) => {
    const capabilities = (modeSet.authoringCapabilities ?? []).filter(
      (capability) => {
        const owner = owners.get(capability);
        if (owner === undefined) {
          owners.set(capability, modeSet.id);
          return true;
        }
        if (owner !== modeSet.id)
          corrections.push(
            `${modeSet.name}: ${capability} is already owned by another mode set`,
          );
        return false;
      },
    );
    return capabilities.length === (modeSet.authoringCapabilities ?? []).length
      ? modeSet
      : { ...modeSet, authoringCapabilities: capabilities };
  });

  const grant = (
    modeSetId: string,
    capability: AuthoringCapability,
    reason: string,
  ) => {
    owners.set(capability, modeSetId);
    sets = sets.map((modeSet) =>
      modeSet.id !== modeSetId
        ? modeSet
        : {
            ...modeSet,
            authoringCapabilities: [
              ...(modeSet.authoringCapabilities ?? []),
              capability,
            ],
          },
    );
    corrections.push(
      `${sets.find((modeSet) => modeSet.id === modeSetId)?.name}: owns ${capability} (${reason})`,
    );
  };

  for (const modeSet of sets) {
    for (const capability of AUTHORING_CAPABILITIES) {
      if (owners.has(capability)) continue;
      const overridden = modeSet.modes.some(
        (mode) =>
          mode.id !== modeSet.defaultModeId &&
          modeOverridesCapability(mode, capability),
      );
      if (overridden) grant(modeSet.id, capability, "its modes override it");
    }
  }

  const setIds = new Set(sets.map((modeSet) => modeSet.id));
  const nextClaims: AdaptiveClaims = {};
  for (const [parameterId, ownerId] of Object.entries(claims)) {
    if (!isCapability(parameterId) || !setIds.has(ownerId)) {
      corrections.push(
        `Dropped adaptive claim ${parameterId}: unknown parameter or mode set`,
      );
      continue;
    }
    const owner = owners.get(parameterId);
    if (owner !== undefined && owner !== ownerId) {
      corrections.push(
        `Dropped adaptive claim ${parameterId}: owned by another mode set`,
      );
      continue;
    }
    if (owner === undefined)
      grant(ownerId, parameterId, "it is claimed as an adaptive control");
    nextClaims[parameterId] = ownerId;
  }

  const nextSelection: ModeSelection = {};
  for (const [modeSetKey, modeId] of Object.entries(selection)) {
    const modeSet = sets.find((candidate) => candidate.key === modeSetKey);
    if (modeSet?.modes.some((mode) => mode.id === modeId))
      nextSelection[modeSetKey] = modeId;
    else
      corrections.push(
        `Cleared selection ${modeSetKey}: mode set or mode no longer exists`,
      );
  }

  return {
    modeSets: sets,
    selection: nextSelection,
    claims: nextClaims,
    corrections,
  };
}

/** Writes back only when something was corrected, so it is safe to run after every change. */
export const normalizeModeStateAtom = atom(null, (get, set) => {
  const normalized = normalizeModeState({
    modeSets: get(modeSetsAtom),
    selection: get(modeSelectionAtom),
    claims: get(adaptiveClaimsAtom),
  });
  if (normalized.corrections.length === 0) return normalized.corrections;
  set(modeSetsAtom, normalized.modeSets);
  set(modeSelectionAtom, normalized.selection);
  set(adaptiveClaimsAtom, normalized.claims);
  if (import.meta.env?.DEV)
    console.warn("Mode state corrected:", normalized.corrections);
  return normalized.corrections;
});
