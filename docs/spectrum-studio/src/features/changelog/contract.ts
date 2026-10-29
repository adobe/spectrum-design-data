// Copyright 2026 Adobe. All rights reserved.
export type PathPart =
  | string
  | { key: "id" | "conceptId"; id: string }
  | { index: number };
export type SourcePath = readonly PathPart[];
export interface ChangeContext {
  key: string;
  label: string;
}
export interface AuthoredAddress {
  path: SourcePath;
  /** Compared working value; reset must reject a stale card. */
  expected: unknown;
}

export function pathId(path: SourcePath): string {
  return JSON.stringify(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readPath(value: unknown, path: SourcePath): unknown {
  for (const part of path) {
    if (typeof part === "string")
      value = isRecord(value) ? value[part] : undefined;
    else if (Array.isArray(value))
      value =
        "index" in part
          ? value[part.index]
          : value.find(
              (item: unknown) => isRecord(item) && item[part.key] === part.id,
            );
    else return undefined;
  }
  return value;
}

export function sameValue(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return left === right;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
    );
  if (isRecord(left) && isRecord(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => sameValue(left[key], right[key]));
  }
  return left === right;
}

/** Restore through stable collection identities, never through displayed names. */
export function restorePath<T>(
  working: T,
  shipped: T,
  address: AuthoredAddress,
): T {
  if (!sameValue(readPath(working, address.path), address.expected)) {
    throw new Error(
      "This change has been updated. Reopen Changes before reverting it.",
    );
  }
  const result = structuredClone(working);
  function restore(
    target: unknown,
    original: unknown,
    parts: SourcePath,
  ): void {
    const [part, ...rest] = parts;
    if (part === undefined)
      throw new Error(
        "A reset must identify a specific authored object or field.",
      );
    if (typeof part === "string") {
      if (!isRecord(target))
        throw new Error("The source object is no longer available.");
      const before = isRecord(original) ? original[part] : undefined;
      if (!rest.length) {
        if (before === undefined) delete target[part];
        else target[part] = structuredClone(before);
      } else {
        if (target[part] === undefined) {
          if (before === undefined)
            throw new Error("The source object has no shipped counterpart.");
          target[part] = structuredClone(before);
        }
        restore(target[part], before, rest);
      }
      return;
    }
    if (!Array.isArray(target))
      throw new Error("The source collection is no longer available.");
    const list: unknown[] = Array.isArray(original) ? original : [];
    const index =
      "index" in part
        ? part.index
        : target.findIndex(
            (item: unknown) => isRecord(item) && item[part.key] === part.id,
          );
    const originalIndex =
      "index" in part
        ? part.index
        : list.findIndex(
            (item) => isRecord(item) && item[part.key] === part.id,
          );
    const before = list[originalIndex];
    if (!rest.length) {
      if (before === undefined) {
        if (index >= 0) target.splice(index, 1);
      } else if (index >= 0) target[index] = structuredClone(before);
      else
        target.splice(
          Math.min(Math.max(originalIndex, 0), target.length),
          0,
          structuredClone(before),
        );
    } else {
      if (index < 0)
        throw new Error(
          "Restore the removed object before reverting one of its fields.",
        );
      restore(target[index], before, rest);
    }
  }
  restore(result, shipped, address.path);
  return result;
}
