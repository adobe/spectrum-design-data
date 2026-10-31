// Copyright 2026 Adobe. All rights reserved.
import {
  isRule,
  isTshirtRule,
  type Rule,
  type TshirtSizingRule,
} from "../logic/model";
import { generatorSizeKey } from "../logic/generator";
import { ruleAppliesTo } from "../logic/applicability";
import { resolveTshirtRule } from "../logic/tshirt";
import { canonicalJson } from "../design-data/canonicalJson";
import { foundationNameSegment } from "../taxonomy/formatting";
import {
  assertTaxonomy,
  registerTerm,
  taxonomyValueKey,
  type Classification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { registeredSourceName } from "../taxonomy/naming";
import { VARIANT_CATEGORY_IDS } from "../taxonomy/variantVocabulary";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import {
  structureGeneration,
  structureSlot,
  structureSlotDefinition,
  STRUCTURE_SLOT_KEYS,
  structureBindingId,
  type Structure,
  type StructureReferenceBinding,
  type StructureRuleApplication,
  type StructureSlot,
} from "./model";
import { STRUCTURE_CATEGORY_IDS, STRUCTURE_TERM_IDS } from "./vocabulary";
import { leafElements } from "./children";

export interface AppliedStructureBinding {
  binding: StructureReferenceBinding;
  slot: StructureSlot;
  application: StructureRuleApplication;
  rule: TshirtSizingRule;
}
export interface StructureTokenGroup {
  classification: Classification;
  bindings: AppliedStructureBinding[];
  property: string;
  position?: string;
  orientation?: string;
}
export const structureSizes = (structure: Structure) =>
  structureGeneration(structure).sizeTermIds.map(generatorSizeKey);
export const eligibleStructureBindings = (structure: Structure) =>
  structure.properties.filter(
    (binding): binding is StructureReferenceBinding =>
      "$ref" in binding &&
      !!structureSlotDefinition(structureSlot(binding)!).family,
  );

export function structureName(
  structure: Structure,
  taxonomy: TaxonomyDocument,
) {
  void taxonomy;
  return structure.name;
}
export function structureTokenName(
  structure: Structure,
  taxonomy: TaxonomyDocument,
) {
  const reference = structureGeneration(structure).nameRef;
  return reference
    ? registeredSourceName(taxonomy, reference, "structures")
    : structure.name;
}
export function structureNameClassification(
  structure: Structure,
): Classification {
  const reference = structureGeneration(structure).nameRef;
  return reference ? { [reference.categoryId]: reference.termId } : {};
}

export function governStructureName(
  structure: Structure,
  taxonomy: TaxonomyDocument,
  name = structure.name,
  newTermId?: string,
) {
  const trimmed = name.trim();
  foundationNameSegment(trimmed);
  const generation = structureGeneration(structure);
  let next = taxonomy;
  let nameRef = generation.nameRef;
  if (!nameRef) {
    next = registerTerm(
      taxonomy,
      VARIANT_CATEGORY_IDS.structure,
      trimmed,
      newTermId ?? crypto.randomUUID(),
    );
    const term = next.terms.find(
      (term) =>
        term.categoryId === VARIANT_CATEGORY_IDS.structure &&
        taxonomyValueKey(term.value) === taxonomyValueKey(trimmed),
    );
    if (!term) throw new Error("Choose an available Structure term.");
    nameRef = { categoryId: VARIANT_CATEGORY_IDS.structure, termId: term.id };
  } else {
    registeredSourceName(next, nameRef, "structures");
    assertTaxonomy(next);
  }
  return {
    taxonomy: next,
    structure: { ...structure, generation: { ...generation, nameRef } },
  };
}

export function appliedStructureBindings(
  structure: Structure,
  rules: readonly Rule[],
): AppliedStructureBinding[] {
  const result: AppliedStructureBinding[] = [];
  const assigned = new Map<string, string>();
  for (const application of structureGeneration(structure).applications) {
    const rule = resolveTshirtRule(rules, application.ruleId);
    const bindings =
      application.targets.kind === "all"
        ? eligibleStructureBindings(structure)
        : application.targets.bindingIds.map((id) => {
            const binding = structure.properties.find((item) => item.id === id);
            if (!binding || !("$ref" in binding)) {
              const slot = STRUCTURE_SLOT_KEYS.find(
                (slot) => structureBindingId(structure.conceptId, slot) === id,
              );
              throw new Error(
                `${structure.name} - ${slot ? structureSlotDefinition(slot).label : "Custom target"}: no longer token-backed. Restore a token or edit/remove the application.`,
              );
            }
            return binding;
          });
    if (
      !bindings.length &&
      !application.previewTargets &&
      !(
        application.targets.kind === "all" &&
        leafElements(structure).some((element) => element.bindings.length)
      )
    ) {
      throw new Error(
        `${structure.name}: this application has no eligible token-backed properties. Assign a token or remove the application.`,
      );
    }
    for (const binding of bindings) {
      const previous = assigned.get(binding.id);
      const slot = structureSlot(binding)!;
      const family = structureSlotDefinition(slot).family;
      const active =
        !!family && family !== "typography" && ruleAppliesTo(rule, family);
      if (previous && active)
        throw new Error(
          `${structure.name} - ${structureSlotDefinition(slot).label}: applications overlap. Use disjoint custom targets or remove one application.`,
        );
      if (active) {
        assigned.set(binding.id, application.id);
        const inactive = result.findIndex(
          (item) => item.binding.id === binding.id,
        );
        if (inactive >= 0) result.splice(inactive, 1);
        result.push({ binding, slot, application, rule });
      } else if (!result.some((item) => item.binding.id === binding.id)) {
        result.push({ binding, slot, application, rule });
      }
    }
  }
  return result;
}

function equivalent(
  left: AppliedStructureBinding,
  right: AppliedStructureBinding,
) {
  const mapping = (rule: TshirtSizingRule) =>
    canonicalJson({
      movement: rule.movement,
      mappings: [...rule.mappings].sort((a, b) =>
        a.termId.localeCompare(b.termId),
      ),
      applicability: rule.applicability ?? { kind: "all" },
    });
  return (
    left.binding.$ref === right.binding.$ref &&
    mapping(left.rule) === mapping(right.rule)
  );
}
const physical: Partial<Record<StructureSlot, string>> = {
  paddingTop: "top",
  paddingRight: "right",
  paddingBottom: "bottom",
  paddingLeft: "left",
  radiusTopLeft: "top-left",
  radiusTopRight: "top-right",
  radiusBottomRight: "bottom-right",
  radiusBottomLeft: "bottom-left",
};
const properties: Partial<Record<StructureSlot, string>> = {
  width: "width",
  height: "height",
  minWidth: "min-width",
  minHeight: "min-height",
  maxWidth: "max-width",
  maxHeight: "max-height",
  gap: "gap",
  elevation: "shadow",
};
export function structureTokenGroups(
  structure: Structure,
  rules: readonly Rule[],
): StructureTokenGroup[] {
  const selected = appliedStructureBindings(structure, rules);
  const groups: StructureTokenGroup[] = [];
  const consumed = new Set<string>();
  const add = (
    bindings: AppliedStructureBinding[],
    property: string,
    orientation?: "horizontal" | "vertical",
  ) => {
    for (const item of bindings) consumed.add(item.binding.id);
    const classification = { ...bindings[0].binding.classification };
    if (bindings.length > 1)
      delete classification[STRUCTURE_CATEGORY_IDS.position];
    if (orientation)
      classification[STRUCTURE_CATEGORY_IDS.axis] =
        orientation === "horizontal"
          ? STRUCTURE_TERM_IDS.horizontal
          : STRUCTURE_TERM_IDS.vertical;
    groups.push({
      bindings,
      classification,
      property,
      ...(orientation && { orientation }),
      ...(bindings.length === 1 &&
        physical[bindings[0].slot] && { position: physical[bindings[0].slot] }),
    });
  };
  for (const slots of [
    ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
    [
      "radiusTopLeft",
      "radiusTopRight",
      "radiusBottomRight",
      "radiusBottomLeft",
    ],
  ] as const) {
    const members = slots.flatMap((slot) =>
      selected.filter((item) => item.slot === slot),
    );
    if (
      members.length === 4 &&
      members.every((item) => equivalent(members[0], item))
    )
      add(members, slots[0] === "paddingTop" ? "padding" : "corner-radius");
  }
  for (const [slots, orientation] of [
    [["paddingLeft", "paddingRight"], "horizontal"],
    [["paddingTop", "paddingBottom"], "vertical"],
  ] as const) {
    const members = slots.flatMap((slot) =>
      selected.filter(
        (item) => item.slot === slot && !consumed.has(item.binding.id),
      ),
    );
    if (members.length === 2 && equivalent(members[0], members[1]))
      add(members, "padding", orientation);
  }
  for (const item of selected.filter(
    (item) => !consumed.has(item.binding.id),
  )) {
    const property =
      properties[item.slot] ??
      (item.slot.startsWith("padding")
        ? "padding"
        : item.slot.startsWith("radius")
          ? "corner-radius"
          : undefined);
    if (!property) throw new Error("This property has no generation mapping.");
    add([item], property);
  }
  return groups;
}

export function assertGenerationReferences(
  structure: Structure,
  rules: readonly Rule[],
  references: readonly PrimitiveReference[],
) {
  for (const rule of rules)
    if (isTshirtRule(rule) && !isRule(rule))
      throw new Error("A T-shirt rule has invalid settings.");
  for (const item of appliedStructureBindings(structure, rules)) {
    const reference = references.find(
      (reference) => reference.id === item.binding.$ref,
    );
    if (
      !reference ||
      reference.family !== structureSlotDefinition(item.slot).family ||
      reference.error
    ) {
      throw new Error(
        `${structure.name} - ${structureSlotDefinition(item.slot).label}: ${reference?.error ?? "repair the unavailable or incompatible Medium token."}`,
      );
    }
  }
  for (const application of structureGeneration(structure).applications) {
    const rule = resolveTshirtRule(rules, application.ruleId);
    if (
      structureGeneration(structure).sizeTermIds.some(
        (id) => !rule.mappings.some((mapping) => mapping.termId === id),
      )
    )
      throw new Error(
        `${structure.name}: a selected Size option is not mapped by ${rule.name}. Add the option or choose a replacement.`,
      );
  }
}
