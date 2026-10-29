// Copyright 2026 Adobe. All rights reserved.
export function graphSeriesStyle(id: string, isBaseline = false) {
  const hash = [...id].reduce(
    (hash, character) =>
      Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  return {
    color: isBaseline ? 0 : 1 + (hash % 5),
    dash: isBaseline
      ? undefined
      : ["8 4", "2 4", "8 3 2 3", "12 4", "4 3"][(hash >>> 3) % 5],
    shape: isBaseline ? 0 : (hash >>> 6) % 3,
  };
}
