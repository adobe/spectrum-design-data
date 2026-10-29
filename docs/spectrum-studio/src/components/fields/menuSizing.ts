// Copyright 2026 Adobe. All rights reserved.
export function fittedMenuWidth(
  trigger: number,
  content: number,
  viewport: number,
  custom?: number,
) {
  if (custom !== undefined && (!Number.isFinite(custom) || custom <= 0))
    throw new Error("ComboBox menuWidth must be a positive pixel value.");
  return Math.min(
    Math.max(trigger, custom ?? content),
    Math.max(1, viewport - 24),
  );
}
