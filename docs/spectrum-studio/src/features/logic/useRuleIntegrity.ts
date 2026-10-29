// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { spacingDocumentAtom } from "../spacing/state";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import { typographyDocumentAtom } from "../typography/state";
import { normalizeRuleStateAtom } from "./integrity";
import { rulesAtom } from "./library";
import {
  interpolationsAtom,
  normalizeLogicLibraryAtom,
  scaleTypesAtom,
} from "./scaleTypeLibrary";
import {
  normalizeLockedBindingsAtom,
  normalizeScaleTypeReferencesAtom,
} from "./scaleTypeReferences";
import { normalizeInterpolationReferencesAtom } from "./interpolationReferences";

/** Re-checks rule references after loads, edits, deletions, and reverts from any surface. */
export function useRuleIntegrity() {
  const rules = useAtomValue(rulesAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const typography = useAtomValue(typographyDocumentAtom);
  const spacing = useAtomValue(spacingDocumentAtom);
  const size = useAtomValue(sizeDocumentAtom);
  const radius = useAtomValue(radiusDocumentAtom);
  const normalize = useSetAtom(normalizeRuleStateAtom);
  const normalizeLibrary = useSetAtom(normalizeLogicLibraryAtom);
  const normalizeReferences = useSetAtom(normalizeScaleTypeReferencesAtom);
  const normalizeLockedBindings = useSetAtom(normalizeLockedBindingsAtom);
  const normalizeInterpolations = useSetAtom(
    normalizeInterpolationReferencesAtom,
  );
  useEffect(() => {
    normalize();
  }, [rules, typography, spacing, size, radius, normalize]);
  useEffect(() => {
    normalizeLibrary();
    normalizeReferences();
    normalizeLockedBindings();
  }, [
    scaleTypes,
    interpolations,
    typography,
    spacing,
    size,
    radius,
    normalizeLibrary,
    normalizeReferences,
    normalizeLockedBindings,
  ]);
  useEffect(() => {
    normalizeInterpolations();
  }, [interpolations, typography, normalizeInterpolations]);
}
