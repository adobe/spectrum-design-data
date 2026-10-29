// Copyright 2026 Adobe. All rights reserved.
import type { ChangeField, ChangeItem } from "../changelog/changes";
import type { SourcePath } from "../changelog/contract";
import { createValuePreview, sourceValuePreview } from "../tokens/valuePreview";
import type { BrowserTokenSource } from "../tokens/browserModel";
import type { OpacityDocument } from "./model";

export function opacityFields(
  document?: OpacityDocument,
): Map<string, unknown> {
  const fields = new Map<string, unknown>();
  if (!document) return fields;
  fields.set("polarityCompensation", document.polarityCompensation);
  fields.set(
    "levelOrder",
    document.levels.map((level) => level.id),
  );
  for (const level of document.levels)
    fields.set(`levels/${level.id}/value`, level.value);
  return fields;
}

export function opacityChanges(
  before?: OpacityDocument,
  after?: OpacityDocument,
): ChangeItem[] {
  const old = opacityFields(before),
    next = opacityFields(after);
  const fields: ChangeField[] = [
    ...new Set([...old.keys(), ...next.keys()]),
  ].flatMap((key) => {
    if (JSON.stringify(old.get(key)) === JSON.stringify(next.get(key)))
      return [];
    const id = key.startsWith("levels/") ? key.split("/")[1] : undefined;
    const membership =
      id &&
      (!before?.levels.some((level) => level.id === id) ||
        !after?.levels.some((level) => level.id === id));
    const path: SourcePath =
      key === "levelOrder"
        ? ["opacity", "levels"]
        : id
          ? [
              "opacity",
              "levels",
              { key: "id", id },
              ...(membership ? [] : ["value"]),
            ]
          : ["opacity", key];
    const expected =
      key === "levelOrder"
        ? after?.levels
        : membership
          ? after?.levels.find((level) => level.id === id)
          : next.get(key);
    return [
      {
        key,
        before: old.has(key) ? JSON.stringify(old.get(key)) : undefined,
        after: next.has(key) ? JSON.stringify(next.get(key)) : undefined,
        address: {
          path,
          expected,
          ...(key === "levelOrder" && { collectionOrder: true }),
        },
        ...(typeof old.get(key) === "number" && {
          beforePreview: createValuePreview("opacity", old.get(key) as number),
        }),
        ...(typeof next.get(key) === "number" && {
          afterPreview: createValuePreview("opacity", next.get(key) as number),
        }),
      },
    ];
  });
  return fields.length
    ? [
        {
          id: "opacity",
          topic: "foundations",
          sourceKind: "opacity",
          kind: !before ? "new" : !after ? "removed" : "modified",
          title: "Opacity",
          fields,
          addresses: fields.flatMap((field) =>
            field.address ? [field.address] : [],
          ),
        },
      ]
    : [];
}

export function opacityTokenChanges(
  combinations: readonly {
    modeKey: string;
    sources: BrowserTokenSource[];
    baseline: BrowserTokenSource[];
  }[],
): ChangeItem[] {
  const items = new Map<string, ChangeItem>();
  const seen = new Set<string>();
  for (const combination of combinations) {
    const before = new Map(
      combination.baseline
        .filter((token) => token.type === "opacity")
        .map((token) => [token.id, token]),
    );
    const after = new Map(
      combination.sources
        .filter((token) => token.type === "opacity")
        .map((token) => [token.id, token]),
    );
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const old = before.get(id),
        next = after.get(id);
      const scope = next?.modeKey ?? old?.modeKey ?? "[]";
      const key = `${id}:${scope}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (old?.value === next?.value && old?.name === next?.name) continue;
      const item = items.get(id) ?? {
        id,
        conceptId: id,
        topic: "tokens",
        sourceKind: "token",
        kind: !old ? "new" : !next ? "removed" : "modified",
        title: next?.name ?? old!.name,
        fields: [],
      };
      if (
        old?.name !== next?.name &&
        !item.fields.some((field) => field.key === "Name")
      )
        item.fields.push({
          key: "Name",
          before: old?.name,
          after: next?.name,
          generated: true,
        });
      if (old?.value !== next?.value)
        item.fields.push({
          key: `Opacity value ${scope}`,
          before: old && `${Math.round(Number(old.value) * 100)}%`,
          after: next && `${Math.round(Number(next.value) * 100)}%`,
          generated: !next?.resolvedValue?.overridden,
          tokenValue: {
            tokenId: id,
            modeKey: combination.modeKey,
            shippedValue: old?.value,
          },
          ...(old && { beforePreview: sourceValuePreview(old) }),
          ...(next && { afterPreview: sourceValuePreview(next) }),
        });
      items.set(id, item);
    }
  }
  return [...items.values()];
}
