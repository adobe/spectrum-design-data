// Copyright 2026 Adobe. All rights reserved.
export function dataVisExampleCells(diverging = false) {
  return Array.from({ length: 48 }, (_, index) => {
    const value = diverging ? ((index * 7) % 12) - 4 : ((index * 7) % 48) / 47;
    const position = diverging
      ? value <= 0
        ? (0.5 * (value + 4)) / 4
        : 0.5 + (0.5 * value) / 7
      : value;
    return {
      row: Math.floor(index / 12) + 1,
      column: (index % 12) + 1,
      value,
      position,
    };
  });
}

export function dataVisExampleBars(count: number) {
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error("The example needs a valid categorical color count.");
  return Array.from({ length: Math.min(count, 20) }, (_, index) => ({
    category: index + 1,
    value: 50 + ((index * 37) % 120),
  }));
}
