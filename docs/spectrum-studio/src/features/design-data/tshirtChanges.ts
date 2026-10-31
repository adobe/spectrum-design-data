// Copyright 2026 Adobe. All rights reserved.
import type { ChangeItem } from "../changelog/changes";
import type { TokenImpactRecord } from "../impact/model";
import type { TshirtArtifactBundle, TshirtSemanticRow } from "./tshirtTypes";
import { canonicalJson } from "./canonicalJson";
import { formatTshirtName } from "./tshirtProfile";
import { shadowValuePreview, sourceValuePreview } from "../tokens/valuePreview";

function semanticValuePreview(row: TshirtSemanticRow) {
  if (row.target.shadows) return shadowValuePreview(row.target.shadows);
  return sourceValuePreview({
    value: row.target.value,
    type: row.target.family === "color" ? "colors" : row.target.family,
    groupId: row.target.metricId ?? row.structureId,
    unit: row.target.unit === "px" ? "px" : "",
    semantic: row,
  });
}

const resolvedValue = (row: TshirtSemanticRow) =>
  canonicalJson(row.target.shadows ?? row.target.value);
const representation = (row: TshirtSemanticRow) =>
  "$ref" in row.token ? "Alias" : "Generated literal";
const rowsByConcept = (bundle: TshirtArtifactBundle) => {
  const groups = new Map<string, TshirtSemanticRow[]>();
  for (const row of bundle.semantics)
    groups.set(row.conceptId, [...(groups.get(row.conceptId) ?? []), row]);
  return groups;
};

export function tshirtTokenChanges(
  before: TshirtArtifactBundle,
  after: TshirtArtifactBundle,
): ChangeItem[] {
  const original = rowsByConcept(before),
    current = rowsByConcept(after);
  return [...new Set([...original.keys(), ...current.keys()])].flatMap((id) => {
    const left = original.get(id) ?? [],
      right = current.get(id) ?? [];
    const fields: ChangeItem["fields"] = [];
    const oldName = left[0]
        ? (left[0].canonicalName ?? formatTshirtName(left[0].token.name))
        : undefined,
      newName = right[0]
        ? (right[0].canonicalName ?? formatTshirtName(right[0].token.name))
        : undefined;
    if (oldName !== newName)
      fields.push({
        key: "Name",
        before: oldName,
        after: newName,
        generated: true,
      });
    const oldRows = new Map(left.map((row) => [row.token.uuid, row])),
      newRows = new Map(right.map((row) => [row.token.uuid, row]));
    for (const uuid of new Set([...oldRows.keys(), ...newRows.keys()])) {
      const old = oldRows.get(uuid),
        next = newRows.get(uuid);
      const context = canonicalJson(next?.context ?? old!.context);
      for (const [label, previous, latest] of [
        [
          "Output",
          old ? representation(old) : undefined,
          next ? representation(next) : undefined,
        ],
        ["Alias", old?.token.$ref, next?.token.$ref],
        [
          "Resolved value",
          old ? resolvedValue(old) : undefined,
          next ? resolvedValue(next) : undefined,
        ],
      ])
        if (previous !== latest)
          fields.push({
            key: `${label} (${context})`,
            before: previous,
            after: latest,
            generated: true,
            ...(label === "Resolved value" &&
              old && { beforePreview: semanticValuePreview(old) }),
            ...(label === "Resolved value" &&
              next && { afterPreview: semanticValuePreview(next) }),
          });
    }
    return fields.length
      ? [
          {
            id,
            conceptId: id,
            topic: "tokens" as const,
            sourceKind: "semantic-token" as const,
            kind: !left.length
              ? ("new" as const)
              : !right.length
                ? ("removed" as const)
                : ("modified" as const),
            title: newName ?? oldName!,
            fields,
          },
        ]
      : [];
  });
}

export function tshirtTokenImpactRecords(
  saved: TshirtArtifactBundle,
  shipped: TshirtArtifactBundle,
): TokenImpactRecord[] {
  const baseline = rowsByConcept(shipped);
  return [...rowsByConcept(saved)].map(([tokenId, rows]) => {
    const before = baseline.get(tokenId) ?? [];
    const byRow = new Map(before.map((row) => [row.token.uuid, row]));
    return {
      tokenId,
      tier: "semantic",
      category: "structures",
      modeValues: rows.map((row) => ({
        valueId: row.token.uuid,
        changed:
          !byRow.has(row.token.uuid) ||
          resolvedValue(row) !== resolvedValue(byRow.get(row.token.uuid)!),
      })),
      nameChanged:
        !before.length ||
        (rows[0].canonicalName ?? formatTshirtName(rows[0].token.name)) !==
          (before[0].canonicalName ?? formatTshirtName(before[0].token.name)),
      metadataChanged: rows.some(
        (row) =>
          !byRow.has(row.token.uuid) ||
          representation(row) !== representation(byRow.get(row.token.uuid)!),
      ),
      referenceChanged:
        before.length > 0 &&
        rows.some(
          (row) =>
            byRow.has(row.token.uuid) &&
            row.token.$ref !== byRow.get(row.token.uuid)!.token.$ref,
        ),
      referenceAssessment:
        before.length && rows.every((row) => byRow.has(row.token.uuid))
          ? "assessed"
          : "unavailable",
      manuallyOverridden: false,
    };
  });
}
