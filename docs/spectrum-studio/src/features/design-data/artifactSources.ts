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
const dimensionWorkingSourceAtom = selectAtom(
  authoringSourceSnapshotAtom,
  dimensionSource,
  sameReferences,
);
const dimensionSavedSourceAtom = selectAtom(
  editSessionSnapshotAtom,
  (source) => (source ? dimensionSource(source) : null),
  sameReferences,
);
export const dimensionArtifactRequestAtom = atom((get) => {
  const working = get(dimensionWorkingSourceAtom);
  return { working, saved: get(dimensionSavedSourceAtom) ?? working };
});
export const tshirtArtifactSourceAtom = selectAtom(
  authoringSourceSnapshotAtom,
  (source): TshirtAuthoringSource => ({
    ...dimensionSource(source),
    structures: source.structures,
    elevation: source.elevation,
    opacity: source.opacity,
  }),
  sameReferences,
);
