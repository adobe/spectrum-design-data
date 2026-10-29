// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { modeSetDefaultMode } from "../modes/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import type { CascadeExportInput } from "../tokens/cascadeExport";
import { isJsonValue } from "./model";
import type { ComponentToken, ComponentTokenSource } from "./references";
import {
  preparedScaleColorsFitBudget,
  type PreparedScaleColors,
} from "./scaleColorWitness";

type ColorToken = ComponentToken & {
  value: string | number;
  outputError?: undefined;
};
export interface ComponentColorWitness {
  readonly signature: string;
  readonly tokens: readonly ColorToken[];
  readonly scaleColors?: readonly PreparedScaleColors[];
}
export const componentColorWitnessAtom = atom<ComponentColorWitness | null>(
  null,
);
const MAX_WITNESS_BYTES = 5_000_000;

export function componentColorInput(
  source: ComponentTokenSource,
): CascadeExportInput {
  return {
    base: source.colorSystem,
    modeSets: source.modeSets,
    activeModes: source.modeSets
      .map(modeSetDefaultMode)
      .filter((mode) => mode !== undefined),
    activeTokens: [],
    overrides: source.tokenOverrides,
    browserEdits: source.browserTokenEdits ?? {},
    taxonomy: source.taxonomy,
    rules: source.rules ?? RULE_DEFAULTS,
  };
}

function signature(source: ComponentTokenSource): string | null {
  const input = componentColorInput(source);
  return isJsonValue(input) ? JSON.stringify(input) : null;
}

/** Capture only the complete canonical color partition, after catalog validation. */
export function createComponentColorWitness(
  source: ComponentTokenSource,
  tokens: readonly ComponentToken[],
  scaleColors?: readonly PreparedScaleColors[],
): ComponentColorWitness | null {
  const key = signature(source);
  if (
    key === null ||
    !tokens.every(
      (token): token is ColorToken =>
        token.outputError === undefined &&
        (typeof token.value === "string" || typeof token.value === "number"),
    )
  )
    return null;
  if (scaleColors && !preparedScaleColorsFitBudget(scaleColors)) return null;
  const encoded = new TextEncoder();
  if (
    encoded.encode(key).byteLength +
      encoded.encode(JSON.stringify({ tokens, scaleColors })).byteLength >
    MAX_WITNESS_BYTES
  )
    return null;
  return {
    signature: key,
    tokens: structuredClone(tokens),
    ...(scaleColors && { scaleColors: structuredClone(scaleColors) }),
  };
}

export function matchesComponentColorWitness(
  witness: ComponentColorWitness | null,
  source: ComponentTokenSource,
): boolean {
  return witness !== null && witness.signature === signature(source);
}

export function witnessedComponentColors(
  witness: ComponentColorWitness | null,
  source: ComponentTokenSource,
): readonly ComponentToken[] | undefined {
  return witness !== null && matchesComponentColorWitness(witness, source)
    ? structuredClone(witness.tokens)
    : undefined;
}
