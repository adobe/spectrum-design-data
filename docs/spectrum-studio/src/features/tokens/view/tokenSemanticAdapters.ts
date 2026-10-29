// Copyright 2026 Adobe. All rights reserved.
import type { TokenTableData } from "./tokenTableModel";

// Future semantic token storage, validation and design-data taxonomy enter here.
export function buildSemanticTokenTable(categoryLabel: string): TokenTableData {
  return {
    groups: [],
    emptyMessage: `Semantic ${categoryLabel.toLowerCase()} tokens are not available yet.`,
  };
}
