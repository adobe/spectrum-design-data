// Copyright 2026 Adobe. All rights reserved.
import type { Getter } from "jotai";
import { authoringSourceSnapshotAtom } from "../edit-session/state";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import {
  reconcileTokenIdentityRows,
  tokenEdit,
} from "../tokens/canonicalIdentity";
import type { TaxonomyDocument } from "../taxonomy/model";
import type { RelatedAuthoringUpdates } from "../taxonomy/contributions";
import type { DimensionDocument } from "./foundation";
import {
  captureDimensionSource,
  dimensionPublicationContexts,
} from "../design-data/dimensionArtifacts";

export function dimensionPublicationUpdates(
  scope: "spacing" | "size" | "radius",
  get: Getter,
  previous: DimensionDocument,
  next: DimensionDocument,
  taxonomy: TaxonomyDocument,
): RelatedAuthoringUpdates | undefined {
  const prior = new Map(
    previous.scales.map((scale) => [scale.id, scale.bindings]),
  );
  if (
    next.scales.every(
      (scale) =>
        JSON.stringify(scale.bindings ?? {}) ===
        JSON.stringify(prior.get(scale.id) ?? {}),
    )
  )
    return;
  const source = {
    ...get(authoringSourceSnapshotAtom),
    [scope]: next,
    taxonomy,
  };
  const edits = get(browserTokenEditsAtom);
  const contexts = new Map(
    [...dimensionPublicationContexts(captureDimensionSource(source))].filter(
      ([id]) =>
        id.startsWith(`${scope}-`) &&
        Object.keys(tokenEdit(edits, id)?.values ?? {}).length > 0,
    ),
  );
  for (const row of canonicalAliasRows(
    completeAliasSource(source),
    undefined,
    "preserve-for-review",
    { excludeColors: true, includeUnpublished: true },
  )) {
    if (row.token.type !== scope) continue;
    const id = row.token.sourceId ?? row.token.id;
    const required = contexts.get(id) ?? new Set<string>();
    required.add(row.context);
    contexts.set(id, required);
  }
  const reconciled = reconcileTokenIdentityRows(
    edits,
    source.modeSets,
    source.modeSets,
    contexts,
  );
  if (reconciled === edits) return;
  return {
    updates: new Map([["tokens/browser/edits", reconciled]]),
    write: (set) => set(browserTokenEditsAtom, reconciled),
  };
}
