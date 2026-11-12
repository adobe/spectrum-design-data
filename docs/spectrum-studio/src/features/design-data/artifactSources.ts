// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import {
  authoringSourceSnapshotAtom,
  editSessionSnapshotAtom,
} from "../edit-session/state";
import type { DimensionAuthoringSource } from "./dimensionArtifacts";
import type { TshirtAuthoringSource } from "./tshirtArtifacts";

function sameReferences(left: object | null, right: object | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  const before = Object.entries(left),
    after = Object.entries(right);
  return (
    before.length === after.length &&
    before.every(
      ([key, value], index) =>
        key === after[index][0] && value === after[index][1],
    )
  );
}
function dimensionSource(
  source: DimensionAuthoringSource,
): DimensionAuthoringSource {
  const {
    colorSystem,
    typography,
    spacing,
    size,
    radius,
    taxonomy,
    scaleTypes,
    rules,
    modeSets,
    browserTokenEdits,
  } = source;
  return {
    colorSystem,
    typography,
    spacing,
    size,
    radius,
    taxonomy,
    scaleTypes,
    rules,
    modeSets,
    browserTokenEdits,
  };
}
const workingSourceAtom = atom((get) => get(authoringSourceSnapshotAtom));
const savedSourceAtom = atom((get) => get(editSessionSnapshotAtom));
const dimensionWorkingSourceAtom = selectAtom(
  workingSourceAtom,
  dimensionSource,
  sameReferences,
);
const dimensionSavedSourceAtom = selectAtom(
  savedSourceAtom,
  (source) => (source ? dimensionSource(source) : null),
  sameReferences,
);
export const dimensionArtifactRequestAtom = atom((get) => {
  const working = get(dimensionWorkingSourceAtom);
  return { working, saved: get(dimensionSavedSourceAtom) ?? working };
});
function tshirtSource(source: TshirtAuthoringSource): TshirtAuthoringSource {
  return {
    ...dimensionSource(source),
    structures: source.structures,
    elevation: source.elevation,
    opacity: source.opacity,
    interpolations: source.interpolations,
    tokenOverrides: source.tokenOverrides,
  };
}
export const tshirtArtifactSourceAtom = selectAtom(
  workingSourceAtom,
  tshirtSource,
  sameReferences,
);
export const savedTshirtArtifactSourceAtom = selectAtom(
  savedSourceAtom,
  (source) => (source ? tshirtSource(source) : null),
  sameReferences,
);
