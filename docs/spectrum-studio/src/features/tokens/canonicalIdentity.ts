// Copyright 2026 Adobe. All rights reserved.
import type { BrowserTokenEdit, BrowserTokenEdits } from "./browserEditTypes";
import type { ModeSet } from "../modes/model";
import type { TokenPanelId } from "./view/tokenPanelRegistry";

export const canonicalPrimitiveProperties: Partial<
  Record<TokenPanelId, string>
> = {
  colors: "color",
  spacing: "spacing",
  size: "size",
  radius: "corner-radius",
  elevation: "shadow",
  opacity: "opacity",
};

export interface TokenIdentity {
  /** Generator source coordinate, not a second token identity. */
  sourceId: string;
  conceptId: string;
  name: { [field: string]: string | number };
  rows: { [context: string]: string };
}

const indexes = new WeakMap<BrowserTokenEdits, Map<string, TokenIdentity>>();

export function tokenIdentity(
  edits: BrowserTokenEdits,
  sourceId: string,
): TokenIdentity | undefined {
  let index = indexes.get(edits);
  if (!index) {
    index = new Map();
    for (const [id, edit] of Object.entries(edits)) {
      const identity = edit.authoring?.identity;
      if (!identity) continue;
      index.set(id, identity);
      index.set(identity.sourceId, identity);
    }
    indexes.set(edits, index);
  }
  return index.get(sourceId);
}

export function tokenEdit(edits: BrowserTokenEdits, sourceId: string) {
  return edits[tokenIdentity(edits, sourceId)?.conceptId ?? sourceId];
}

export function tokenEditModeKeys(edits: BrowserTokenEdits, sourceId: string) {
  const edit = tokenEdit(edits, sourceId);
  return [
    ...Object.keys(edit?.values ?? {}),
    ...Object.keys(edit?.authoring?.assignments ?? {}),
    ...Object.keys(edit?.authoring?.lifecycle?.frozen ?? {}),
  ];
}

export function resetTokenEdit(
  edit: BrowserTokenEdit | undefined,
  values: BrowserTokenEdit["values"] = {},
): BrowserTokenEdit | undefined {
  const identity = edit?.authoring?.identity;
  if (identity) return { values, authoring: { assignments: {}, identity } };
  return Object.keys(values).length ? { values } : undefined;
}

export function tokenIdentityRow(
  identity: TokenIdentity,
  modeSets: readonly ModeSet[],
  context: Readonly<Record<string, string | number>>,
) {
  const selected = new Map(
    modeSets.map((axis) => [
      axis.id,
      axis.modes.find((mode) => mode.key === context[axis.key])?.id ??
        axis.defaultModeId,
    ]),
  );
  const candidates = Object.entries(identity.rows).filter(([key]) =>
    (JSON.parse(key) as [string, string][]).every(
      ([axis, mode]) => selected.get(axis) === mode,
    ),
  );
  const specificity = Math.max(
    -1,
    ...candidates.map(
      ([key]) => (JSON.parse(key) as [string, string][]).length,
    ),
  );
  const matches = candidates.filter(
    ([key]) => (JSON.parse(key) as [string, string][]).length === specificity,
  );
  return matches.length === 1 ? matches[0][1] : undefined;
}

export function reconcileTokenIdentityRows(
  edits: BrowserTokenEdits,
  previousModeSets: readonly ModeSet[],
  modeSets: readonly ModeSet[],
  requiredContexts: ReadonlyMap<string, ReadonlySet<string>>,
  allocateRow: (sourceId: string, context: string) => string = () =>
    crypto.randomUUID(),
): BrowserTokenEdits {
  const previous = new Map(previousModeSets.map((axis) => [axis.id, axis]));
  const active = new Map(modeSets.map((axis) => [axis.id, axis]));
  let next = edits;
  for (const [id, edit] of Object.entries(edits)) {
    const identity = edit.authoring?.identity;
    if (!identity) continue;
    const required =
      requiredContexts.get(identity.sourceId) ??
      requiredContexts.get(identity.conceptId);
    if (!required) continue;
    const rows = { ...identity.rows };
    const reserved = new Set(
      [...required].flatMap((key) => (rows[key] ? [rows[key]] : [])),
    );
    let changed = false;
    for (const context of required) {
      if (rows[context]) continue;
      const selected = new Map(JSON.parse(context) as [string, string][]);
      const candidates = Object.entries(rows)
        .flatMap(([key, uuid]) => {
          if (reserved.has(uuid)) return [];
          const conditions = new Map(JSON.parse(key) as [string, string][]);
          const compatible =
            [...conditions].every(([axis, mode]) => {
              if (selected.has(axis)) return selected.get(axis) === mode;
              return (
                mode === (active.get(axis) ?? previous.get(axis))?.defaultModeId
              );
            }) &&
            [...selected].every(
              ([axis, mode]) =>
                conditions.has(axis) ||
                mode === active.get(axis)?.defaultModeId,
            );
          return compatible
            ? [{ key, uuid, specificity: conditions.size }]
            : [];
        })
        .sort((left, right) => right.specificity - left.specificity);
      if (
        candidates.length > 1 &&
        candidates[0].specificity === candidates[1].specificity
      )
        throw new Error(
          `Token ${identity.conceptId} has ambiguous default publications for ${context}.`,
        );
      const candidate = candidates[0];
      if (candidate) delete rows[candidate.key];
      rows[context] =
        candidate?.uuid ?? allocateRow(identity.sourceId, context);
      reserved.add(rows[context]);
      changed = true;
    }
    if (!changed) continue;
    if (next === edits) next = { ...edits };
    next[id] = {
      ...edit,
      authoring: { ...edit.authoring!, identity: { ...identity, rows } },
    };
  }
  return next;
}

export function isTokenIdentity(value: unknown): value is TokenIdentity {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<TokenIdentity>;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return (
    Object.keys(value).every((key) =>
      ["sourceId", "conceptId", "name", "rows"].includes(key),
    ) &&
    typeof record.sourceId === "string" &&
    record.sourceId.length > 0 &&
    typeof record.conceptId === "string" &&
    uuid.test(record.conceptId) &&
    !!record.name &&
    typeof record.name === "object" &&
    !Array.isArray(record.name) &&
    Object.values(record.name).every(
      (item) =>
        typeof item === "string" ||
        (typeof item === "number" && Number.isFinite(item)),
    ) &&
    !!record.rows &&
    typeof record.rows === "object" &&
    !Array.isArray(record.rows) &&
    new Set(Object.values(record.rows)).size ===
      Object.keys(record.rows).length &&
    Object.entries(record.rows).every(([context, id]) => {
      try {
        const pairs: unknown = JSON.parse(context);
        return (
          Array.isArray(pairs) &&
          pairs.every(
            (pair: unknown) =>
              Array.isArray(pair) &&
              pair.length === 2 &&
              pair.every(
                (item: unknown) => typeof item === "string" && item.length > 0,
              ),
          ) &&
          new Set(pairs.map((pair: string[]) => pair[0])).size ===
            pairs.length &&
          JSON.stringify(
            [...pairs].sort(([left], [right]) => left.localeCompare(right)),
          ) === context &&
          typeof id === "string" &&
          uuid.test(id)
        );
      } catch {
        return false;
      }
    })
  );
}
