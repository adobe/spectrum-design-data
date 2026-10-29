// Copyright 2026 Adobe. All rights reserved.
import { createElement, type ReactNode } from "react";
import { getCategoryIcon } from "../../../components/CategoryIcon";
import type { ResolvedToken } from "../model";
import {
  buildColorPrimitiveTable,
  temporaryTokenPrimitiveAdapter,
} from "./tokenPrimitiveAdapters";
import { buildSemanticTokenTable } from "./tokenSemanticAdapters";
import {
  tokenTableColumns,
  type TokenTableColumn,
  type TokenTableData,
} from "./tokenTableModel";

// These ids match the existing Tokens SubPanel tabs, not future design-data terms.
export type TokenPanelId =
  | "colors"
  | "typography"
  | "spacing"
  | "size"
  | "radius"
  | "elevation"
  | "opacity"
  | "motion";
export type TokenPanelViewMode = "semantic" | "primitive";

export interface TokenPanelDefinition {
  id: TokenPanelId;
  label: string;
  icon: ReactNode;
  columns: TokenTableColumn[];
  canEditPrimitive: boolean;
  canEditSemantic: boolean;
  primitiveAdapter: (tokens: ResolvedToken[]) => TokenTableData;
  semanticAdapter: () => TokenTableData;
}

function placeholderDefinition(
  id: TokenPanelId,
  label: string,
  icon: ReactNode,
): TokenPanelDefinition {
  return {
    id,
    label,
    icon,
    columns: tokenTableColumns,
    canEditPrimitive: false,
    canEditSemantic: false,
    primitiveAdapter: () => temporaryTokenPrimitiveAdapter(label),
    semanticAdapter: () => buildSemanticTokenTable(label),
  };
}

export const tokenPanelRegistry: Record<TokenPanelId, TokenPanelDefinition> = {
  opacity: {
    id: "opacity",
    label: "Opacity",
    icon: createElement(getCategoryIcon("opacity")),
    columns: tokenTableColumns,
    canEditPrimitive: true,
    canEditSemantic: false,
    primitiveAdapter: () => ({ groups: [] }),
    semanticAdapter: () => buildSemanticTokenTable("Opacity"),
  },
  colors: {
    id: "colors",
    label: "Colors",
    icon: createElement(getCategoryIcon("color")),
    columns: tokenTableColumns,
    canEditPrimitive: true,
    canEditSemantic: false,
    primitiveAdapter: buildColorPrimitiveTable,
    semanticAdapter: () => buildSemanticTokenTable("Colors"),
  },
  typography: placeholderDefinition(
    "typography",
    "Typography",
    createElement(getCategoryIcon("typography")),
  ),
  spacing: placeholderDefinition(
    "spacing",
    "Spacing",
    createElement(getCategoryIcon("spacing")),
  ),
  size: placeholderDefinition(
    "size",
    "Size",
    createElement(getCategoryIcon("size")),
  ),
  radius: placeholderDefinition(
    "radius",
    "Corner radius",
    createElement(getCategoryIcon("radius")),
  ),
  elevation: placeholderDefinition(
    "elevation",
    "Elevation",
    createElement(getCategoryIcon("elevation")),
  ),
  motion: placeholderDefinition(
    "motion",
    "Motion",
    createElement(getCategoryIcon("motion")),
  ),
};

export function getTokenPanelDefinition(
  id: TokenPanelId,
): TokenPanelDefinition {
  return tokenPanelRegistry[id];
}
