// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "./state";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import {
  canonicalAliasSourceTargets,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { pruneAliasTargets } from "../tokens/aliases";

export function prepareAuthoringSnapshot(
  snapshot: EditSessionSnapshot,
): EditSessionSnapshot {
  if (!snapshot.aliases?.tokens.length) return snapshot;
  const semantics = snapshot.structures?.structures.length
    ? buildTshirtArtifacts(snapshot)
    : undefined;
  return {
    ...snapshot,
    aliases: pruneAliasTargets(
      snapshot.aliases,
      canonicalAliasSourceTargets(completeAliasSource(snapshot), semantics),
    ),
  };
}
