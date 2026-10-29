// Copyright 2026 Adobe. All rights reserved.
import type { FoundationTokenType } from "../foundations/types";

export const TOKEN_SET_SCHEMA_VERSION = 1;

/**
 * Lightweight subset of the Spectrum token format: a `name` object with
 * app-specific keys, a `value`, and a stable `uuid`.
 */
export interface TokenName {
  colorName: string;
  contrastValue: string;
}

export interface TokenOverride {
  name?: TokenName;
  value?: string;
  baseline: { name: TokenName; value: string };
  editedAt: string;
}

export type TokenOverrideMap = { [tokenId: string]: TokenOverride };

export function isTokenOverrideStale(
  override: TokenOverride,
  generated: GeneratedToken,
) {
  if (
    override.value !== undefined &&
    override.baseline.value !== generated.value
  )
    return true;
  return (
    override.name !== undefined &&
    !tokenNamesEqual(override.baseline.name, generated.name)
  );
}

export function resolveToken(
  generated: GeneratedToken,
  override: TokenOverride | undefined,
): ResolvedToken {
  return {
    ...generated,
    name: override?.name ?? generated.name,
    value: override?.value ?? generated.value,
    generated: { name: generated.name, value: generated.value },
    nameOverridden: override?.name !== undefined,
    valueOverridden: override?.value !== undefined,
    stale: override ? isTokenOverrideStale(override, generated) : false,
  };
}

export interface TokenSource {
  tokenType: FoundationTokenType;
  scaleId: string;
  contrastId: string;
}

export interface GeneratedToken {
  uuid: string;
  name: TokenName;
  value: string;
  source: TokenSource;
}

export interface ResolvedToken extends GeneratedToken {
  generated: { name: TokenName; value: string };
  nameOverridden: boolean;
  valueOverridden: boolean;
  /** The foundational data moved after the user edited this token. */
  stale: boolean;
}

export interface TokenSet {
  schemaVersion: number;
  id: string;
  name: string;
  tokens: ResolvedToken[];
}

export function tokenStableKey(scaleId: string, contrastId: string) {
  return `${scaleId}:${contrastId}`;
}

/** Palette tokens reuse the scale token shape: this id stands in for `scaleId` and the palette color id for `contrastId`. */
export const PALETTE_SCALE_ID = "palette";

export function isPaletteToken(token: {
  source: Pick<TokenSource, "scaleId">;
}) {
  return token.source.scaleId === PALETTE_SCALE_ID;
}

export function tokenDisplayName(name: TokenName) {
  return name.contrastValue
    ? `${name.colorName}-${name.contrastValue}`
    : name.colorName;
}

export function tokenNamesEqual(first: TokenName, second: TokenName) {
  return (
    first.colorName === second.colorName &&
    first.contrastValue === second.contrastValue
  );
}

function hash32(input: string, seed: number) {
  let value = seed;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619) >>> 0;
  }
  value ^= value >>> 16;
  value = Math.imul(value, 2246822507) >>> 0;
  value ^= value >>> 13;
  return value >>> 0;
}

function hex8(value: number) {
  return value.toString(16).padStart(8, "0");
}

const tokenIdentities = new Map<string, string>();
const identityEntryLimit = 8192;
const identityCharacterLimit = 1_048_576;
let identityCharacters = 0;

/**
 * Derives a stable UUID from a token's source ids so overrides survive
 * regeneration without persisting a separate identity registry.
 */
export function tokenUuid(stableKey: string) {
  const existing = tokenIdentities.get(stableKey);
  if (existing !== undefined) return existing;
  const identity = deriveTokenUuid(stableKey);
  const characters = stableKey.length + identity.length;
  if (characters > identityCharacterLimit) return identity;
  while (
    tokenIdentities.size >= identityEntryLimit ||
    identityCharacters + characters > identityCharacterLimit
  ) {
    const oldest = tokenIdentities.keys().next().value!;
    identityCharacters -= oldest.length + tokenIdentities.get(oldest)!.length;
    tokenIdentities.delete(oldest);
  }
  tokenIdentities.set(stableKey, identity);
  identityCharacters += characters;
  return identity;
}

function deriveTokenUuid(stableKey: string) {
  const bytes = [
    hex8(hash32(stableKey, 2166136261)),
    hex8(hash32(stableKey, 1099511628)),
    hex8(hash32(stableKey, 374761393)),
    hex8(hash32(stableKey, 668265263)),
  ].join("");
  const version = `8${bytes.slice(13, 16)}`;
  const variant = `${((parseInt(bytes[16], 16) & 0x3) | 0x8).toString(16)}${bytes.slice(17, 20)}`;
  return `${bytes.slice(0, 8)}-${bytes.slice(8, 12)}-${version}-${variant}-${bytes.slice(20, 32)}`;
}
