// Copyright 2026 Adobe. All rights reserved.
import { upgradeElementSnapshot } from "./elementUpgrade";
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { upgradeStructuresDocument } from "../structures/model";
import {
  STRUCTURE_CATEGORY_IDS,
  STRUCTURE_TERM_IDS,
} from "../structures/vocabulary";
import { registerTerm } from "../taxonomy/model";

export function upgradeStructureCompositionSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
): EditSessionSnapshot {
  const previous =
    version === 10 ? input : upgradeElementSnapshot(input, version);
  if (!isSnapshot(previous) || !previous?.taxonomy || !previous.structures)
    throw new Error("Older Structure composition data could not be restored.");
  const snapshot = structuredClone(previous);
  const taxonomy = snapshot.taxonomy!;
  const existing = taxonomy.terms.find(
    (term) => term.id === STRUCTURE_TERM_IDS.direction,
  );
  if (existing && existing.categoryId !== STRUCTURE_CATEGORY_IDS.property)
    throw new Error("Direction has incompatible Registry ownership.");
  snapshot.taxonomy = existing
    ? taxonomy
    : registerTerm(
        taxonomy,
        STRUCTURE_CATEGORY_IDS.property,
        "direction",
        STRUCTURE_TERM_IDS.direction,
      );
  snapshot.structures = upgradeStructuresDocument(snapshot.structures);
  return snapshot;
}
