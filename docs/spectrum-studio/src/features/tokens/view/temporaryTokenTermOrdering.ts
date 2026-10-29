// Copyright 2026 Adobe. All rights reserved.
/**
 * Temporary primitive token ordering until the project has a dedicated design-data
 * taxonomy/registry-driven grouping model.
 *
 * Purpose:
 * - keep the token table UI stable while the dynamic SubPanel scaffolding is being
 *   introduced for primitive and semantic views
 * - provide a single entry point for future taxonomy-aware ordering and grouping
 * - signal clearly to agents that this is an interim compatibility layer, not a
 *   final source of truth
 */
import type { ResolvedToken } from "../model";
import { PALETTE_SCALE_ID } from "../model";

export interface TemporaryTokenGroup<T> {
  id: string;
  label: string;
  tokens: T[];
}

export function temporaryTokenTermOrdering<
  T extends { source: { scaleId: string }; name?: { colorName?: string } },
>(tokens: T[]): TemporaryTokenGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const token of tokens) {
    const groupId = token.source.scaleId;
    const existing = groups.get(groupId) ?? [];
    existing.push(token);
    groups.set(groupId, existing);
  }

  return [...groups.entries()].map(([id, groupTokens]) => ({
    id,
    label:
      id === PALETTE_SCALE_ID
        ? "Palette"
        : (groupTokens[0]?.name?.colorName ?? id),
    tokens: groupTokens,
  }));
}

export function temporaryTokenGroupForPrimitiveColorTokens(
  tokens: ResolvedToken[],
): TemporaryTokenGroup<ResolvedToken>[] {
  return temporaryTokenTermOrdering(tokens);
}
