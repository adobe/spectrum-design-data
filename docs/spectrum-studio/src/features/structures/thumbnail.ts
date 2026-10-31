// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { authoringSnapshotAtom } from "../edit-session/state";
import {
  canonicalAliasRows,
  completeAliasSource,
  type CanonicalAliasRow,
} from "../tokens/aliasTargets";
import { primitiveReferencesAtom } from "../tokens/primitiveReferenceState";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import type { ModeSet } from "../modes/model";

export function defaultStructureReferences(
  references: readonly PrimitiveReference[],
  rows: readonly CanonicalAliasRow[],
  modeSets: readonly ModeSet[],
) {
  const selection = Object.fromEntries(
    modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  );
  const defaults = new Map(
    rows
      .filter((row) =>
        (JSON.parse(row.context) as [string, string][]).every(
          ([axis, mode]) => selection[axis] === mode,
        ),
      )
      .map((row) => [row.id, row.token]),
  );
  return {
    selection,
    references: references.map((reference) => {
      const token = defaults.get(reference.id);
      return token
        ? {
            ...reference,
            value: token.value,
            shadows: token.shadows,
            error: token.validationError,
            valueOverridden: token.valueOverridden,
          }
        : reference;
    }),
  };
}

export const structureThumbnailPreviewAtom = atom((get) => {
  try {
    const source = get(authoringSnapshotAtom);
    const rows = canonicalAliasRows(
      completeAliasSource(source),
      undefined,
      "strict",
      { excludeColors: true, includeUnpublished: true },
    );
    return {
      status: "ready" as const,
      ...defaultStructureReferences(
        get(primitiveReferencesAtom),
        rows,
        source.modeSets,
      ),
    };
  } catch (error) {
    return {
      status: "error" as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});
