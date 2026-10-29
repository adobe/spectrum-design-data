// Copyright 2026 Adobe. All rights reserved.
export const TYPOGRAPHY_UNITS = ["px", "rem", "em", "pt"] as const;
export type TypographyUnit = (typeof TYPOGRAPHY_UNITS)[number];
export const TYPOGRAPHY_REFERENCE_PX = 16;

const pixelsPerUnit: Record<TypographyUnit, number> = {
  px: 1,
  rem: TYPOGRAPHY_REFERENCE_PX,
  em: TYPOGRAPHY_REFERENCE_PX,
  pt: 4 / 3,
};

export function isTypographyUnit(value: unknown): value is TypographyUnit {
  return TYPOGRAPHY_UNITS.some((unit) => unit === value);
}

export function fromTypographyUnit(
  value: number,
  unit: TypographyUnit,
): number {
  if (!isTypographyUnit(unit)) throw new Error("Choose px, rem, em, or pt.");
  if (!Number.isFinite(value)) throw new Error("Enter a finite length.");
  return value * pixelsPerUnit[unit];
}

export function toTypographyUnit(pixels: number, unit: TypographyUnit): number {
  if (!isTypographyUnit(unit)) throw new Error("Choose px, rem, em, or pt.");
  if (!Number.isFinite(pixels))
    throw new Error("Cannot format an invalid length.");
  return pixels / pixelsPerUnit[unit];
}

export function formatTypographyNumber(value: number): string {
  if (!Number.isFinite(value))
    throw new Error("Cannot format an invalid number.");
  return String(Number(value.toFixed(6)));
}

export function formatTypographyLength(
  pixels: number,
  unit: TypographyUnit,
): string {
  return `${formatTypographyNumber(toTypographyUnit(pixels, unit))}${unit}`;
}
