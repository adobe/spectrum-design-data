// Copyright 2026 Adobe. All rights reserved.
import { upgradeDataVisSnapshot } from "./dataVisUpgrade";
import { isSnapshot, type EditSessionSnapshot } from "./state";

export function upgradeElementSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
): EditSessionSnapshot {
  const previous =
    version === 9 ? input : upgradeDataVisSnapshot(input, version);
  if (!isSnapshot(previous) || !previous)
    throw new Error("Older template data could not be restored.");
  return {
    ...previous,
    structures: previous.structures
      ? {
          ...previous.structures,
          schemaVersion: 3,
          structures: previous.structures.structures.map((structure) => ({
            ...structure,
            elements: structure.elements ?? [],
          })),
        }
      : previous.structures,
  };
}
