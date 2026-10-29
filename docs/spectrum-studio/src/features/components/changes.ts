// Copyright 2026 Adobe. All rights reserved.
import type { ChangeItem } from "../changelog/changes";
import { canonicalJson } from "../design-data/canonicalJson";
import type { ComponentsDocument } from "./model";

export function componentChanges(
  current: ComponentsDocument,
  baseline: ComponentsDocument,
): ChangeItem[] {
  const before = new Map(
    baseline.components.map((component) => [component.id, component]),
  );
  const after = new Map(
    current.components.map((component) => [component.id, component]),
  );
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((id) => {
    const original = before.get(id),
      latest = after.get(id);
    const fields: ChangeItem["fields"] = [];
    const comparisons: [string, unknown, unknown][] = [
      [
        "Display name",
        original?.declaration.displayName,
        latest?.declaration.displayName,
      ],
      ["Machine name", original?.declaration.name, latest?.declaration.name],
      [
        "Description",
        original?.declaration.description,
        latest?.declaration.description,
      ],
      ["Metadata", original?.declaration.meta, latest?.declaration.meta],
      ["Parts", original?.declaration.anatomy, latest?.declaration.anatomy],
      ["Options", original?.declaration.options, latest?.declaration.options],
      ["Option order", original?.optionOrder, latest?.optionOrder],
      ["States", original?.declaration.states, latest?.declaration.states],
      ["Property assignments", original?.assignments, latest?.assignments],
    ];
    for (const [key, left, right] of comparisons)
      if (canonicalJson(left) !== canonicalJson(right)) {
        fields.push({
          key,
          ...(left !== undefined && {
            before: typeof left === "string" ? left : canonicalJson(left),
          }),
          ...(right !== undefined && {
            after: typeof right === "string" ? right : canonicalJson(right),
          }),
        });
      }
    return fields.length
      ? [
          {
            id,
            topic: "components" as const,
            sourceKind: "component" as const,
            kind: !original
              ? ("new" as const)
              : !latest
                ? ("removed" as const)
                : ("modified" as const),
            title:
              latest?.declaration.displayName ??
              original!.declaration.displayName,
            fields,
          },
        ]
      : [];
  });
}
