// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type { DimensionArtifactState } from "./dimensionArtifactRepository";
import { dimensionArtifactRequestAtom } from "./artifactSources";

export const dimensionArtifactPublicationAtom = atom<DimensionArtifactState>({
  status: "pending",
  isSaved: false,
  issues: [],
});
export const dimensionArtifactStateAtom = atom(
  (get): DimensionArtifactState => {
    const state = get(dimensionArtifactPublicationAtom),
      input = get(dimensionArtifactRequestAtom);
    return state.input?.working === input.working &&
      state.input.saved === input.saved
      ? state
      : { status: "pending", bundle: state.bundle, isSaved: false, issues: [] };
  },
);
