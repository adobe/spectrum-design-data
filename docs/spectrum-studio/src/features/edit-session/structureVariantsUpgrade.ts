// Copyright 2026 Adobe. All rights reserved.
import { upgradeStructuresDocument } from "../structures/model";
import type { EditSessionSnapshot } from "./state";
import { synchronizeVariantIdentities } from "../structures/semanticIdentity";

export function upgradeStructureVariantsSnapshot(
  snapshot: EditSessionSnapshot,
): EditSessionSnapshot {
  return {
    ...snapshot,
    ...(snapshot.structures && {
      structures: synchronizeVariantIdentities(
        upgradeStructuresDocument(snapshot.structures),
        snapshot.modeSets,
      ),
    }),
  };
}
