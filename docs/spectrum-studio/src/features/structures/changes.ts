// Copyright 2026 Adobe. All rights reserved.
import type { ChangeItem } from "../changelog/changes";
import type { TaxonomyDocument } from "../taxonomy/model";
import {
  EMPTY_STRUCTURES,
  STRUCTURE_SLOT_KEYS,
  structureGeneration,
  structureSelection,
  structureSlotDefinition,
  type StructureSelection,
  type Structure,
  type StructuresDocument,
} from "./model";
import { canonicalJson } from "../design-data/canonicalJson";
import { structureName } from "./generation";
import { ELEMENT_SLOT_LABELS, ELEMENT_TYPES } from "./elements";
import { templateTargets } from "./elementResolution";
import { isLeaf, type StructureChild } from "./children";
const childLabel = (child: StructureChild) =>
  isLeaf(child) ? ELEMENT_TYPES[child.kind].label : "Structure instance";

export function structureFields(structure: Structure): Map<string, string> {
  const generation = structureGeneration(structure);
  return new Map([
    ["name", structure.name],
    ["nameRef", canonicalJson(generation.nameRef ?? null)],
    ["sizes", canonicalJson([...generation.sizeTermIds].sort())],
    [
      "elementOrder",
      canonicalJson((structure.elements ?? []).map((element) => element.id)),
    ],
    ...(structure.elements ?? []).flatMap((element) =>
      !isLeaf(element)
        ? ([[`element/${element.id}/structureId`, element.structureId]] as [
            string,
            string,
          ][])
        : ([
            [`element/${element.id}/type`, element.termId],
            [
              `element/${element.id}/glyph`,
              canonicalJson(element.glyph ?? null),
            ],
            [
              `element/${element.id}/orientation`,
              canonicalJson(element.orientation ?? null),
            ],
            ...element.bindings.map(
              (binding) =>
                [
                  `element/${element.id}/${binding.slot}`,
                  canonicalJson(binding),
                ] as [string, string],
            ),
          ] as [string, string][]),
    ),
    ...STRUCTURE_SLOT_KEYS.map(
      (slot) =>
        [slot, canonicalJson(structureSelection(structure, slot))] as [
          string,
          string,
        ],
    ),
    ...generation.applications.flatMap(
      (application) =>
        [
          [`application/${application.id}/rule`, application.ruleId],
          [
            `application/${application.id}/targets`,
            canonicalJson(
              application.targets.kind === "all"
                ? application.targets
                : {
                    kind: "custom",
                    bindingIds: [...application.targets.bindingIds].sort(),
                  },
            ),
          ],
          [
            `application/${application.id}/previewTargets`,
            canonicalJson(templateTargets(application)),
          ],
        ] as [string, string][],
    ),
  ]);
}

function describe(
  selection: StructureSelection | null,
  registry: TaxonomyDocument,
) {
  if (!selection) return undefined;
  if ("$ref" in selection) return `Token ${selection.$ref}`;
  if (selection.value.kind === "sizing")
    return selection.value.preset === "hug" ? "Hug" : "Fill";
  const id = selection.value.termId;
  return String(
    registry.terms.find((term) => term.id === id)?.value ??
      `Unavailable Position term (${id})`,
  );
}

export function structureChanges(
  current: StructuresDocument,
  registry: TaxonomyDocument,
  baseline: StructuresDocument = EMPTY_STRUCTURES,
): ChangeItem[] {
  const before = new Map(
    baseline.structures.map((structure) => [structure.conceptId, structure]),
  );
  const after = new Map(
    current.structures.map((structure) => [structure.conceptId, structure]),
  );
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((id) => {
    const original = before.get(id),
      latest = after.get(id);
    const fields: ChangeItem["fields"] = [];
    const originalName = original
        ? structureName(original, registry)
        : undefined,
      latestName = latest ? structureName(latest, registry) : undefined;
    if (originalName !== latestName)
      fields.push({ key: "Name", before: originalName, after: latestName });
    for (const slot of STRUCTURE_SLOT_KEYS) {
      const left = original ? structureSelection(original, slot) : null;
      const right = latest ? structureSelection(latest, slot) : null;
      if (JSON.stringify(left) !== JSON.stringify(right))
        fields.push({
          key: structureSlotDefinition(slot).label,
          before: describe(left, registry),
          after: describe(right, registry),
        });
    }
    const left = original ? structureGeneration(original) : null,
      right = latest ? structureGeneration(latest) : null;
    const previousElements = original?.elements ?? [],
      nextElements = latest?.elements ?? [];
    if (
      canonicalJson(previousElements.map((element) => element.id)) !==
      canonicalJson(nextElements.map((element) => element.id))
    ) {
      fields.push({
        key: "Element order",
        before: previousElements.map(childLabel).join(", "),
        after: nextElements.map(childLabel).join(", "),
      });
    }
    for (const elementId of new Set(
      [...previousElements, ...nextElements].map((element) => element.id),
    )) {
      const beforeElement = previousElements.find(
          (element) => element.id === elementId,
        ),
        afterElement = nextElements.find((element) => element.id === elementId);
      const element = afterElement ?? beforeElement!;
      const label = `${childLabel(element)} (${elementId})`;
      if (!beforeElement || !afterElement)
        fields.push({
          key: label,
          before: beforeElement ? "Present" : undefined,
          after: afterElement ? "Present" : undefined,
        });
      if (!isLeaf(element)) {
        const previous =
          beforeElement && !isLeaf(beforeElement)
            ? beforeElement.structureId
            : undefined;
        const next =
          afterElement && !isLeaf(afterElement)
            ? afterElement.structureId
            : undefined;
        if (previous !== next)
          fields.push({
            key: `${label} - Source`,
            before: previous,
            after: next,
          });
        continue;
      }
      const beforeLeaf =
          beforeElement && isLeaf(beforeElement) ? beforeElement : undefined,
        afterLeaf =
          afterElement && isLeaf(afterElement) ? afterElement : undefined;
      for (const metadata of ["glyph", "orientation"] as const)
        if (beforeLeaf?.[metadata] !== afterLeaf?.[metadata]) {
          fields.push({
            key: `${label} - ${metadata === "glyph" ? "Sample icon" : "Orientation"}`,
            before: beforeLeaf?.[metadata],
            after: afterLeaf?.[metadata],
          });
        }
      for (const slot of new Set(
        [...(beforeLeaf?.bindings ?? []), ...(afterLeaf?.bindings ?? [])].map(
          (binding) => binding.slot,
        ),
      )) {
        const beforeRef = beforeLeaf?.bindings.find(
            (binding) => binding.slot === slot,
          )?.$ref,
          afterRef = afterLeaf?.bindings.find(
            (binding) => binding.slot === slot,
          )?.$ref;
        if (beforeRef !== afterRef)
          fields.push({
            key: `${label} - ${ELEMENT_SLOT_LABELS[slot]}`,
            before: beforeRef,
            after: afterRef,
          });
      }
    }
    const sizes = (ids: string[] | undefined) =>
      ids
        ?.map((id) =>
          String(registry.terms.find((term) => term.id === id)?.value ?? id),
        )
        .join(", ");
    if (
      canonicalJson(left?.sizeTermIds ?? []) !==
      canonicalJson(right?.sizeTermIds ?? [])
    )
      fields.push({
        key: "Generate sizes",
        before: sizes(left?.sizeTermIds),
        after: sizes(right?.sizeTermIds),
      });
    if (
      canonicalJson(left?.nameRef ?? null) !==
      canonicalJson(right?.nameRef ?? null)
    )
      fields.push({
        key: "Token naming",
        before: left?.nameRef?.termId,
        after: right?.nameRef?.termId,
      });
    const applications = new Set(
      [...(left?.applications ?? []), ...(right?.applications ?? [])].map(
        (application) => application.id,
      ),
    );
    for (const applicationId of applications) {
      const before = left?.applications.find(
          (application) => application.id === applicationId,
        ),
        after = right?.applications.find(
          (application) => application.id === applicationId,
        );
      if (canonicalJson(before ?? null) !== canonicalJson(after ?? null))
        fields.push({
          key: `Generation application ${applicationId}`,
          before: before ? canonicalJson(before) : undefined,
          after: after ? canonicalJson(after) : undefined,
        });
    }
    return fields.length
      ? [
          {
            id,
            conceptId: id,
            topic: "structures" as const,
            sourceKind: "structure" as const,
            kind: !original
              ? ("new" as const)
              : !latest
                ? ("removed" as const)
                : ("modified" as const),
            title: latestName ?? originalName!,
            fields,
          },
        ]
      : [];
  });
}
