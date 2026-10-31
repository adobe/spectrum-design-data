// Copyright 2026 Adobe. All rights reserved.
import type { CanonicalAliasRow } from "./aliasTargets";

export function tokenOutputMetadata(
  row: CanonicalAliasRow,
  rows: readonly CanonicalAliasRow[],
) {
  const lifecycle = row.token.lifecycle;
  const replacements = (lifecycle?.replacementIds ?? []).map((id) => {
    const selection = new Map(JSON.parse(row.context) as [string, string][]);
    const target = rows.find(
      (target) =>
        target.token.id === id &&
        (JSON.parse(target.context) as [string, string][]).every(
          ([axis, mode]) => selection.get(axis) === mode,
        ),
    );
    if (!target)
      throw new Error(
        `Replacement for ${row.name} is unavailable in this mode.`,
      );
    return target.rowId;
  });
  return {
    ...(row.token.description && { description: row.token.description }),
    ...(lifecycle &&
      (lifecycle.introduced || lifecycle.deprecatedIn) && {
        lifecycle: {
          ...(lifecycle.introduced && { introduced: lifecycle.introduced }),
          ...(lifecycle.deprecatedIn && {
            deprecatedIn: lifecycle.deprecatedIn,
            ...(lifecycle.deprecatedComment && {
              deprecatedComment: lifecycle.deprecatedComment,
            }),
            ...(replacements.length && {
              replacedBy:
                replacements.length === 1 ? replacements[0] : replacements,
            }),
          }),
        },
      }),
  };
}

export function tokenOutputDiagnostics(rows: readonly CanonicalAliasRow[]) {
  return [
    ...new Map(
      rows
        .filter(
          (row) =>
            row.token.status === "deprecated" &&
            !row.token.lifecycle?.deprecatedIn,
        )
        .map((row) => [
          row.token.id,
          {
            tokenId: row.token.id,
            message: `${row.name}: deprecation is pending a release version. Lifecycle and replacements remain in authoring data and cannot yet be emitted as released lifecycle metadata.`,
          },
        ]),
    ).values(),
  ];
}
