// Copyright 2026 Adobe. All rights reserved.
import { tokenUuid } from "./model";

export interface AliasToken {
  id: string;
  name: string;
  $ref: string;
  contexts: string[];
}

export interface AliasDocument {
  schemaVersion: 1;
  tokens: AliasToken[];
}

export interface AliasTarget {
  id: string;
  rowId?: string;
  name: string;
  context: string;
  compatibleModes?: Readonly<Record<string, readonly string[]>>;
}

export function aliasTargetsForContext<T extends AliasTarget>(
  targets: readonly T[],
  id: string,
  context: string,
): T[] {
  const exact = targets.filter(
    (target) => target.id === id && target.context === context,
  );
  if (exact.length) return exact;
  let pairs: unknown;
  try {
    pairs = JSON.parse(context);
  } catch {
    return [];
  }
  const isPair = (pair: unknown): pair is [string, string] =>
    Array.isArray(pair) &&
    pair.length === 2 &&
    typeof pair[0] === "string" &&
    typeof pair[1] === "string";
  if (
    !Array.isArray(pairs) ||
    !pairs.every(isPair) ||
    new Set(pairs.map((pair) => pair[0])).size !== pairs.length
  )
    return [];
  // Static targets retain scoped aliases without inventing mode-dependent value rows.
  return targets.filter(
    (target) =>
      target.id === id &&
      target.context === "[]" &&
      target.compatibleModes &&
      pairs.every(([axis, mode]) =>
        target.compatibleModes![axis]?.includes(mode),
      ),
  );
}

export interface AliasExportTarget extends AliasTarget {
  rowId: string;
}

export const EMPTY_ALIASES: AliasDocument = { schemaVersion: 1, tokens: [] };
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isAliasDocument(value: unknown): value is AliasDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const document = value as Partial<AliasDocument>;
  if (
    Object.keys(document).some(
      (key) => !["schemaVersion", "tokens"].includes(key),
    ) ||
    document.schemaVersion !== 1 ||
    !Array.isArray(document.tokens)
  )
    return false;
  const ids = new Set<string>();
  return document.tokens.every((token: unknown) => {
    if (!token || typeof token !== "object" || Array.isArray(token))
      return false;
    const record = token as Partial<AliasToken>;
    if (
      Object.keys(record).some(
        (key) => !["id", "name", "$ref", "contexts"].includes(key),
      ) ||
      typeof record.id !== "string" ||
      !uuid.test(record.id) ||
      ids.has(record.id) ||
      typeof record.name !== "string" ||
      !record.name.trim() ||
      record.name !== record.name.trim() ||
      typeof record.$ref !== "string" ||
      !record.$ref.trim() ||
      record.$ref !== record.$ref.trim() ||
      !Array.isArray(record.contexts) ||
      !record.contexts.length ||
      record.contexts.some(
        (context) =>
          typeof context !== "string" ||
          !context.trim() ||
          context !== context.trim(),
      ) ||
      new Set(record.contexts).size !== record.contexts.length
    )
      return false;
    ids.add(record.id);
    return true;
  });
}

export function assertAliasTargets(
  document: AliasDocument,
  targets: readonly AliasTarget[],
) {
  if (!isAliasDocument(document))
    throw new Error("Invalid saved alias tokens.");
  const targetIds = new Set(targets.map((target) => target.id));
  const targetNames = new Map<string, string>();
  const names = new Map<string, string>();
  const aliasNames = new Set<string>();
  const claim = (name: string, owner: string) => {
    const key = name.toLowerCase();
    const previous = names.get(key);
    if (previous && previous !== owner)
      throw new Error(
        `Token name "${name}" conflicts with another token or alias. Rename it or delete the conflicting alias before saving.`,
      );
    names.set(key, owner);
  };
  for (const target of targets) {
    if (
      !target.id.trim() ||
      !target.name.trim() ||
      target.name !== target.name.trim() ||
      !target.context.trim()
    ) {
      throw new Error(
        "A canonical alias target has an invalid identity, name or mode context.",
      );
    }
    const key = JSON.stringify([target.id, target.context]);
    const previous = targetNames.get(key);
    if (previous && previous !== target.name)
      throw new Error(
        "A canonical alias target has conflicting names in the same mode context.",
      );
    targetNames.set(key, target.name);
    claim(target.name, target.id);
  }
  for (const token of document.tokens) {
    if (targetIds.has(token.id))
      throw new Error(
        `Alias "${token.name}" shares a canonical token identity.`,
      );
    if (!targetIds.has(token.$ref))
      throw new Error(
        `Alias "${token.name}" has an unavailable canonical target.`,
      );
    const key = JSON.stringify([token.$ref, token.name.toLowerCase()]);
    if (aliasNames.has(key))
      throw new Error(`Alias "${token.name}" is recorded more than once.`);
    aliasNames.add(key);
    for (const context of token.contexts) {
      const target = aliasTargetsForContext(targets, token.$ref, context)[0];
      if (!target)
        throw new Error(
          `Alias "${token.name}" has an unavailable mode context.`,
        );
      if (target.name.toLowerCase() === token.name.toLowerCase())
        throw new Error(`Alias "${token.name}" duplicates its canonical name.`);
      claim(token.name, token.$ref);
    }
  }
}

export function pruneAliasTargets(
  document: AliasDocument,
  targets: readonly AliasTarget[],
): AliasDocument {
  if (!isAliasDocument(document))
    throw new Error("Invalid saved alias tokens.");
  return {
    ...document,
    tokens: document.tokens.flatMap((token) => {
      const contexts = token.contexts.filter((context) => {
        const target = aliasTargetsForContext(targets, token.$ref, context)[0];
        return target && target.name.toLowerCase() !== token.name.toLowerCase();
      });
      return contexts.length ? [{ ...token, contexts }] : [];
    }),
  };
}

/** A save captures previous saved names once; generation never recreates aliases. */
export function aliasesForSave(
  document: AliasDocument,
  before: readonly AliasTarget[],
  after: readonly AliasTarget[],
): AliasDocument {
  return planAliasesForSave(document, before, after).document;
}

export function planAliasesForSave(
  document: AliasDocument,
  before: readonly AliasTarget[],
  after: readonly AliasTarget[],
  reindexedIds: ReadonlySet<string> = new Set(),
): { document: AliasDocument; skippedNames: string[] } {
  if (!isAliasDocument(document))
    throw new Error("Invalid saved alias tokens.");
  const skippedNames = new Set<string>();
  const reusedStepName = (id: string, name: string) =>
    reindexedIds.has(id) &&
    after.some(
      (target) =>
        target.id !== id && target.name.toLowerCase() === name.toLowerCase(),
    );
  const tokens = pruneAliasTargets(document, after).tokens.filter((alias) => {
    if (!reusedStepName(alias.$ref, alias.name)) return true;
    skippedNames.add(alias.name);
    return false;
  });
  for (const previous of before) {
    const target = aliasTargetsForContext(
      after,
      previous.id,
      previous.context,
    )[0];
    if (!target || previous.name.toLowerCase() === target.name.toLowerCase())
      continue;
    if (reusedStepName(previous.id, previous.name)) {
      skippedNames.add(previous.name);
      continue;
    }
    const existing = tokens.find(
      (token) => token.$ref === previous.id && token.name === previous.name,
    );
    if (existing) {
      if (!existing.contexts.includes(previous.context))
        existing.contexts.push(previous.context);
    } else {
      tokens.push({
        id: tokenUuid(`compatibility-alias:v1:${previous.id}:${previous.name}`),
        name: previous.name,
        $ref: previous.id,
        contexts: [previous.context],
      });
    }
  }
  const result: AliasDocument = { schemaVersion: 1, tokens };
  assertAliasTargets(result, after);
  return { document: result, skippedNames: [...skippedNames] };
}

export function removeAlias(
  document: AliasDocument,
  id: string,
): AliasDocument {
  if (!document.tokens.some((token) => token.id === id))
    throw new Error("This alias is no longer available.");
  return {
    ...document,
    tokens: document.tokens.filter((token) => token.id !== id),
  };
}

export function aliasReferencePacket(
  document: AliasDocument,
  targets: readonly AliasExportTarget[],
) {
  assertAliasTargets(document, targets);
  const rows = document.tokens.flatMap((token) =>
    token.contexts.map((context) => {
      const matches = aliasTargetsForContext(targets, token.$ref, context);
      if (matches.length !== 1)
        throw new Error(
          `Alias "${token.name}" needs exactly one emitted target in this mode context.`,
        );
      const target = matches[0];
      if (!target.rowId.trim())
        throw new Error(
          `Alias "${token.name}" has no emitted target in this mode context.`,
        );
      return {
        uuid: tokenUuid(`compatibility-alias-row:v1:${token.id}:${context}`),
        aliasId: token.id,
        name: token.name,
        $ref: target.rowId,
        context,
      };
    }),
  );
  const ids = new Set(targets.map((target) => target.rowId));
  for (const row of rows) {
    if (ids.has(row.uuid))
      throw new Error(`Alias "${row.name}" shares an emitted token identity.`);
    ids.add(row.uuid);
  }
  return rows;
}
