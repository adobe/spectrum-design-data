// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type { ModeTokenRows } from "../../changelog/changes";
import { savedModeTokenRowsAtom } from "../../changelog/state";
import type { CascadeTokenRow } from "../../tokens/cascadeExport";
import type { TokenImpactRecord, TokenImpactSource } from "../model";

function nameOf(row: CascadeTokenRow) {
  const ordinal = row.name.contrastValue ?? row.name.number;
  return ordinal !== undefined
    ? `${row.name.colorName}/${ordinal}`
    : row.name.colorName;
}

/** Primitive color tokens across every declared mode; removed tokens are outside the denominator. */
export function colorPrimitiveTokenRecords(
  rows: ModeTokenRows,
): TokenImpactRecord[] {
  const baseline = new Map(rows.baseline.map((row) => [row.uuid, row]));
  const concepts = new Map<string, CascadeTokenRow[]>();
  for (const row of rows.current)
    concepts.set(row.conceptId, [...(concepts.get(row.conceptId) ?? []), row]);

  return [...concepts].map(([conceptId, conceptRows]) => ({
    tokenId: conceptId,
    tier: "primitive",
    category: "color",
    modeValues: conceptRows.map((row) => ({
      valueId: row.uuid,
      changed: baseline.get(row.uuid)?.value !== row.value,
    })),
    nameChanged: conceptRows.some((row) => {
      const before = baseline.get(row.uuid);
      return !before || nameOf(before) !== nameOf(row);
    }),
    manuallyOverridden: conceptRows.some(
      (row) => rows.overrides[row.uuid] !== undefined,
    ),
  }));
}

export const colorPrimitiveTokenSource: TokenImpactSource = {
  id: "color-primitive-tokens",
  recordsAtom: atom((get) =>
    colorPrimitiveTokenRecords(get(savedModeTokenRowsAtom)),
  ),
};
