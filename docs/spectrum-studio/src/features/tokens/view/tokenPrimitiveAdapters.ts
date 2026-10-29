// Copyright 2026 Adobe. All rights reserved.
import { tokenDisplayName, type ResolvedToken, type TokenName } from "../model";
import type { GeneratedTypographyToken } from "../../typography/model";
import type { GeneratedSpacingValue, SpacingScale } from "../../spacing/model";
import {
  typographyTokenGroups,
  typographyTokenName,
  type TypographyNamingContext,
} from "../../typography/typographyTokens";
import { temporaryTokenGroupForPrimitiveColorTokens } from "./temporaryTokenTermOrdering";
import type { TokenTableData } from "./tokenTableModel";
import { isFoundationPublished } from "../../foundations/types";
import {
  formatTypographyLength,
  formatTypographyNumber,
} from "../../typography/units";
import { dimensionIssues } from "../../scales/issues";

export function parseColorTokenDisplayName(displayName: string): TokenName {
  const separatorIndex = displayName.lastIndexOf("-");
  return separatorIndex === -1
    ? { colorName: displayName, contrastValue: "" }
    : {
        colorName: displayName.slice(0, separatorIndex),
        contrastValue: displayName.slice(separatorIndex + 1),
      };
}

export function buildColorPrimitiveTable(
  tokens: ResolvedToken[],
): TokenTableData {
  return {
    groups: temporaryTokenGroupForPrimitiveColorTokens(tokens).map((group) => ({
      id: group.id,
      label: group.label,
      rows: group.tokens.map((token) => {
        const displayName = tokenDisplayName(token.name);
        const message = token.stale
          ? "Token is out of date"
          : "Modified from original generated token";
        return {
          id: token.uuid,
          cells: {
            name: {
              text: displayName,
              swatch: token.value,
              edit: { kind: "color-name" as const, tokenId: token.uuid },
              ...(token.nameOverridden && {
                status: { isStale: token.stale, message },
              }),
            },
            value: {
              text: token.value,
              edit: { kind: "color-value" as const, tokenId: token.uuid },
              ...(token.valueOverridden && {
                status: { isStale: token.stale, message },
              }),
            },
          },
        };
      }),
    })),
    ...(tokens.length === 0 && {
      emptyMessage: "No primitive color tokens are available yet.",
    }),
  };
}

// Temporary until Foundations output or the design-data registry/taxonomy supplies
// real primitive tokens for these categories. Never display invented token values.
export function temporaryTokenPrimitiveAdapter(
  categoryLabel: string,
): TokenTableData {
  return {
    groups: [],
    emptyMessage: `Primitive ${categoryLabel.toLowerCase()} tokens are not connected to Foundations output yet.`,
  };
}

export function buildSpacingPrimitiveTable(
  scales: { scale: SpacingScale; values: GeneratedSpacingValue[] }[],
  prefix = "spacing",
): TokenTableData {
  return {
    groups: scales
      .filter(({ scale }) => isFoundationPublished(scale))
      .map(({ scale, values }) => ({
        id: `${prefix}-${scale.id}`,
        label: scale.name,
        rows: values.map((value) => ({
          id: `${prefix}-${scale.id}-${value.step}`,
          cells: {
            name: { text: value.name },
            value: {
              text:
                prefix === "radius" &&
                dimensionIssues([value], "non-negative").variant === "negative"
                  ? "Unavailable radius: values must be finite and non-negative."
                  : `${value.value}px`,
            },
          },
        })),
      })),
  };
}

export function buildTypographyPrimitiveTable(
  tokens: GeneratedTypographyToken[],
  naming?: TypographyNamingContext,
): TokenTableData {
  return {
    groups: typographyTokenGroups(tokens, naming).map((group) => ({
      id: group.id,
      label: group.label,
      rows: tokens.map((token) => {
        const value = group.value(token);
        return {
          id: `typography-${group.id}-${token.scale}`,
          cells: {
            name: { text: typographyTokenName(group, token, naming) },
            value: {
              text: group.isUnitless
                ? formatTypographyNumber(value)
                : formatTypographyLength(value, naming?.outputUnit ?? "rem"),
            },
          },
        };
      }),
    })),
  };
}
