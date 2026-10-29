// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { designSystemDefaults } from "../../../data/defaults";
import {
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../../edit-session/state";
import {
  savedTshirtArtifactsAtom,
  shippedTshirtArtifactsAtom,
} from "../../design-data/tshirtState";
import { tshirtTokenImpactRecords } from "../../design-data/tshirtChanges";
import { EMPTY_STRUCTURES } from "../../structures/model";
import { structureFields } from "../../structures/changes";
import type { FoundationImpactSource, TokenImpactSource } from "../model";

export const semanticTokenSource: TokenImpactSource = {
  id: "structure-semantic-tokens",
  recordsAtom: atom((get) => {
    const saved = get(savedTshirtArtifactsAtom),
      shipped = get(shippedTshirtArtifactsAtom);
    return saved.status === "ready" && shipped.status === "ready"
      ? tshirtTokenImpactRecords(saved.bundle, shipped.bundle)
      : [];
  }),
};
export const structureFoundationSource: FoundationImpactSource = {
  id: "structure-authoring",
  recordsAtom: atom((get) => {
    const current =
      (get(editSessionSnapshotAtom) ?? createDefaultSnapshot()).structures ??
      EMPTY_STRUCTURES;
    const before = new Map(
      designSystemDefaults.system.structures.structures.flatMap((structure) =>
        [...structureFields(structure)].map(([key, value]) => [
          `${structure.conceptId}/${key}`,
          value,
        ]),
      ),
    );
    const after = new Map(
      current.structures.flatMap((structure) =>
        [...structureFields(structure)].map(([key, value]) => [
          `${structure.conceptId}/${key}`,
          value,
        ]),
      ),
    );
    return [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
      id: `structures/${id}`,
      category: "structures",
      edited: before.get(id) !== after.get(id),
    }));
  }),
};
