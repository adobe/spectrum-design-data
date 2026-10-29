// Copyright 2026 Adobe. All rights reserved.
export interface OpacityLevel {
  id: string;
  value: number;
  rows: { [modeKey: string]: string };
}

export interface OpacityDocument {
  schemaVersion: 1;
  polarityCompensation: number;
  levels: OpacityLevel[];
}

export const isAlpha = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function isOpacityDocument(value: unknown): value is OpacityDocument {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !isAlpha(value.polarityCompensation) ||
    !Array.isArray(value.levels)
  )
    return false;
  const identities = new Set<string>();
  return value.levels.every((level: unknown) => {
    if (
      !object(level) ||
      typeof level.id !== "string" ||
      !uuid.test(level.id) ||
      !isAlpha(level.value) ||
      !object(level.rows)
    )
      return false;
    for (const id of [level.id, ...Object.values(level.rows)]) {
      if (typeof id !== "string" || !uuid.test(id) || identities.has(id))
        return false;
      identities.add(id);
    }
    return true;
  });
}
