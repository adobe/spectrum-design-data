// Copyright 2026 Adobe. All rights reserved.
import { upgradeStructureCompositionSnapshot } from "./structureCompositionUpgrade";
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { EMPTY_COMPONENTS } from "../components/model";

export function upgradeComponentsSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11,
): EditSessionSnapshot {
  const previous =
    version === 11
      ? input
      : upgradeStructureCompositionSnapshot(input, version);
  if (!isSnapshot(previous) || !previous)
    throw new Error("Older component authoring data could not be restored.");
  return {
    ...structuredClone(previous),
    components: structuredClone(previous.components ?? EMPTY_COMPONENTS),
  };
}
