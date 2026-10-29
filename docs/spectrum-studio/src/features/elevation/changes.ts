// Copyright 2026 Adobe. All rights reserved.
import type { ChangeItem, ChangeField } from "../changelog/changes";
import type { ElevationDocument } from "./model";
import type { BrowserTokenSource } from "../tokens/browserModel";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { createValuePreview, sourceValuePreview } from "../tokens/valuePreview";

export function elevationFields(
  document: ElevationDocument,
): Map<string, unknown> {
  const fields = new Map<string, unknown>(
    ["name", "below", "above", "depth", "color", "hideFromPublishing"].map(
      (key) => [
        key,
        key === "hideFromPublishing"
          ? document.hideFromPublishing === true
          : document[key as keyof ElevationDocument],
      ],
    ),
  );
  fields.set(
    "layerOrder",
    document.layers.map((layer) => layer.id),
  );
  for (const layer of document.layers)
    for (const key of [
      "label",
      "scaleTypeId",
      "base",
      "scale",
      "opacity",
      "opacityTokenId",
      "manualOpacity",
    ] as const)
      fields.set(`layers/${layer.id}/${key}`, layer[key]);
  return fields;
}
export function elevationChanges(
  before: ElevationDocument,
  after: ElevationDocument,
): ChangeItem[] {
  const old = elevationFields(before),
    next = elevationFields(after);
  const fields: ChangeField[] = [
    ...new Set([...old.keys(), ...next.keys()]),
  ].flatMap((key) =>
    JSON.stringify(old.get(key)) === JSON.stringify(next.get(key))
      ? []
      : [
          {
            key,
            before: old.has(key) ? JSON.stringify(old.get(key)) : undefined,
            after: next.has(key) ? JSON.stringify(next.get(key)) : undefined,
            ...(key === "color" && {
              beforePreview: createValuePreview("shadow-color", before.color),
              afterPreview: createValuePreview("shadow-color", after.color),
            }),
          },
        ],
  );
  return fields.length
    ? [
        {
          id: after.id,
          topic: "foundations",
          sourceKind: "elevation",
          kind: "modified",
          title: "Elevation",
          fields,
        },
      ]
    : [];
}
export function elevationTokenChanges(
  combinations: readonly {
    modeKey: string;
    sources: BrowserTokenSource[];
    baseline: BrowserTokenSource[];
  }[],
  ownerIds: ReadonlySet<string>,
): ChangeItem[] {
  const items = new Map<string, ChangeItem>();
  const observed = new Set<string>();
  for (const combination of combinations) {
    const selection = Object.fromEntries(
      JSON.parse(combination.modeKey) as [string, string][],
    );
    const scope = canonicalTokenModeKey(
      Object.fromEntries(
        Object.entries(selection).filter(([axis]) => ownerIds.has(axis)),
      ),
    );
    const before = new Map(
      combination.baseline
        .filter((source) => source.type === "elevation")
        .map((source) => [source.id, source]),
    );
    const after = new Map(
      combination.sources
        .filter((source) => source.type === "elevation")
        .map((source) => [source.id, source]),
    );
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      if (observed.has(`${id}:${scope}`)) continue;
      observed.add(`${id}:${scope}`);
      const old = before.get(id),
        next = after.get(id);
      if (old?.value === next?.value && old?.name === next?.name) continue;
      const item = items.get(id) ?? {
        id,
        conceptId: id,
        topic: "tokens" as const,
        sourceKind: "token" as const,
        kind: !old
          ? ("new" as const)
          : !next
            ? ("removed" as const)
            : ("modified" as const),
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
          key: `Shadow value ${scope}`,
          before: old?.value === undefined ? undefined : String(old.value),
          after: next?.value === undefined ? undefined : String(next.value),
          generated: true,
          ...(old && { beforePreview: sourceValuePreview(old) }),
          ...(next && { afterPreview: sourceValuePreview(next) }),
        });
      items.set(id, item);
    }
  }
  return [...items.values()];
}
