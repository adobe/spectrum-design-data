// Copyright 2026 Adobe. All rights reserved.
// Pure planning for "Remove all deprecations". Every use of a deprecated token
// moves to its replacement, or gets the token's value hard-coded mode by mode.
// Uses of a deprecated term move to its replacement term.
// See docs/rfcs/deletion-and-deprecation.md.
import type {
  ComponentAssignment,
  ComponentsDocument,
  LiteralValue,
} from "../components/model";
import type { ComponentToken } from "../components/references";
import type { TaxonomyDocument } from "../taxonomy/model";
import { isDeprecated } from "../edit-session/lifecycle";
import type { AliasDocument } from "../tokens/aliases";
import type { CanonicalAliasRow } from "../tokens/baseAliasRows";
import type {
  BrowserTokenEdit,
  BrowserTokenEdits,
  TokenAssignment,
  TokenValue,
} from "../tokens/browserEditTypes";
import type { BrowserToken } from "../tokens/browserModel";
import { tokenIdentity } from "../tokens/canonicalIdentity";
import { dialogRowsForMode, resolveDialogTokens } from "../tokens/dialogModel";
import { literalAssignment, modePairs } from "../tokens/tokenAssignments";

export interface TokenRemovalInput {
  rows: readonly CanonicalAliasRow[];
  edits: BrowserTokenEdits;
  taxonomy: TaxonomyDocument;
  aliases: AliasDocument;
  components: ComponentsDocument;
  componentTokens: readonly ComponentToken[];
  /** Documents whose token references Studio can't rewrite yet (styles, structures). */
  fixedReferences: unknown;
  /** Deprecated tokens to delete. */
  tokenIds: readonly string[];
  /** Step tokens of deprecated color scales; removing the scale deletes them. */
  scaleTokenIds?: readonly string[];
}

export interface TokenRemovalPlan {
  edits: BrowserTokenEdits;
  aliases: AliasDocument;
  components: ComponentsDocument;
  removed: string[];
  kept: { id: string; reason: string }[];
  /** Uses moved to a replacement token. */
  repointed: number;
  /** Mode values written in place of a reference. */
  hardCoded: number;
}

type Slot =
  | { kind: "assignment"; key: string; generated: boolean }
  | { kind: "manual" };

interface TokenUse {
  consumerId: string;
  context: string;
  slot: Slot;
  generatedValue: TokenValue;
}

const KEPT_FIXED =
  "Styles or structures still use it. Point them at another token first.";
const KEPT_ALIAS =
  "An alias still points at it and it has no single replacement.";
const KEPT_COMPONENT =
  "A component still uses it and its value can't be copied.";
const KEPT_VALUE = "Its value can't be resolved in every mode.";
/** Mode key that applies in every mode. */
const ROOT_CONTEXT = "[]";

function tokenKeys(edits: BrowserTokenEdits, id: string) {
  const identity = tokenIdentity(edits, id);
  return identity ? [id, identity.sourceId, identity.conceptId] : [id];
}

function collectStrings(value: unknown, into = new Set<string>()) {
  if (typeof value === "string") into.add(value);
  else if (Array.isArray(value))
    value.forEach((item) => collectStrings(item, into));
  else if (value && typeof value === "object")
    Object.values(value).forEach((item) => collectStrings(item, into));
  return into;
}

/** The most specific assignment key that applies to a mode, like `assignmentForMode`. */
function assignmentKey(
  assignments: Readonly<Record<string, unknown>>,
  modeKey: string,
) {
  const selected = new Map(modePairs(modeKey));
  return Object.keys(assignments)
    .filter((key) =>
      modePairs(key).every(([axis, mode]) => selected.get(axis) === mode),
    )
    .sort((a, b) => modePairs(b).length - modePairs(a).length)[0];
}

/**
 * Follows one-to-one replacements past deprecated tokens to an active one.
 * Several replacements, none, or a chain ending at a deprecated token give
 * `undefined`, which means "hard-code the value".
 */
export function finalTokenReplacement(
  edits: BrowserTokenEdits,
  id: string,
  exists: (id: string) => boolean,
  removing: (id: string) => boolean = () => false,
): string | undefined {
  const seen = new Set<string>();
  let current = id;
  while (!seen.has(current)) {
    seen.add(current);
    const ids = edits[current]?.authoring?.lifecycle?.replacementIds ?? [];
    if (ids.length !== 1 || !exists(ids[0])) return undefined;
    if (edits[ids[0]]?.status !== "deprecated" && !removing(ids[0]))
      return ids[0];
    current = ids[0];
  }
  return undefined;
}

function sameContext(
  a: Readonly<Record<string, string | number>>,
  b: Readonly<Record<string, string | number>>,
) {
  const text = (value: Readonly<Record<string, string | number>>) =>
    JSON.stringify(
      Object.entries(value).sort(([x], [y]) => x.localeCompare(y)),
    );
  return text(a) === text(b);
}

/** Compares token IDs by identity, so edit keys, source IDs and concept IDs match. */
function tokenMatcher(edits: BrowserTokenEdits) {
  const conceptOf = (id: string) => tokenIdentity(edits, id)?.conceptId ?? id;
  return (a: string, b: string) => a === b || conceptOf(a) === conceptOf(b);
}

/** The replacement token's component entry for the same modes, if there is one. */
function componentSwap(
  entries: readonly ComponentToken[],
  entry: ComponentToken,
  replacement: string,
  sameToken: (a: string, b: string) => boolean,
) {
  return entries.find(
    (item) =>
      !!item.browserId &&
      !item.outputError &&
      sameToken(item.browserId, replacement) &&
      sameContext(item.context, entry.context),
  );
}

function resolveAll(
  input: TokenRemovalInput,
  edits: BrowserTokenEdits,
  contexts: readonly string[],
) {
  return new Map(
    contexts.map((context) => [
      context,
      new Map(
        resolveDialogTokens(input.rows, edits, input.taxonomy, context).map(
          (token) => [token.id, token],
        ),
      ),
    ]),
  );
}

/**
 * Plans the deletion of deprecated tokens. Each use is moved to the token's
 * replacement, or the token's resolved value is written in its place for each
 * mode. A token is kept when a use can't be rewritten; the reason says why.
 */
export function planTokenRemoval(input: TokenRemovalInput): TokenRemovalPlan {
  const { rows, edits } = input;
  const scaleTokens = new Set(input.scaleTokenIds ?? []);
  const candidates = [...input.tokenIds, ...scaleTokens];
  const empty: TokenRemovalPlan = {
    edits,
    aliases: input.aliases,
    components: input.components,
    removed: [],
    kept: [],
    repointed: 0,
    hardCoded: 0,
  };
  if (!candidates.length) return empty;

  const contexts = new Set<string>([ROOT_CONTEXT]);
  for (const row of rows) contexts.add(row.context);
  for (const edit of Object.values(edits))
    for (const key of Object.keys(edit.authoring?.assignments ?? {}))
      contexts.add(key);
  const contextList = [...contexts];
  const before = resolveAll(input, edits, contextList);
  const rowContexts = new Map(
    contextList.map((context) => [
      context,
      new Map(
        dialogRowsForMode(rows, context).map((row) => [
          row.token.id,
          row.context,
        ]),
      ),
    ]),
  );
  const exists = (id: string) =>
    !!edits[id]?.authoring?.manual ||
    [...before.values()].some((tokens) => tokens.has(id));
  const fixed = collectStrings(input.fixedReferences);
  const sameToken = tokenMatcher(edits);

  const kept = new Map<string, string>();
  let plan = empty;
  // A kept token stays in the data, so its own references must be rewritten
  // too. Re-plan until the kept set stops growing.
  for (let attempt = 0; attempt <= candidates.length; attempt += 1) {
    const removing = candidates.filter((id) => !kept.has(id));
    const keyToToken = new Map(
      removing.flatMap((id) => tokenKeys(edits, id).map((key) => [key, id])),
    );
    const removingSet = new Set(removing);
    const replacement = new Map(
      removing.map((id) => [
        id,
        finalTokenReplacement(edits, id, exists, (next) =>
          removingSet.has(next),
        ),
      ]),
    );
    const uses = new Map<string, TokenUse[]>();
    for (const [context, tokens] of before) {
      for (const token of tokens.values()) {
        if (keyToToken.has(token.id) || token.alias || !token.referenceId)
          continue;
        const target = keyToToken.get(token.referenceId);
        if (!target) continue;
        const authoring = edits[token.id]?.authoring;
        if (authoring?.lifecycle?.frozen) continue;
        const key = assignmentKey(authoring?.assignments ?? {}, context);
        const rowContext = rowContexts.get(context)?.get(token.id);
        const slot: Slot | undefined =
          key !== undefined
            ? { kind: "assignment", key, generated: false }
            : authoring?.manual?.targetId
              ? { kind: "manual" }
              : rowContext !== undefined
                ? { kind: "assignment", key: rowContext, generated: true }
                : undefined;
        if (!slot) continue;
        const list = uses.get(target) ?? [];
        list.push({
          consumerId: token.id,
          context,
          slot,
          generatedValue: token.generatedValue,
        });
        uses.set(target, list);
      }
    }

    const newlyKept = new Map<string, string>();
    for (const id of removing) {
      const keys = tokenKeys(edits, id);
      const final = replacement.get(id);
      if (keys.some((key) => fixed.has(key))) newlyKept.set(id, KEPT_FIXED);
      else if (
        !final &&
        input.aliases.tokens.some((alias) => keys.includes(alias.$ref))
      )
        newlyKept.set(id, KEPT_ALIAS);
      else if (
        input.components.components.some((component) =>
          component.assignments.some((assignment) => {
            const entry = assignment.$ref
              ? input.componentTokens.find(
                  (item) => item.id === assignment.$ref,
                )
              : undefined;
            if (!entry?.browserId || !sameToken(entry.browserId, id))
              return false;
            return (
              !(
                final &&
                componentSwap(input.componentTokens, entry, final, sameToken)
              ) && !!entry.outputError
            );
          }),
        )
      )
        newlyKept.set(id, KEPT_COMPONENT);
      else if (
        !final &&
        (uses.get(id) ?? []).some((use) => {
          const value = before.get(use.context)?.get(id);
          return !value || !!value.validationError;
        })
      )
        newlyKept.set(id, KEPT_VALUE);
    }
    if (newlyKept.size) {
      for (const [id, reason] of newlyKept) kept.set(id, reason);
      continue;
    }

    plan = rewriteUses(input, removing, replacement, uses, before, scaleTokens);
    const failures = verify(input, plan, contextList, before, keyToToken);
    if (!failures.size) {
      plan.kept = [...kept].map(([id, reason]) => ({ id, reason }));
      return plan;
    }
    for (const [id, reason] of failures) kept.set(id, reason);
  }
  return {
    ...empty,
    kept: candidates.map((id) => ({
      id,
      reason: kept.get(id) ?? "Its uses couldn't be updated safely.",
    })),
  };
}

function rewriteUses(
  input: TokenRemovalInput,
  removing: readonly string[],
  replacement: ReadonlyMap<string, string | undefined>,
  uses: ReadonlyMap<string, TokenUse[]>,
  before: ReadonlyMap<string, ReadonlyMap<string, BrowserToken>>,
  scaleTokens: ReadonlySet<string>,
): TokenRemovalPlan {
  const edits = structuredClone(input.edits);
  let repointed = 0;
  let hardCoded = 0;
  const editFor = (id: string): BrowserTokenEdit => {
    const edit = (edits[id] ??= { values: {} });
    edit.authoring ??= { assignments: {} };
    return edit;
  };
  const literal = (id: string, context: string) =>
    literalAssignment(before.get(context)!.get(id)!);

  for (const id of removing) {
    const final = replacement.get(id);
    const groups = new Map<string, TokenUse[]>();
    for (const use of uses.get(id) ?? []) {
      const slotKey = `${use.consumerId}\n${use.slot.kind === "manual" ? "" : use.slot.key}\n${use.slot.kind}`;
      groups.set(slotKey, [...(groups.get(slotKey) ?? []), use]);
    }
    for (const group of groups.values()) {
      const [{ consumerId, slot, generatedValue }] = group;
      const authoring = editFor(consumerId).authoring!;
      if (final) {
        if (slot.kind === "manual") authoring.manual!.targetId = final;
        else {
          authoring.assignments[slot.key] = {
            kind: "reference",
            targetId: final,
          };
          if (slot.generated)
            (authoring.baselines ??= {})[slot.key] = generatedValue;
        }
        repointed += 1;
        continue;
      }
      const key = slot.kind === "manual" ? ROOT_CONTEXT : slot.key;
      if (slot.kind === "manual") delete authoring.manual!.targetId;
      const base = group.find((use) => use.context === key) ?? group[0];
      const baseValue = literal(id, base.context);
      const writes: [string, TokenAssignment][] = [[key, baseValue]];
      for (const use of group) {
        if (use.context === key) continue;
        const value = literal(id, use.context);
        if (JSON.stringify(value) !== JSON.stringify(baseValue))
          writes.push([use.context, value]);
      }
      for (const [context, value] of writes) {
        authoring.assignments[context] = value;
        if (slot.kind === "assignment" && slot.generated)
          (authoring.baselines ??= {})[context] =
            group.find((use) => use.context === context)?.generatedValue ??
            generatedValue;
      }
      hardCoded += writes.length;
    }
  }

  const removed = new Set(removing);
  const keyToToken = new Map(
    removing.flatMap((id) =>
      tokenKeys(input.edits, id).map((key) => [key, id] as const),
    ),
  );
  for (const [id, edit] of Object.entries(edits)) {
    const ids = edit.authoring?.lifecycle?.replacementIds;
    if (removed.has(id) || !ids?.some((item) => keyToToken.has(item))) continue;
    edit.authoring!.lifecycle!.replacementIds = [
      ...new Set(
        ids.flatMap((item) => {
          const target = keyToToken.get(item);
          if (!target) return [item];
          const final = replacement.get(target);
          return final ? [final] : [];
        }),
      ),
    ];
  }
  for (const id of removing) {
    if (scaleTokens.has(id)) continue;
    if (edits[id]?.authoring?.manual) delete edits[id];
    else edits[id] = { ...(edits[id] ?? { values: {} }), removed: true };
  }

  const aliases: AliasDocument = {
    ...input.aliases,
    tokens: input.aliases.tokens.map((alias) => {
      const target = keyToToken.get(alias.$ref);
      const final = target && replacement.get(target);
      if (!final) return alias;
      repointed += 1;
      return { ...alias, $ref: final };
    }),
  };

  const sameToken = tokenMatcher(input.edits);
  const entries = new Map(
    input.componentTokens.map((entry) => [entry.id, entry]),
  );
  const components: ComponentsDocument = {
    ...input.components,
    components: input.components.components.map((component) => ({
      ...component,
      assignments: component.assignments.map((assignment) => {
        const entry = assignment.$ref
          ? entries.get(assignment.$ref)
          : undefined;
        const target =
          entry?.browserId &&
          removing.find((id) => sameToken(entry.browserId!, id));
        if (!entry || !target) return assignment as ComponentAssignment;
        const final = replacement.get(target);
        const swap =
          final &&
          componentSwap(input.componentTokens, entry, final, sameToken);
        if (swap) {
          repointed += 1;
          return { ...assignment, $ref: swap.id } as ComponentAssignment;
        }
        hardCoded += 1;
        const next: Record<string, unknown> = {
          ...assignment,
          value: structuredClone(entry.value) as LiteralValue,
        };
        delete next.$ref;
        return next as unknown as ComponentAssignment;
      }),
    })),
  };

  return {
    edits,
    aliases,
    components,
    removed: [...removing],
    kept: [],
    repointed,
    hardCoded,
  };
}

/** Tokens that newly fail to resolve after the rewrite, mapped to the deleted token they used. */
function verify(
  input: TokenRemovalInput,
  plan: TokenRemovalPlan,
  contexts: readonly string[],
  before: ReadonlyMap<string, ReadonlyMap<string, BrowserToken>>,
  keyToToken: ReadonlyMap<string, string>,
) {
  const after = resolveAll(input, plan.edits, contexts);
  const failures = new Map<string, string>();
  for (const [context, tokens] of after) {
    for (const token of tokens.values()) {
      const previous = before.get(context)?.get(token.id);
      if (!token.validationError || !previous || previous.validationError)
        continue;
      const target =
        (previous.referenceId && keyToToken.get(previous.referenceId)) ||
        plan.removed[0];
      failures.set(
        target,
        `Updating ${token.name} would break it: ${token.validationError}`,
      );
    }
  }
  return failures;
}

/** Follows a deprecated term's replacement past other deprecated terms. */
export function finalTermReplacement(
  document: TaxonomyDocument,
  termId: string,
): string | undefined {
  const seen = new Set<string>();
  let current = document.terms.find((term) => term.id === termId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const next = document.terms.find(
      (term) => term.id === current!.lifecycle?.replacedBy,
    );
    if (!next) return undefined;
    if (!isDeprecated(next)) return next.id;
    current = next;
  }
  return undefined;
}

/**
 * Replaces every string equal to `from` (values and object keys) with `to`.
 * The `skip` object is copied unchanged. String arrays that gain duplicates
 * are de-duplicated. Returns the copy and how many uses changed.
 */
export function replaceIdDeep<T>(
  value: T,
  from: string,
  to: string,
  skip?: unknown,
): { value: T; count: number } {
  let count = 0;
  const walk = (item: unknown): unknown => {
    if (item === skip) return item;
    if (item === from) {
      count += 1;
      return to;
    }
    if (Array.isArray(item)) {
      const before = count;
      const next = item.map(walk);
      return count > before && next.every((entry) => typeof entry === "string")
        ? [...new Set(next)]
        : next;
    }
    if (item && typeof item === "object") {
      const next: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(item)) {
        if (key === from && !(to in item)) {
          count += 1;
          next[to] = walk(entry);
        } else next[key] = walk(entry);
      }
      return next;
    }
    return item;
  };
  return { value: walk(value) as T, count };
}
