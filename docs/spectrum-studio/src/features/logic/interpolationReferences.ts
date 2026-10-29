// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { typographyDocumentAtom } from "../typography/state";
import {
  interpolationsAtom,
  removeInterpolationAtom,
  restoreInterpolationAtom,
  scaleTypesAtom,
  type RemovedLibraryItem,
} from "./scaleTypeLibrary";
import type { Interpolation } from "../scales/interpolationDefinition";
import { interpolationConsumers } from "./interpolationConsumers";
import { taxonomyDocumentAtom } from "../taxonomy/state";
export {
  interpolationConsumers,
  type InterpolationConsumer,
} from "./interpolationConsumers";
export const interpolationConsumersAtom = atom((get) =>
  interpolationConsumers(
    get(typographyDocumentAtom),
    get(scaleTypesAtom),
    get(taxonomyDocumentAtom),
  ),
);
export type RemovedInterpolation = RemovedLibraryItem<Interpolation>;
export const removeInterpolationWithFallbackAtom = removeInterpolationAtom;
export const restoreInterpolationWithConsumersAtom = atom(
  null,
  (_get, set, removed: RemovedInterpolation) =>
    set(restoreInterpolationAtom, removed),
);
export const normalizeInterpolationReferencesAtom = atom(null, (get) => {
  const known = new Set(get(interpolationsAtom).map((item) => item.id));
  if (
    get(interpolationConsumersAtom).some(
      (consumer) => !known.has(consumer.interpolationId),
    )
  )
    throw new Error("A Typography interpolation is unavailable.");
  return false;
});
