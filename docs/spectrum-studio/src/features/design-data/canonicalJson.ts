// Copyright 2026 Adobe. All rights reserved.
/** Stable object-key ordering; array order remains authored evidence. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(
        Object.entries(item).sort(([left], [right]) =>
          left.localeCompare(right, "en"),
        ),
      );
    }
    return item;
  });
}
