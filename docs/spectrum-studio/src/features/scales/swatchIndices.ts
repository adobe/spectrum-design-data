// Copyright 2026 Adobe. All rights reserved.
export interface IndexedSwatch {
  id: string;
  scaleIndex?: number;
}

export const isScaleIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function swatchIndex(swatch: { scaleIndex?: number }, position: number) {
  return swatch.scaleIndex ?? (position + 1) * 100;
}

export function assertSwatchIndices(indices: readonly number[]) {
  if (indices.some((value) => !isScaleIndex(value)))
    throw new Error("Enter a positive scale index.");
  if (new Set(indices).size !== indices.length)
    throw new Error("This scale index is already used by another swatch.");
}

export function reindexSwatches<T extends IndexedSwatch>(
  swatches: readonly T[],
  id: string,
  scaleIndex: number,
  indices = swatches.map(swatchIndex),
): T[] {
  if (!swatches.some((swatch) => swatch.id === id))
    throw new Error("This swatch is no longer available.");
  if (!isScaleIndex(scaleIndex))
    throw new Error("Enter a positive scale index.");
  const next = swatches.map((swatch, position) => ({
    ...swatch,
    scaleIndex: swatch.id === id ? scaleIndex : indices[position],
  }));
  assertSwatchIndices(next.map((swatch) => swatch.scaleIndex));
  return next.sort((a, b) => a.scaleIndex - b.scaleIndex);
}

export function nextSwatchIndex(indices: readonly number[]) {
  const next = Math.max(0, ...indices) + 100;
  if (!isScaleIndex(next) || indices.includes(next))
    throw new Error("A new scale index cannot be allocated.");
  return next;
}

export function availableSwatchIndices(
  registered: readonly number[],
  indices: readonly number[],
  current: number,
) {
  const occupied = new Set(indices.filter((value) => value !== current));
  return [...new Set([...registered, current])]
    .filter((value) => isScaleIndex(value) && !occupied.has(value))
    .sort((a, b) => a - b);
}

export function parseScaleIndex(text: string) {
  const value = Number(text.trim());
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim()) || !isScaleIndex(value))
    throw new Error("Enter a positive scale index.");
  return value;
}

export function swatchIndexOptions(
  registered: readonly number[],
  indices: readonly number[],
  current: number,
) {
  return availableSwatchIndices(registered, indices, current).map((value) => ({
    id: String(value),
    kind: "preset" as const,
    name: String(value),
    displayValue: String(value),
  }));
}
