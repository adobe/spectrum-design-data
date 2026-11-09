// Copyright 2026 Adobe. All rights reserved.
import layout from "../../../../../packages/design-data/tokens/layout.tokens.json" with { type: "json" };
import typography from "../../../../../packages/design-data/tokens/typography.tokens.json" with { type: "json" };
import colors from "../../../../../packages/design-data/tokens/color-palette.tokens.json" with { type: "json" };

export interface CanonicalTokenDefinition {
  uuid: string;
  conceptId: string;
  name: Record<string, string | number>;
}

export const canonicalTokenDefinitions: CanonicalTokenDefinition[] = [
  ...layout,
  ...typography,
  ...colors,
].flatMap((token) => {
  if ("lifecycle" in token && token.lifecycle?.deprecatedIn) return [];
  if (!("conceptId" in token) || typeof token.conceptId !== "string") return [];
  return [{ uuid: token.uuid, conceptId: token.conceptId, name: token.name }];
});

export const canonicalTokenByUuid = new Map(
  canonicalTokenDefinitions.map((token) => [token.uuid, token]),
);
