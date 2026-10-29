// Copyright 2026 Adobe. All rights reserved.
import { structureGeneration } from "../structures/model";
import { upgradeVariantVocabulary } from "../taxonomy/variantVocabulary";
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { upgradeStructuresSnapshot } from "./structuresUpgrade";

export function upgradeTshirtSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4,
): EditSessionSnapshot {
  const original =
    version === 4 ? input : upgradeStructuresSnapshot(input, version);
  if (!isSnapshot(original) || !original?.taxonomy || !original.structures)
    throw new Error("Older authoring data is invalid or incomplete.");
  const snapshot = structuredClone(original);
  snapshot.taxonomy = upgradeVariantVocabulary(snapshot.taxonomy!);
  snapshot.structures = {
    schemaVersion: 2,
    structures: snapshot.structures!.structures.map((structure) => ({
      ...structure,
      generation: structuredClone(structureGeneration(structure)),
    })),
  };
  return snapshot;
}
