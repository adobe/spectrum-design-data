// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { designSystemDefaults } from "../../data/defaults";
import type { AdaptiveClaims } from "./model";
export type { AdaptiveClaims } from "./model";

export const ADAPTIVE_CLAIMS_SCHEMA_VERSION = 2;
export const ADAPTIVE_CLAIM_DEFAULTS: Readonly<AdaptiveClaims> = {
  ...designSystemDefaults.system.adaptiveClaims,
};

export function isAdaptiveClaims(data: unknown): data is AdaptiveClaims {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  return Object.values(data as Record<string, unknown>).every(
    (owner) => typeof owner === "string",
  );
}

/** v2 ships text zoom as an adaptive control alongside the text scaling mode set. */
export function migrateAdaptiveClaims(
  data: unknown,
  fromVersion: number,
): AdaptiveClaims | null {
  if (fromVersion !== 1 || !isAdaptiveClaims(data)) return null;
  return { ...ADAPTIVE_CLAIM_DEFAULTS, ...data };
}

export const adaptiveClaimsAtom = persistedAtom<AdaptiveClaims>({
  key: "modes/adaptive-claims",
  schemaVersion: ADAPTIVE_CLAIMS_SCHEMA_VERSION,
  initialize: () => ({ ...ADAPTIVE_CLAIM_DEFAULTS }),
  validate: isAdaptiveClaims,
  migrate: migrateAdaptiveClaims,
});

/** A declared owner takes precedence; claims only control adaptive exposure. */
export function effectiveParameterOwner(
  claims: AdaptiveClaims,
  owners: Record<string, string>,
  parameterId: string,
) {
  return owners[parameterId] ?? claims[parameterId];
}

export function claimsForModeSet(
  claims: AdaptiveClaims,
  modeSetId: string,
): AdaptiveClaims {
  return Object.fromEntries(
    Object.entries(claims).filter(([, owner]) => owner === modeSetId),
  );
}

function withoutModeSet(
  claims: AdaptiveClaims,
  modeSetId: string,
): AdaptiveClaims {
  return Object.fromEntries(
    Object.entries(claims).filter(([, owner]) => owner !== modeSetId),
  );
}

export const releaseModeSetClaimsAtom = atom(
  null,
  (get, set, modeSetId: string) => {
    const claims = get(adaptiveClaimsAtom);
    const next = withoutModeSet(claims, modeSetId);
    if (Object.keys(next).length !== Object.keys(claims).length)
      set(adaptiveClaimsAtom, next);
  },
);

export const restoreModeSetClaimsAtom = atom(
  null,
  (get, set, claims: AdaptiveClaims) => {
    if (Object.keys(claims).length > 0)
      set(adaptiveClaimsAtom, { ...get(adaptiveClaimsAtom), ...claims });
  },
);

/** Replaces one set's claims wholesale so the editor can commit staged edits on save. */
export const commitModeSetClaimsAtom = atom(
  null,
  (get, set, input: { modeSetId: string; parameterIds: readonly string[] }) => {
    const next = withoutModeSet(get(adaptiveClaimsAtom), input.modeSetId);
    for (const parameterId of input.parameterIds)
      next[parameterId] = input.modeSetId;
    set(adaptiveClaimsAtom, next);
  },
);
