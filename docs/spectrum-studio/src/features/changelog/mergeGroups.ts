// Copyright 2026 Adobe. All rights reserved.
import type { ChangeGroup } from "./changes";
import type { AuthoringComparison } from "./registry";
import type { TokenComparison } from "./tokenComparison";
import { sameValue, type SourcePath } from "./contract";

export function mergeChangeGroups(
  authored: AuthoringComparison,
  comparison?: TokenComparison,
): ChangeGroup[] {
  const groups = authored.groups.map((group) => ({
    ...group,
    items: [...group.items],
  }));
  if (!comparison) return groups;
  let tokenGroup = groups.find((group) => group.id === "tokens");
  if (!tokenGroup) {
    tokenGroup = { id: "tokens", label: "Tokens", count: 0, items: [] };
    groups.push(tokenGroup);
  }
  const represented = comparison.items.flatMap((item) =>
    item.fields.flatMap((field) => (field.address ? [field.address.path] : [])),
  );
  const covers = (address: SourcePath, path: SourcePath) =>
    address.length <= path.length &&
    address.every((part, index) => sameValue(part, path[index]));
  tokenGroup.items = tokenGroup.items.flatMap((item) => {
    if (item.sourceKind === "compatibility-alias") return [item];
    const fields = item.fields.filter(
      (field) =>
        !field.address ||
        !represented.some((address) => covers(address, field.address!.path)),
    );
    return fields.length ? [{ ...item, fields }] : [];
  });
  tokenGroup.items.push(...comparison.items);
  tokenGroup.count = tokenGroup.items.reduce(
    (count, item) => count + item.fields.length,
    0,
  );
  return groups.filter((group) => group.items.length);
}
