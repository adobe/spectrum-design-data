// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyTreeItem } from "../../taxonomy/tree";
import type { BrowserToken } from "../browserModel";

export interface TokenTablePresentationRow {
  id: string;
  label: string;
  contextLabel: string;
  token?: BrowserToken;
  sourcePathIds: string[];
  children: TokenTablePresentationRow[];
}

export function compactTokenTableTree(
  items: TaxonomyTreeItem[],
): TokenTablePresentationRow[] {
  function compact(
    item: TaxonomyTreeItem,
    ancestors: string[],
  ): TokenTablePresentationRow {
    if (!item.segment) {
      return {
        id: item.id,
        label: item.label,
        contextLabel: item.token ? item.token.name : item.label,
        token: item.token,
        sourcePathIds: [item.id],
        children: item.children.map((child) => compact(child, ancestors)),
      };
    }

    let endpoint = item;
    const labels = [item.segment.values.join(", ")];
    const sourcePathIds = [item.id];
    while (
      !endpoint.token &&
      endpoint.children.length === 1 &&
      endpoint.children[0].segment
    ) {
      endpoint = endpoint.children[0];
      labels.push(endpoint.segment!.values.join(", "));
      sourcePathIds.push(endpoint.id);
    }

    const endpoints = endpoint.children.filter(
      (child) => child.token && !child.segment && child.children.length === 0,
    );
    const token =
      endpoint.token ??
      (endpoints.length === 1 ? endpoints[0].token : undefined);
    const label = labels.join(" ");
    const context = [...ancestors, label];
    return {
      id: token?.id ?? endpoint.id,
      label,
      contextLabel: context.join(" "),
      token,
      sourcePathIds,
      children: endpoint.children
        .filter((child) => child.token !== token || !token)
        .map((child) => compact(child, context)),
    };
  }

  return items.map((item) => compact(item, []));
}

export function isSelectableBrowserToken(token: BrowserToken): boolean {
  return !token.alias && !token.semantic;
}

export interface TokenTableSelectionIndex {
  rows: Map<string, Set<string>>;
  eligibleIds: Set<string>;
  parents: TokenTablePresentationRow[];
}

export function tokenTableSelectionIndex(
  items: TokenTablePresentationRow[],
): TokenTableSelectionIndex {
  const rows = new Map<string, Set<string>>();
  const parents: TokenTablePresentationRow[] = [];
  function visit(item: TokenTablePresentationRow): Set<string> {
    const ids = new Set<string>();
    if (item.token && isSelectableBrowserToken(item.token))
      ids.add(item.token.id);
    if (item.children.length) parents.push(item);
    for (const child of item.children)
      for (const id of visit(child)) ids.add(id);
    rows.set(item.id, ids);
    return ids;
  }
  const eligibleIds = new Set<string>();
  for (const item of items) for (const id of visit(item)) eligibleIds.add(id);
  return { rows, eligibleIds, parents };
}

export function tokenSelectionState(
  ids: ReadonlySet<string>,
  selected: ReadonlySet<string>,
) {
  let count = 0;
  for (const id of ids) if (selected.has(id)) count++;
  return {
    isSelected: ids.size > 0 && count === ids.size,
    isIndeterminate: count > 0 && count < ids.size,
    isDisabled: ids.size === 0,
  };
}

export function toggleTokenSelection(
  selected: ReadonlySet<string>,
  ids: ReadonlySet<string>,
  isSelected?: boolean,
): Set<string> {
  const next = new Set(selected);
  const select = isSelected ?? !tokenSelectionState(ids, selected).isSelected;
  for (const id of ids) {
    if (select) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function selectedTokenTableRows(
  index: TokenTableSelectionIndex,
  selected: ReadonlySet<string>,
): Set<string> {
  return new Set(
    [...index.rows]
      .filter(([, ids]) => tokenSelectionState(ids, selected).isSelected)
      .map(([id]) => id),
  );
}

export function resolveTokenTableSelection(
  keys: "all" | ReadonlySet<string>,
  index: TokenTableSelectionIndex,
  selected: ReadonlySet<string>,
): Set<string> {
  if (keys === "all")
    return toggleTokenSelection(selected, index.eligibleIds, true);
  const previous = selectedTokenTableRows(index, selected);
  let next = new Set(selected);
  for (const id of previous) {
    if (!keys.has(id))
      next = toggleTokenSelection(next, index.rows.get(id)!, false);
  }
  for (const id of keys) {
    if (!previous.has(id)) {
      const ids = index.rows.get(id);
      if (ids) next = toggleTokenSelection(next, ids, true);
    }
  }
  return next;
}
