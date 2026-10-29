// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import { isFoundationPublished } from "../../foundations/types";
import {
  PALETTE_SCALE_ID,
  tokenStableKey,
  tokenUuid,
  type ResolvedToken,
} from "../../tokens/model";
import type { BrowserToken } from "../../tokens/browserModel";
import { dataVisMemberId } from "./identity";
import { concreteColor } from "./colors";

export type PrimitiveColorOrigin =
  | { kind: "palette"; paletteColorId: string }
  | { kind: "ui-swatch"; scaleId: string; contrastId: string }
  | { kind: "categorical"; scaleId: string; memberId: string };
export interface PrimitiveColorIdentity {
  id: string;
  origin: PrimitiveColorOrigin;
  hidden: boolean;
}
export interface PrimitiveColor extends PrimitiveColorIdentity {
  name: string;
  value: string;
  generatedValue: string;
  manuallyOverridden: boolean;
  error?: string;
}

export function primitiveColorIdentities(
  document: ColorSystemDocument,
): PrimitiveColorIdentity[] {
  return [
    ...document.palette.map((color) => ({
      id: tokenUuid(tokenStableKey(PALETTE_SCALE_ID, color.id)),
      origin: { kind: "palette" as const, paletteColorId: color.id },
      hidden: false,
    })),
    ...document.scales.flatMap((scale) =>
      (scale.customContrasts?.steps ?? document.contrasts).map((contrast) => ({
        id: tokenUuid(tokenStableKey(scale.id, contrast.id)),
        origin: {
          kind: "ui-swatch" as const,
          scaleId: scale.id,
          contrastId: contrast.id,
        },
        hidden: !isFoundationPublished(scale),
      })),
    ),
    ...document.dataVisScales.flatMap((scale) =>
      scale.kind === "categorical"
        ? scale.members.map((member) => ({
            id: dataVisMemberId(scale.id, member.id),
            origin: {
              kind: "categorical" as const,
              scaleId: scale.id,
              memberId: member.id,
            },
            hidden: !isFoundationPublished(scale),
          }))
        : [],
    ),
  ];
}

export function publishedPrimitiveColors(
  document: ColorSystemDocument,
  colors: readonly ResolvedToken[],
  categorical: readonly Pick<
    BrowserToken,
    | "id"
    | "name"
    | "value"
    | "generatedValue"
    | "valueOverridden"
    | "validationError"
  >[],
  names: ReadonlyMap<string, string> = new Map(),
): PrimitiveColor[] {
  const values = new Map<
    string,
    {
      value: string | number;
      generatedValue: string | number;
      manuallyOverridden: boolean;
      name: string;
      error?: string;
    }
  >([
    ...colors.map(
      (token) =>
        [
          token.uuid,
          {
            value: token.value,
            generatedValue: token.generated.value,
            manuallyOverridden: token.valueOverridden,
            name: names.get(token.uuid) ?? token.uuid,
          },
        ] as const,
    ),
    ...categorical.map(
      (token) =>
        [
          token.id,
          {
            value: token.value,
            generatedValue: token.generatedValue,
            manuallyOverridden: token.valueOverridden,
            name: names.get(token.id) ?? token.name,
            error: token.validationError,
          },
        ] as const,
    ),
  ]);
  return primitiveColorIdentities(document)
    .filter((identity) => !identity.hidden)
    .map((identity) => {
      const output = values.get(identity.id);
      let error = output?.error;
      if (
        !output ||
        typeof output.value !== "string" ||
        typeof output.generatedValue !== "string"
      )
        error = "This primitive color has no concrete value.";
      else if (!error) {
        try {
          concreteColor(output.value);
        } catch (cause) {
          error = cause instanceof Error ? cause.message : String(cause);
        }
      }
      return {
        ...identity,
        name: output?.name ?? identity.id,
        value: typeof output?.value === "string" ? output.value : "",
        generatedValue:
          typeof output?.generatedValue === "string"
            ? output.generatedValue
            : "",
        manuallyOverridden: output?.manuallyOverridden ?? false,
        ...(error && { error }),
      };
    });
}

export function linkedPrimitiveColor(
  tokenId: string,
  colors: readonly PrimitiveColor[],
) {
  const color = colors.find((candidate) => candidate.id === tokenId);
  if (!color || color.hidden || color.error)
    throw new Error(
      color?.error ??
        `Primitive color ${tokenId} is unavailable. Choose a replacement color.`,
    );
  concreteColor(color.value);
  return color;
}
