// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type { ComponentsDocument } from "./model";
import { assertComponentDocument } from "./validation";
import {
  assertComponentReferences,
  componentTokenCatalog,
  componentTokenCatalogWithColorWitness,
  type ComponentToken,
  type ComponentTokenSource,
} from "./references";
import { canonicalJson } from "../design-data/canonicalJson";
import { PALETTE_SCALE_ID, tokenStableKey, tokenUuid } from "../tokens/model";

type WitnessSource = ComponentTokenSource & { components?: ComponentsDocument };
export interface ComponentContrastWitness {
  signature: string;
}
export const componentContrastWitnessAtom =
  atom<ComponentContrastWitness | null>(null);

export function componentContrastSignature(source: WitnessSource) {
  return canonicalJson({
    ...source,
    aliases: undefined,
    colorSystem: {
      ...source.colorSystem,
      contrasts: source.colorSystem.contrasts.map(
        ({ value, oppositeValue, ...identity }) => {
          void value;
          void oppositeValue;
          return identity;
        },
      ),
    },
  });
}

/** Establish only after checking the complete canonical catalog, including collisions. */
export function createComponentContrastWitness(
  source: WitnessSource,
): ComponentContrastWitness | null {
  const { components, taxonomy } = source;
  if (!components || !taxonomy) return null;
  const tokens = componentTokenCatalog(source);
  return contrastWitnessFromCatalog(source, tokens);
}

export function createComponentReferenceWitnesses(source: WitnessSource) {
  if (!source.components || !source.taxonomy)
    return { componentContrastWitness: null, componentColorWitness: null };
  const { tokens, componentColorWitness } =
    componentTokenCatalogWithColorWitness(source);
  return {
    componentContrastWitness: contrastWitnessFromCatalog(source, tokens),
    componentColorWitness,
  };
}

function contrastWitnessFromCatalog(
  source: WitnessSource,
  tokens: readonly ComponentToken[],
): ComponentContrastWitness | null {
  const { components, taxonomy } = source;
  if (!components || !taxonomy) return null;
  assertComponentDocument(components, taxonomy);
  assertComponentReferences(components, taxonomy, tokens, { sourceOnly: true });
  const fixedColors = new Set([
    ...source.colorSystem.palette.map((color) =>
      tokenUuid(
        `concept:${tokenUuid(tokenStableKey(PALETTE_SCALE_ID, color.id))}`,
      ),
    ),
    ...source.colorSystem.scales.flatMap(
      (scale) =>
        scale.customContrasts?.steps.map((step) =>
          tokenUuid(`concept:${tokenUuid(tokenStableKey(scale.id, step.id))}`),
        ) ?? [],
    ),
  ]);
  const dimensionOwners = new Map([
    ...(source.spacing?.scales.map((scale) => [scale.id, "spacing"] as const) ??
      []),
    ...(source.size?.scales.map((scale) => [scale.id, "size"] as const) ?? []),
    ...(source.radius?.scales.map((scale) => [scale.id, "radius"] as const) ??
      []),
    ...(source.elevation ? [[source.elevation.id, "shadow"] as const] : []),
  ]);
  const byId = new Map(tokens.map((token) => [token.id, token]));
  for (const component of components.components)
    for (const row of component.assignments) {
      if (row.$ref === undefined) continue;
      const token = byId.get(row.$ref);
      if (
        !token ||
        !(
          token.kind === "semantic" ||
          (token.property === "color" && fixedColors.has(token.ownerId)) ||
          dimensionOwners.get(token.ownerId) === token.property
        )
      )
        return null;
    }
  return { signature: componentContrastSignature(source) };
}

export function matchesComponentContrastWitness(
  witness: ComponentContrastWitness | null,
  source: WitnessSource,
) {
  const validContrast = (value: number) =>
    Number.isFinite(value) && value >= 1 && value <= 21;
  return (
    witness !== null &&
    source.colorSystem.contrasts.every(
      (contrast) =>
        validContrast(contrast.value) &&
        (contrast.oppositeValue === undefined ||
          validContrast(contrast.oppositeValue)),
    ) &&
    witness.signature === componentContrastSignature(source)
  );
}
