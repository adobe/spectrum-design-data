// Copyright 2026 Adobe. All rights reserved.
import { persistedAtom } from "../../state/persist";
import type { TokenName, TokenOverride, TokenOverrideMap } from "./model";
export type { TokenOverride, TokenOverrideMap } from "./model";

const TOKEN_OVERRIDES_SCHEMA_VERSION = 1;

function isTokenName(value: unknown): value is TokenName {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as TokenName).colorName === "string" &&
    typeof (value as TokenName).contrastValue === "string"
  );
}

export function isTokenOverrideMap(value: unknown): value is TokenOverrideMap {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  return Object.values(value as Record<string, unknown>).every((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const override = entry as Partial<TokenOverride>;
    if (override.name !== undefined && !isTokenName(override.name))
      return false;
    if (override.value !== undefined && typeof override.value !== "string")
      return false;
    if (typeof override.editedAt !== "string") return false;
    return (
      isTokenName(override.baseline?.name) &&
      typeof override.baseline?.value === "string"
    );
  });
}

export const tokenOverridesAtom = persistedAtom<TokenOverrideMap>({
  key: "tokens/color/overrides",
  schemaVersion: TOKEN_OVERRIDES_SCHEMA_VERSION,
  initialize: () => ({}),
  validate: isTokenOverrideMap,
});
