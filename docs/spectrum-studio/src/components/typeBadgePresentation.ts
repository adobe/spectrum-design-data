// Copyright 2026 Adobe. All rights reserved.
import type { BadgeProps } from "@react-spectrum/s2";

export const TYPE_BADGE_VARIANTS = {
  rounding: "blue",
  "scale-naming": "purple",
  generator: "cyan",
  conditional: "magenta",
  "type-scale": "blue",
  geometric: "purple",
  linear: "cyan",
  custom: "magenta",
  cosine: "indigo",
  exponential: "orange",
  "built-in": "neutral",
} as const satisfies Record<string, BadgeProps["variant"]>;

export type TypeBadgeType =
  | keyof typeof TYPE_BADGE_VARIANTS
  | "expression"
  | "tshirt-sizing";

export function typeBadgeVariant(type: TypeBadgeType) {
  const canonicalType =
    type === "expression"
      ? "custom"
      : type === "tshirt-sizing"
        ? "generator"
        : type;
  return TYPE_BADGE_VARIANTS[canonicalType];
}
