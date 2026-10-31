// Copyright 2026 Adobe. All rights reserved.
import {
  projectClassification,
  type Classification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { assertShadowValue } from "../design-data/shadowValue";
import type { CanonicalAliasRow } from "./aliasTargets";
import {
  parseBrowserTokenValue,
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserToken,
  type BrowserTokenEdits,
} from "./browserModel";
import type { TokenAssignment, TokenAuthoring } from "./browserEditTypes";
import {
  compatibleTokenTypes,
  literalAssignment,
  modePairs,
  shadowText,
} from "./tokenAssignments";

export interface TokenDialogDraft {
  tokenId: string;
  modeKey: string;
  assignments: Record<string, TokenAssignment | null>;
  classification?: Classification;
  description: string;
  deprecated: boolean;
  deprecatedComment: string;
  replacementIds: string[];
  aliases: { id: string; classification: Classification }[];
}

export function createDialogDraft(
  token: BrowserToken,
  modeKey: string,
): TokenDialogDraft {
  return {
    tokenId: token.id,
    modeKey,
    assignments: {},
    classification: token.classificationOverride,
    description: token.description,
    deprecated: token.status === "deprecated",
    deprecatedComment: token.lifecycle?.deprecatedComment ?? "",
    replacementIds: [...(token.lifecycle?.replacementIds ?? [])],
    aliases: [],
  };
}

export function dialogRowsForMode(
  rows: readonly CanonicalAliasRow[],
  modeKey: string,
): CanonicalAliasRow[] {
  const selected = new Map(modePairs(modeKey));
  const found = new Map<string, CanonicalAliasRow>();
  for (const row of rows) {
    if (
      !modePairs(row.context).every(
        ([axis, mode]) => selected.get(axis) === mode,
      )
    )
      continue;
    const previous = found.get(row.token.id);
    if (
      !previous ||
      modePairs(row.context).length > modePairs(previous.context).length
    )
      found.set(row.token.id, row);
  }
  return [...found.values()];
}

function draftEdits(
  draft: TokenDialogDraft,
  edits: BrowserTokenEdits,
): BrowserTokenEdits {
  const next = structuredClone(edits);
  const edit = next[draft.tokenId] ?? { values: {} };
  const authoring: TokenAuthoring = edit.authoring ?? { assignments: {} };
  if (!draft.deprecated && authoring.lifecycle)
    delete authoring.lifecycle.frozen;
  if (!draft.deprecated) delete edit.status;
  for (const [key, assignment] of Object.entries(draft.assignments)) {
    if (assignment) authoring.assignments[key] = assignment;
    else {
      delete authoring.assignments[key];
      delete edit.values[key];
    }
  }
  if (draft.classification) authoring.classification = draft.classification;
  else delete authoring.classification;
  edit.description = draft.description;
  edit.authoring = authoring;
  next[draft.tokenId] = edit;
  return next;
}

export function resolveDialogTokens(
  rows: readonly CanonicalAliasRow[],
  edits: BrowserTokenEdits,
  taxonomy: TaxonomyDocument,
  modeKey: string,
  draft?: TokenDialogDraft,
): BrowserToken[] {
  const sources = dialogRowsForMode(rows, modeKey).map((row) => {
    const token = row.token.originalSource ?? row.token;
    if (
      draft &&
      Object.entries(draft.assignments).some(
        ([key, assignment]) =>
          assignment === null &&
          modePairs(key).every(
            ([axis, mode]) => new Map(modePairs(modeKey)).get(axis) === mode,
          ),
      )
    ) {
      if (token.id === draft.tokenId)
        return {
          ...token,
          value: token.generatedValue,
          legacyOverridden: false,
          resolvedValue: undefined,
          valueOverridden: false,
          referenceId: token.manual
            ? edits[token.id]?.authoring?.manual?.targetId
            : token.semantic && "$ref" in token.semantic.token
              ? token.semantic.target.nativeId
              : undefined,
          literalShadows: undefined,
        };
    }
    return token;
  });
  return projectBrowserTokens(
    resolveBrowserTokens(
      sources,
      draft ? draftEdits(draft, edits) : edits,
      modeKey,
      { includeManual: true },
    ),
    taxonomy,
  );
}

export function validateDialogAssignment(
  token: BrowserToken,
  assignment: TokenAssignment,
) {
  if (assignment.kind === "reference") return;
  if (token.type === "elevation") {
    if (!assignment.shadows)
      throw new Error("Edit a complete shadow using its layers.");
    assertShadowValue(assignment.shadows);
    if (assignment.value !== shadowText(assignment.shadows))
      throw new Error("The shadow value does not match its layers.");
  } else {
    parseBrowserTokenValue(
      {
        ...token,
        alias: undefined,
        semantic: undefined,
        displayUnit: undefined,
      },
      String(assignment.value),
    );
  }
}

export function commitDialogDraft(
  draft: TokenDialogDraft,
  rows: readonly CanonicalAliasRow[],
  edits: BrowserTokenEdits,
  taxonomy: TaxonomyDocument,
): BrowserTokenEdits {
  const original = rows.find((row) => row.token.id === draft.tokenId)?.token;
  if (!original) throw new Error("The selected token is no longer available.");
  if (original.alias)
    throw new Error("Compatibility aliases cannot be edited.");
  if (
    !Object.keys(draft.assignments).length &&
    !draft.aliases.length &&
    draft.description === original.description &&
    draft.deprecated === (original.status === "deprecated") &&
    draft.deprecatedComment === (original.lifecycle?.deprecatedComment ?? "") &&
    JSON.stringify(draft.replacementIds) ===
      JSON.stringify(original.lifecycle?.replacementIds ?? []) &&
    JSON.stringify(draft.classification) ===
      JSON.stringify(original.classificationOverride) &&
    (!draft.deprecated || original.lifecycle?.frozen)
  )
    return edits;
  if (
    original.status === "deprecated" &&
    draft.deprecated &&
    Object.keys(draft.assignments).length
  )
    throw new Error("Deprecated token values cannot be edited.");
  const next = draftEdits(draft, edits);
  const edit = next[draft.tokenId];
  const authoring = edit.authoring!;
  authoring.baselines ??= {};
  for (const [key, assignment] of Object.entries(draft.assignments)) {
    if (assignment) {
      const source = rows.find(
        (row) => row.token.id === draft.tokenId && row.context === key,
      );
      authoring.baselines[key] =
        source?.token.generatedValue ?? original.generatedValue;
    } else delete authoring.baselines[key];
  }
  if (draft.deprecated) edit.status = "deprecated";
  else delete edit.status;
  const contexts = [
    ...new Set(
      rows
        .filter((row) => row.token.id === draft.tokenId)
        .map((row) => row.context),
    ),
  ];
  for (const [key, assignment] of Object.entries(draft.assignments)) {
    if (
      !contexts.some((context) => {
        const selected = new Map(modePairs(context));
        return modePairs(key).every(
          ([axis, mode]) => selected.get(axis) === mode,
        );
      })
    )
      throw new Error(
        "This value uses modes that are no longer supported by the token.",
      );
    if (assignment) validateDialogAssignment(original, assignment);
  }
  const lifecycle = {
    ...authoring.lifecycle,
    deprecatedComment: draft.deprecatedComment,
    replacementIds: [...new Set(draft.replacementIds)],
  };
  if (!draft.deprecated) {
    delete lifecycle.frozen;
    delete lifecycle.deprecatedIn;
    lifecycle.replacementIds = [];
  }
  if (
    draft.deprecated &&
    lifecycle.replacementIds.length > 1 &&
    !lifecycle.deprecatedComment.trim()
  )
    throw new Error("Explain when to use each replacement token.");
  for (const alias of draft.aliases) {
    if (next[alias.id] || rows.some((row) => row.token.id === alias.id))
      throw new Error("This alias identity already exists.");
    if (original.type === "motion")
      throw new Error("Motion tokens are not supported yet.");
    next[alias.id] = {
      values: {},
      authoring: {
        assignments: { "[]": { kind: "reference", targetId: draft.tokenId } },
        classification: alias.classification,
        manual: {
          type: original.type,
          unit: original.unit,
          targetId: draft.tokenId,
          groupId: original.groupId,
          ...(original.semantic || original.classificationScope
            ? { scope: "structures" as const }
            : {}),
        },
      },
    };
  }
  const frozen: NonNullable<typeof lifecycle.frozen> = {};
  for (const key of contexts) {
    const tokens = resolveDialogTokens(rows, next, taxonomy, key);
    const token = tokens.find((candidate) => candidate.id === draft.tokenId);
    if (!token)
      throw new Error("This token is unavailable in one of its modes.");
    const assignment = authoring.assignments[key];
    if (assignment) validateDialogAssignment(token, assignment);
    const changed = tokens.filter(
      (item) =>
        item.id === draft.tokenId ||
        draft.aliases.some((alias) => alias.id === item.id),
    );
    for (const item of changed)
      if (item.validationError || item.projection?.issues.length)
        throw new Error(
          item.validationError ?? item.projection!.issues.join(" "),
        );
    for (const id of lifecycle.replacementIds) {
      const replacement = tokens.find((item) => item.id === id);
      if (
        !replacement ||
        replacement.validationError ||
        replacement.id === token.id ||
        !compatibleTokenTypes(token, replacement)
      )
        throw new Error(
          "Choose an available, compatible replacement other than this token.",
        );
      const reachesOriginal = (
        id: string,
        visited = new Set<string>(),
      ): boolean => {
        if (id === token.id) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        const current = tokens.find((item) => item.id === id);
        return (
          !!current &&
          [
            ...(current.referenceId ? [current.referenceId] : []),
            ...(current.lifecycle?.replacementIds ?? []),
          ].some((next) => reachesOriginal(next, visited))
        );
      };
      if (reachesOriginal(replacement.id))
        throw new Error("Replacement references form a cycle.");
    }
    frozen[key] = literalAssignment(token);
  }
  if (draft.deprecated && !lifecycle.frozen) lifecycle.frozen = frozen;
  authoring.lifecycle = lifecycle;
  if (
    !draft.deprecated &&
    !lifecycle.introduced &&
    !lifecycle.deprecatedIn &&
    !lifecycle.deprecatedComment &&
    !lifecycle.replacementIds.length
  )
    delete authoring.lifecycle;
  if (!Object.keys(authoring.baselines ?? {}).length)
    delete authoring.baselines;
  if (!draft.description) delete edit.description;
  if (
    !Object.keys(authoring.assignments).length &&
    !authoring.manual &&
    !authoring.classification &&
    !authoring.lifecycle
  )
    delete edit.authoring;
  if (Object.keys(edit).length === 1 && !Object.keys(edit.values).length)
    delete next[draft.tokenId];
  return next;
}

export function dialogClassification(
  token: BrowserToken,
  classification: Classification | undefined,
  taxonomy: TaxonomyDocument,
) {
  return projectClassification(
    taxonomy,
    classification ??
      token.taxonomySource?.governed ??
      token.projection?.classification ??
      {},
    token.semantic || token.classificationScope === "structures"
      ? "structures"
      : token.type === "motion"
        ? "size"
        : token.type,
  );
}

export function tokenComponentUsage(
  tokenId: string,
  rows: readonly CanonicalAliasRow[],
  components: readonly {
    id: string;
    declaration: { displayName: string };
    assignments: readonly { id: string; $ref?: string }[];
  }[],
  catalog: readonly { id: string; browserId?: string }[] = [],
) {
  const edges = new Map<string, Set<string>>();
  const connect = (from: string, to: string) => {
    const set = edges.get(from) ?? new Set<string>();
    set.add(to);
    edges.set(from, set);
  };
  for (const row of rows) {
    connect(row.rowId, row.token.id);
    connect(row.id, row.token.id);
    if (row.token.referenceId) connect(row.token.id, row.token.referenceId);
  }
  for (const token of catalog)
    if (token.browserId) connect(token.id, token.browserId);
  const reaches = (id: string, visited = new Set<string>()): boolean => {
    if (id === tokenId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return [...(edges.get(id) ?? [])].some((target) =>
      reaches(target, visited),
    );
  };
  return components.flatMap((component) => {
    const ids = new Set(
      component.assignments
        .filter((row) => row.$ref && reaches(row.$ref))
        .map((row) => row.id),
    );
    return ids.size
      ? [
          {
            id: component.id,
            label: component.declaration.displayName,
            count: ids.size,
          },
        ]
      : [];
  });
}
