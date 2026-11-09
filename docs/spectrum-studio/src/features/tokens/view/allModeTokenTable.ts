// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../../modes/model";
import type { CanonicalAliasRow } from "../aliasTargets";
import { aliasBrowserTokens } from "../aliasBrowser";
import { EMPTY_ALIASES, type AliasDocument } from "../aliases";
import { filterBrowserTokens, type BrowserToken } from "../browserModel";
import { modePairs } from "../tokenAssignments";
import type { TokenPanelId } from "./tokenPanelRegistry";
import type { TokenTablePresentationRow } from "./tokenTablePresentation";

export function allModeTokenTableRows(
  rows: readonly CanonicalAliasRow[],
  modeSets: readonly ModeSet[],
  aliases: AliasDocument = EMPTY_ALIASES,
): TokenTablePresentationRow[] {
  const parents = new Map<string, TokenTablePresentationRow>();
  const add = (token: BrowserToken, context: string) => {
    let parent = parents.get(token.id);
    if (!parent) {
      parent = {
        id: JSON.stringify(["token", token.id]),
        label: token.name,
        contextLabel: token.name,
        token,
        sourcePathIds: [],
        children: [],
      };
      parents.set(token.id, parent);
    }
    const selection = new Map(modePairs(context));
    const label =
      modeSets
        .filter((set) => selection.has(set.id))
        .map((set) => {
          const id = selection.get(set.id);
          return `${set.name}: ${set.modes.find((mode) => mode.id === id)?.name ?? id}`;
        })
        .join(" / ") || "Default";
    parent.children.push({
      id: JSON.stringify(["token-mode", token.id, context]),
      label,
      contextLabel: `${token.name} / ${label}`,
      token,
      modeContext: context,
      sourcePathIds: [],
      children: [],
    });
  };
  for (const row of rows) add(row.token, row.context);
  for (const alias of aliases.tokens) {
    for (const context of alias.contexts) {
      const tokens = aliasBrowserTokens(
        { schemaVersion: 1, tokens: [{ ...alias, contexts: [context] }] },
        rows,
        Object.fromEntries(modePairs(context)),
      );
      for (const token of tokens) add(token, context);
    }
  }
  return [...parents.values()];
}

export function filterAllModeTokenTableRows(
  rows: TokenTablePresentationRow[],
  type: TokenPanelId | "all",
  query: string,
): TokenTablePresentationRow[] {
  return rows.filter(
    (row) =>
      filterBrowserTokens(
        row.children.flatMap((child) => (child.token ? [child.token] : [])),
        type,
        query,
      ).length > 0,
  );
}
