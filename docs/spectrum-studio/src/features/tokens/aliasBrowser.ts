// Copyright 2026 Adobe. All rights reserved.
import type { AliasDocument } from "./aliases";
import { aliasTargetsForContext } from "./aliases";
import type { CanonicalAliasRow } from "./aliasTargets";
import type { BrowserToken } from "./browserModel";
import { sourceValuePreview } from "./valuePreview";

export function aliasBrowserTokens(
  document: AliasDocument,
  rows: readonly CanonicalAliasRow[],
  selection: Record<string, string>,
  live: readonly BrowserToken[] = [],
): BrowserToken[] {
  return document.tokens.flatMap((alias) => {
    const context = alias.contexts.find((context) =>
      (JSON.parse(context) as [string, string][]).every(
        ([axis, mode]) => selection[axis] === mode,
      ),
    );
    const target =
      context === undefined
        ? undefined
        : aliasTargetsForContext(rows, alias.$ref, context)[0];
    if (!target || target.name.toLowerCase() === alias.name.toLowerCase())
      return [];
    const resolved =
      live.find((token) => token.id === target.token.id) ?? target.token;
    return [
      {
        ...resolved,
        id: alias.id,
        name: alias.name,
        generatedName: alias.name,
        semantic: undefined,
        groupId: "compatibility-aliases",
        groupLabel: "Compatibility aliases",
        taxonomySource: undefined,
        projection: undefined,
        valuePreview: sourceValuePreview(resolved),
        alias: { ...alias, targetName: target.name },
        description: `References ${target.name}.`,
        nameOverridden: false,
        valueOverridden: false,
        stale: false,
      },
    ];
  });
}
