// Copyright 2026 Adobe. All rights reserved.
import type { BrowserToken } from "../tokens/browserModel";
import type { TaxonomyProjection } from "./model";
export interface TaxonomyTreeItem {
  id: string;
  label: string;
  token?: BrowserToken;
  segment?: TaxonomyProjection["segments"][number];
  children: TaxonomyTreeItem[];
}
export function taxonomyTokenTree(tokens: BrowserToken[]): TaxonomyTreeItem[] {
  const roots: TaxonomyTreeItem[] = [];
  const unresolved: TaxonomyTreeItem = {
    id: "taxonomy:unresolved",
    label: "Unresolved classification",
    children: [],
  };
  const aliases: TaxonomyTreeItem = {
    id: "taxonomy:aliases",
    label: "Compatibility aliases",
    children: [],
  };
  for (const token of tokens) {
    if (token.alias) {
      aliases.children.push({
        id: token.id,
        label: token.name,
        token,
        children: [],
      });
      continue;
    }
    if (!token.projection || token.projection.issues.length) {
      unresolved.children.push({
        id: token.id,
        label: token.name,
        token,
        children: [],
      });
      continue;
    }
    let children = roots;
    const ancestry: [string, string[]][] = [];
    for (const segment of token.projection.segments) {
      ancestry.push([segment.categoryId, segment.termIds]);
      const id = `taxonomy:${JSON.stringify(ancestry)}`;
      let branch = children.find((item) => item.id === id);
      if (!branch) {
        branch = {
          id,
          label: `${segment.categoryName}: ${segment.values.join(", ")}`,
          segment,
          children: [],
        };
        children.push(branch);
      }
      children = branch.children;
    }
    children.push({ id: token.id, label: token.name, token, children: [] });
  }
  if (unresolved.children.length) roots.push(unresolved);
  if (aliases.children.length) roots.push(aliases);
  return roots;
}
