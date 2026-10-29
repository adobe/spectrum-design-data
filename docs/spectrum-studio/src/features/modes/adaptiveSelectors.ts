// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { adaptiveClaimsAtom } from "./adaptive";
import { FOUNDATION_PARAMETERS, parameterOwners } from "./parameters";
import { modeSetsAtom } from "./state";

/** Claims pointing at a deleted mode set would otherwise keep a parameter locked forever. */
const liveClaimsAtom = atom((get) => {
  const claims = get(adaptiveClaimsAtom);
  const existing = new Set(get(modeSetsAtom).map((modeSet) => modeSet.id));
  return Object.fromEntries(
    Object.entries(claims).filter(([, owner]) => existing.has(owner)),
  );
});

export const effectiveParameterOwnersAtom = atom((get) => ({
  ...get(liveClaimsAtom),
  ...parameterOwners(get(modeSetsAtom)),
}));

export const adaptiveParametersAtom = atom((get) => {
  const claims = get(liveClaimsAtom);
  return FOUNDATION_PARAMETERS.filter(
    (parameter) => claims[parameter.id] !== undefined,
  );
});
