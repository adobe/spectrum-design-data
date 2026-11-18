// Copyright 2026 Adobe. All rights reserved.
// Shared lifecycle data for authored items that reach design-data output.
// See docs/rfcs/deletion-and-deprecation.md.

/**
 * Present only when the item is deprecated. `deprecatedIn` stays empty until
 * a release assigns it (DEBT-035), so the UI shows "pending release".
 */
export interface ItemLifecycle {
  deprecated: true;
  deprecatedIn?: string;
  deprecatedComment?: string;
  /** ID of an item of the same kind that consumers should use instead. */
  replacedBy?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const LIFECYCLE_FIELDS = new Set([
  "deprecated",
  "deprecatedIn",
  "deprecatedComment",
  "replacedBy",
]);

/** Returns a reason when the value is not a valid lifecycle object. */
export function lifecycleIssue(value: unknown): string | undefined {
  if (!isRecord(value)) return "lifecycle must be an object";
  const extra = Object.keys(value).find((key) => !LIFECYCLE_FIELDS.has(key));
  if (extra) return `lifecycle has unknown field "${extra}"`;
  if (value.deprecated !== true) return "lifecycle.deprecated must be true";
  for (const key of ["deprecatedIn", "deprecatedComment", "replacedBy"])
    if (value[key] !== undefined && typeof value[key] !== "string")
      return `lifecycle.${key} must be text`;
  if (value.replacedBy === "") return "lifecycle.replacedBy must not be empty";
  return undefined;
}

export function isItemLifecycle(value: unknown): value is ItemLifecycle {
  return lifecycleIssue(value) === undefined;
}

export function isDeprecated(item: { lifecycle?: ItemLifecycle } | undefined) {
  return item?.lifecycle?.deprecated === true;
}

export function deprecatedLifecycle(replacedBy?: string): ItemLifecycle {
  return replacedBy ? { deprecated: true, replacedBy } : { deprecated: true };
}

/** Returns a copy of the item with the lifecycle set, or removed when undefined. */
export function withLifecycle<T extends { lifecycle?: ItemLifecycle }>(
  item: T,
  lifecycle: ItemLifecycle | undefined,
): T {
  const next = { ...item };
  if (lifecycle) next.lifecycle = lifecycle;
  else delete next.lifecycle;
  return next;
}
