// Copyright 2026 Adobe. All rights reserved.
// UI-only table model. Source tokens remain in ../model.ts.
export type TokenTableColumnId = "name" | "value";

export interface TokenTableColumn {
  id: TokenTableColumnId;
  label: string;
  isRowHeader?: boolean;
}

export interface TokenEditDescriptor {
  kind: "color-name" | "color-value";
  tokenId: string;
}

export interface TokenStatusDescriptor {
  isStale: boolean;
  message: string;
}

export interface TokenTableCell {
  text: string;
  swatch?: string;
  status?: TokenStatusDescriptor;
  edit?: TokenEditDescriptor;
}

export interface TokenTableRow {
  id: string;
  cells: Record<TokenTableColumnId, TokenTableCell>;
}

export interface TokenTableGroup {
  id: string;
  label: string;
  rows: TokenTableRow[];
}

export interface TokenTableData {
  groups: TokenTableGroup[];
  emptyMessage?: string;
}

export const tokenTableColumns: TokenTableColumn[] = [
  { id: "name", label: "Name", isRowHeader: true },
  { id: "value", label: "Value" },
];

/** Filter the view model, preserving source rows and edit descriptors unchanged. */
export function filterTokenTableData(
  data: TokenTableData,
  query: string,
): TokenTableData {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0 || data.groups.length === 0) return data;

  const groups = data.groups.flatMap((group) => {
    const rows = group.rows.filter((row) => {
      const text =
        `${group.label} ${row.cells.name.text} ${row.cells.value.text}`.toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });
    return rows.length > 0 ? [{ ...group, rows }] : [];
  });

  return {
    groups,
    ...(groups.length === 0 && {
      emptyMessage: `No tokens match "${query.trim()}".`,
    }),
  };
}
