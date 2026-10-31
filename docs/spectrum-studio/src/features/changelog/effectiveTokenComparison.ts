// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import {
  canonicalAliasRows,
  completeAliasSource,
  type CanonicalAliasRow,
} from "../tokens/aliasTargets";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { sourceValuePreview } from "../tokens/valuePreview";
import { tokenValueText } from "../tokens/browserModel";
import { modePairs } from "../tokens/tokenAssignments";
import type { TokenComparison } from "./tokenComparison";
import type { AuthoringComparison } from "./registry";
import type { ChangeField } from "./changes";
import { sameValue } from "./contract";

const inventories = new WeakMap<EditSessionSnapshot, CanonicalAliasRow[]>();
function inventory(snapshot: EditSessionSnapshot) {
  const cached = inventories.get(snapshot);
  if (cached) return cached;
  const rows = canonicalAliasRows(
    completeAliasSource(snapshot),
    buildTshirtArtifacts(snapshot),
    "preserve-for-review",
  );
  inventories.set(snapshot, rows);
  return rows;
}

export function hasEffectiveTokenEdits(...snapshots: EditSessionSnapshot[]) {
  return snapshots.some((snapshot) =>
    Object.values(snapshot.browserTokenEdits ?? {}).some(
      (edit) => edit.authoring,
    ),
  );
}

export function compareEffectiveTokens(
  shipped: EditSessionSnapshot,
  working: EditSessionSnapshot,
  authored: AuthoringComparison,
  semantic: boolean,
): TokenComparison {
  const group = (snapshot: EditSessionSnapshot) => {
    const result = new Map<string, Map<string, CanonicalAliasRow>>();
    for (const row of inventory(snapshot).filter(
      (row) => !!row.token.semantic === semantic,
    )) {
      const contexts =
        result.get(row.token.id) ?? new Map<string, CanonicalAliasRow>();
      contexts.set(row.context, row);
      result.set(row.token.id, contexts);
    }
    return result;
  };
  const before = group(shipped),
    after = group(working);
  const result: TokenComparison = { items: [], records: [] };
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const left = before.get(id),
      right = after.get(id);
    const original = left?.values().next().value?.token;
    const latest = right?.values().next().value?.token;
    const token = latest ?? original!;
    const edit = working.browserTokenEdits?.[id];
    const fields: ChangeField[] = [];
    for (const [label, property, a, b] of [
      ["Name", "classification", original?.name, latest?.name],
      [
        "Description",
        "description",
        original?.description,
        latest?.description,
      ],
      ["Status", "status", original?.status, latest?.status],
      [
        "Classification",
        "classification",
        original?.projection?.classification,
        latest?.projection?.classification,
      ],
      ["Lifecycle", "lifecycle", original?.lifecycle, latest?.lifecycle],
    ] as const) {
      if (sameValue(a, b)) continue;
      const nested = property === "classification" || property === "lifecycle";
      const expected = nested ? edit?.authoring?.[property] : edit?.[property];
      fields.push({
        id: property === "classification" ? label : property,
        key: label,
        before: typeof a === "object" ? JSON.stringify(a) : a,
        after: typeof b === "object" ? JSON.stringify(b) : b,
        ...(expected !== undefined && {
          address: {
            path: nested
              ? ["browserTokenEdits", id, "authoring", property]
              : ["browserTokenEdits", id, property],
            expected,
          },
        }),
      });
    }
    const modeValues = [];
    let manuallyOverridden = false,
      referenceChanged = false;
    for (const context of new Set([
      ...(left?.keys() ?? []),
      ...(right?.keys() ?? []),
    ])) {
      const old = left?.get(context)?.token,
        next = right?.get(context)?.token;
      const changed = !sameValue(
        old?.literalShadows ?? old?.value,
        next?.literalShadows ?? next?.value,
      );
      modeValues.push({ valueId: `${id}:${context}`, changed });
      manuallyOverridden ||= !!next?.valueOverridden;
      const reference = old?.referenceId !== next?.referenceId;
      referenceChanged ||= reference;
      const selected = new Map(modePairs(context));
      const assignmentKey = Object.keys(edit?.authoring?.assignments ?? {})
        .filter((key) =>
          modePairs(key).every(([axis, mode]) => selected.get(axis) === mode),
        )
        .sort((a, b) => modePairs(b).length - modePairs(a).length)[0];
      const address =
        assignmentKey === undefined
          ? undefined
          : {
              path: [
                "browserTokenEdits",
                id,
                "authoring",
                "assignments",
                assignmentKey,
              ],
              expected: edit!.authoring!.assignments[assignmentKey],
            };
      const label =
        modePairs(context)
          .map(([axisId, modeId]) => {
            const axis = working.modeSets.find((axis) => axis.id === axisId);
            return (
              axis?.modes.find((mode) => mode.id === modeId)?.name ?? modeId
            );
          })
          .join(" / ") || "Default";
      if (changed)
        fields.push({
          id: `value:${context}`,
          key: "Value",
          context: { key: context, label },
          before: old && tokenValueText(old),
          after: next && tokenValueText(next),
          generated: !next?.valueOverridden && !next?.lifecycle?.frozen,
          address,
          tokenValue: {
            tokenId: id,
            modeKey: context,
            shippedValue: old?.value,
          },
          ...(old && { beforePreview: sourceValuePreview(old) }),
          ...(next && { afterPreview: sourceValuePreview(next) }),
        });
      if (reference)
        fields.push({
          id: `reference:${context}`,
          key: "Reference",
          context: { key: context, label },
          before: old?.referenceName,
          after: next?.referenceName,
          address,
        });
      if (next?.valueOverridden && !old?.valueOverridden)
        fields.push({
          id: `override:${context}`,
          key: "Manual override",
          before: "No",
          after: "Yes",
          context: { key: context, label },
          address,
        });
    }
    result.records.push({
      tokenId: id,
      tier: semantic ? "semantic" : "primitive",
      category: semantic
        ? "structures"
        : token.type === "colors"
          ? "color"
          : token.type,
      modeValues,
      nameChanged: original?.name !== latest?.name,
      referenceChanged,
      metadataChanged:
        !sameValue(original?.lifecycle, latest?.lifecycle) ||
        original?.description !== latest?.description ||
        original?.status !== latest?.status ||
        !sameValue(
          original?.projection?.classification,
          latest?.projection?.classification,
        ),
      manuallyOverridden,
    });
    if (fields.length)
      result.items.push({
        id,
        conceptId: id,
        topic: "tokens",
        sourceKind: semantic ? "semantic-token" : "token",
        kind: !left
          ? "new"
          : !right
            ? "removed"
            : latest?.status === "deprecated" &&
                original?.status !== "deprecated"
              ? "deprecated"
              : "modified",
        title: token.name,
        fields,
        upstream: authored.groups.flatMap((group) =>
          group.items.flatMap((item) =>
            item.fields.flatMap((field) =>
              field.address?.path[0] === "browserTokenEdits" &&
              field.address.path[1] === id
                ? [
                    {
                      title: `${item.title} / ${field.key}`,
                      address: field.address,
                    },
                  ]
                : [],
            ),
          ),
        ),
      });
  }
  return result;
}
