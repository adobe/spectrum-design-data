// Copyright 2026 Adobe. All rights reserved.
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { createStructure } from "../../src/features/structures/model";

export function createStructureSnapshot() {
  const snapshot = createDefaultSnapshot();
  snapshot.structures!.structures.unshift(
    createStructure(
      "Example structure",
      "c0000000-0000-4000-8000-000000000001",
    ),
  );
  return snapshot;
}
