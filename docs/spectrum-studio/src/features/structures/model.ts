// Copyright 2026 Adobe. All rights reserved.
import { tokenUuid } from "../tokens/model";
import {
  authoringReferencePattern,
  type PrimitiveReferenceFamily,
} from "../tokens/primitiveIdentity";
import {
  taxonomyIdPattern,
  type Classification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import {
  STRUCTURE_CATEGORY_IDS as categories,
  STRUCTURE_TERM_IDS as terms,
} from "./vocabulary";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import {
  SIZE_TERM_IDS,
  VARIANT_CATEGORY_IDS,
} from "../taxonomy/variantVocabulary";
import {
  assertElementTaxonomy,
  elementBindingId,
  elementMetricAllowed,
  elementSlots,
  isStructureElement,
  ELEMENT_CATEGORY_ID,
} from "./elements";
import {
  assertStructureGraph,
  isStructureInstance,
  isLeaf,
  leafElements,
  type StructureChild,
} from "./children";
import { typographyReferenceCoordinates } from "../tokens/primitiveIdentity";
import type { TypographyDocument } from "../typography/model";
import { structureVariantIssues, type StructureEditorData } from "./variants";
import { classificationIssues } from "../option-groups/model";

export interface StructureRuleApplication {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  id: string;
  ruleId: string;
  targets: { kind: "all" } | { kind: "custom"; bindingIds: string[] };
  previewTargets?: { kind: "all" } | { kind: "custom"; bindingIds: string[] };
}
export interface StructureGeneration {
  nameRef?: TaxonomyNameReference;
  sizeTermIds: string[];
  applications: StructureRuleApplication[];
}

export type SizingPreset = "hug" | "fill";
export type StructureLiteral =
  | { kind: "sizing"; preset: SizingPreset }
  | { kind: "term"; termId: string };
interface BindingIdentity {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  id: string;
  classification: Classification;
}
export interface StructureReferenceBinding extends BindingIdentity {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  $ref: string;
}
export interface StructureLiteralBinding extends BindingIdentity {
  value: StructureLiteral;
}
export type StructureBinding =
  | StructureReferenceBinding
  | StructureLiteralBinding;
export type StructureSelection = { $ref: string } | { value: StructureLiteral };
export interface Structure {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  conceptId: string;
  name: string;
  properties: StructureBinding[];
  generation?: StructureGeneration;
  elements?: StructureChild[];
  description?: string;
  editor?: StructureEditorData;
}
export interface StructuresDocument {
  /** Earlier versions are accepted for lossless migration. */
  schemaVersion: 1 | 2 | 3 | 4 | 5;
  structures: Structure[];
}
export const STRUCTURES_SCHEMA_VERSION = 5;
export const EMPTY_STRUCTURES: StructuresDocument = {
  schemaVersion: STRUCTURES_SCHEMA_VERSION,
  structures: [],
};
export function structureGeneration(structure: Structure): StructureGeneration {
  return (
    structure.generation ?? { sizeTermIds: [SIZE_TERM_IDS.m], applications: [] }
  );
}

interface SlotDefinition {
  label: string;
  classification: Classification;
  family?: PrimitiveReferenceFamily;
  presets?: boolean;
  termIds?: readonly string[];
}
const sizing = (
  label: string,
  property: string,
  constraint?: string,
): SlotDefinition => ({
  label,
  family: "size",
  presets: true,
  classification: {
    [categories.property]: property,
    ...(constraint && { [categories.constraint]: constraint }),
  },
});
const side = (
  label: string,
  property: string,
  position: string,
  family: PrimitiveReferenceFamily,
): SlotDefinition => ({
  label,
  family,
  classification: {
    [categories.property]: property,
    [categories.position]: position,
  },
});
export const STRUCTURE_SLOTS = {
  width: sizing("Width", terms.width),
  height: sizing("Height", terms.height),
  minWidth: sizing("Minimum width", terms.width, terms.minimum),
  minHeight: sizing("Minimum height", terms.height, terms.minimum),
  maxWidth: sizing("Maximum width", terms.width, terms.maximum),
  maxHeight: sizing("Maximum height", terms.height, terms.maximum),
  horizontal: {
    label: "Horizontal alignment",
    classification: {
      [categories.property]: terms.position,
      [categories.axis]: terms.horizontal,
    },
    termIds: [terms.left, terms.center, terms.right],
  },
  vertical: {
    label: "Vertical alignment",
    classification: {
      [categories.property]: terms.position,
      [categories.axis]: terms.vertical,
    },
    termIds: [terms.top, terms.middle, terms.bottom],
  },
  direction: {
    label: "Direction",
    classification: { [categories.property]: terms.direction },
    termIds: [terms.horizontal, terms.vertical],
  },
  gap: {
    label: "Gap",
    family: "spacing",
    classification: { [categories.property]: terms.gap },
  },
  paddingTop: side("Top padding", terms.padding, terms.top, "spacing"),
  paddingRight: side("Right padding", terms.padding, terms.right, "spacing"),
  paddingBottom: side("Bottom padding", terms.padding, terms.bottom, "spacing"),
  paddingLeft: side("Left padding", terms.padding, terms.left, "spacing"),
  radiusTopLeft: side(
    "Top left corner radius",
    terms.radius,
    terms.topLeft,
    "radius",
  ),
  radiusTopRight: side(
    "Top right corner radius",
    terms.radius,
    terms.topRight,
    "radius",
  ),
  radiusBottomRight: side(
    "Bottom right corner radius",
    terms.radius,
    terms.bottomRight,
    "radius",
  ),
  radiusBottomLeft: side(
    "Bottom left corner radius",
    terms.radius,
    terms.bottomLeft,
    "radius",
  ),
  elevation: {
    label: "Elevation",
    family: "elevation",
    classification: { [categories.property]: terms.elevation },
  },
} satisfies Record<string, SlotDefinition>;
export type StructureSlot = keyof typeof STRUCTURE_SLOTS;
export const STRUCTURE_SLOT_KEYS = Object.keys(
  STRUCTURE_SLOTS,
) as StructureSlot[];
const definition = (slot: StructureSlot): SlotDefinition =>
  STRUCTURE_SLOTS[slot];
export const structureSlotDefinition = definition;
const requiredSlots: StructureSlot[] = [
  "width",
  "height",
  "horizontal",
  "vertical",
];
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const fields = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

export function structureSlot(binding: {
  classification: Readonly<Record<string, unknown>>;
}): StructureSlot | undefined {
  return STRUCTURE_SLOT_KEYS.find((slot) => {
    const expected = definition(slot).classification;
    return (
      Object.keys(binding.classification).length ===
        Object.keys(expected).length &&
      Object.entries(expected).every(
        ([category, term]) => binding.classification[category] === term,
      )
    );
  });
}
export function structureBindingId(conceptId: string, slot: StructureSlot) {
  const identity = Object.entries(definition(slot).classification).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return tokenUuid(
    `structure-slot:v1:${conceptId}:${JSON.stringify(identity)}`,
  );
}
export function structureBinding(structure: Structure, slot: StructureSlot) {
  return structure.properties.find(
    (binding) => structureSlot(binding) === slot,
  );
}
export function structureSelection(
  structure: Structure,
  slot: StructureSlot,
): StructureSelection | null {
  const binding = structureBinding(structure, slot);
  return !binding
    ? null
    : "$ref" in binding
      ? { $ref: binding.$ref }
      : { value: binding.value };
}
function isSelection(value: Record<string, unknown>, slot: StructureSlot) {
  if ("$ref" in value === "value" in value) return false;
  const spec = definition(slot);
  if ("$ref" in value)
    return (
      !!spec.family &&
      typeof value.$ref === "string" &&
      authoringReferencePattern.test(value.$ref)
    );
  const literal = value.value;
  if (!record(literal)) return false;
  if (literal.kind === "sizing")
    return (
      spec.presets &&
      fields(literal, ["kind", "preset"]) &&
      (literal.preset === "hug" || literal.preset === "fill")
    );
  return (
    literal.kind === "term" &&
    fields(literal, ["kind", "termId"]) &&
    typeof literal.termId === "string" &&
    spec.termIds?.includes(literal.termId)
  );
}
function isStructureEditorData(value: unknown): value is StructureEditorData {
  if (
    !record(value) ||
    !fields(value, [
      "properties",
      "visibility",
      "visibilityBindings",
      "overrides",
      "semanticIdentities",
    ]) ||
    !Array.isArray(value.properties) ||
    !record(value.visibility) ||
    !record(value.visibilityBindings) ||
    !record(value.overrides)
  )
    return false;
  const identity = (id: unknown) =>
    typeof id === "string" && taxonomyIdPattern.test(id);
  if (
    value.semanticIdentities !== undefined &&
    (!record(value.semanticIdentities) ||
      !Object.entries(value.semanticIdentities).every(
        ([optionId, entries]) =>
          identity(optionId) &&
          record(entries) &&
          Object.values(entries).every(
            (entry) =>
              record(entry) &&
              fields(entry, ["conceptId", "rows"]) &&
              identity(entry.conceptId) &&
              record(entry.rows) &&
              Object.values(entry.rows).every(identity),
          ),
      ))
  )
    return false;
  const classification = (input: unknown) =>
    record(input) &&
    Object.entries(input).every(
      ([key, assigned]) =>
        identity(key) &&
        (typeof assigned === "string"
          ? identity(assigned)
          : Array.isArray(assigned) && assigned.every(identity)),
    );
  if (
    !Object.values(value.visibility).every(
      (visible) => typeof visible === "boolean",
    )
  )
    return false;
  if (
    !Object.values(value.visibilityBindings).every(
      (binding) =>
        record(binding) &&
        fields(binding, ["propertyId", "inverted"]) &&
        identity(binding.propertyId) &&
        typeof binding.inverted === "boolean",
    )
  )
    return false;
  if (
    !value.properties.every((property) => {
      if (
        !record(property) ||
        !identity(property.id) ||
        typeof property.name !== "string" ||
        !property.name.trim()
      )
        return false;
      if (property.kind === "boolean")
        return (
          fields(property, ["id", "kind", "name", "defaultValue"]) &&
          typeof property.defaultValue === "boolean"
        );
      return (
        property.kind === "variant" &&
        fields(property, [
          "id",
          "kind",
          "name",
          "classification",
          "defaultOptionId",
          "options",
        ]) &&
        classification(property.classification) &&
        identity(property.defaultOptionId) &&
        Array.isArray(property.options) &&
        property.options.length > 0 &&
        property.options.every(
          (option) =>
            record(option) &&
            fields(option, ["id", "name", "classification"]) &&
            identity(option.id) &&
            typeof option.name === "string" &&
            !!option.name.trim() &&
            classification(option.classification),
        )
      );
    })
  )
    return false;
  return Object.values(value.overrides).every((override) => {
    if (
      !record(override) ||
      !fields(override, ["slots", "order", "visibility", "elements"])
    )
      return false;
    if (
      override.slots !== undefined &&
      (!record(override.slots) ||
        !Object.entries(override.slots).every(
          ([slot, selected]) =>
            STRUCTURE_SLOT_KEYS.includes(slot as StructureSlot) &&
            (selected === null ||
              (record(selected) &&
                fields(selected, ["$ref", "value"]) &&
                isSelection(selected, slot as StructureSlot))),
        ))
    )
      return false;
    if (
      override.order !== undefined &&
      (!Array.isArray(override.order) || !override.order.every(identity))
    )
      return false;
    if (
      override.visibility !== undefined &&
      (!record(override.visibility) ||
        !Object.values(override.visibility).every(
          (visible) => typeof visible === "boolean",
        ))
    )
      return false;
    return (
      override.elements === undefined ||
      (record(override.elements) &&
        Object.values(override.elements).every(isStructureElement))
    );
  });
}
export function isStructuresDocument(
  value: unknown,
): value is StructuresDocument {
  if (
    !record(value) ||
    !fields(value, ["schemaVersion", "structures"]) ||
    ![1, 2, 3, 4, STRUCTURES_SCHEMA_VERSION].includes(
      Number(value.schemaVersion),
    ) ||
    !Array.isArray(value.structures)
  )
    return false;
  const ids = new Set<string>();
  const applications = new Set<string>();
  for (const structure of value.structures) {
    if (
      !record(structure) ||
      !fields(structure, [
        "conceptId",
        "name",
        "properties",
        "generation",
        "elements",
        "description",
        "editor",
      ]) ||
      typeof structure.conceptId !== "string" ||
      !taxonomyIdPattern.test(structure.conceptId) ||
      ids.has(structure.conceptId) ||
      typeof structure.name !== "string" ||
      !structure.name.trim() ||
      structure.name !== structure.name.trim() ||
      !Array.isArray(structure.properties)
    )
      return false;
    ids.add(structure.conceptId);
    if (
      structure.description !== undefined &&
      typeof structure.description !== "string"
    )
      return false;
    if (
      structure.editor !== undefined &&
      !isStructureEditorData(structure.editor)
    )
      return false;
    const properties = structure.properties;
    if (structure.elements !== undefined) {
      if (!Array.isArray(structure.elements)) return false;
      for (const element of structure.elements) {
        if (
          (!isStructureElement(element) && !isStructureInstance(element)) ||
          ids.has(element.id)
        )
          return false;
        ids.add(element.id);
      }
    }
    const slots = new Set<StructureSlot>();
    for (const binding of structure.properties) {
      if (
        !record(binding) ||
        !fields(binding, ["id", "classification", "$ref", "value"]) ||
        !record(binding.classification)
      )
        return false;
      const slot = structureSlot({ classification: binding.classification });
      if (
        !slot ||
        slots.has(slot) ||
        binding.id !== structureBindingId(structure.conceptId, slot) ||
        !isSelection(binding, slot)
      )
        return false;
      slots.add(slot);
    }
    if (requiredSlots.some((slot) => !slots.has(slot))) return false;
    if (Number(value.schemaVersion) >= 4 && !slots.has("direction"))
      return false;
    if (structure.generation !== undefined) {
      const generation = structure.generation;
      if (
        !record(generation) ||
        !fields(generation, ["nameRef", "sizeTermIds", "applications"]) ||
        !Array.isArray(generation.sizeTermIds) ||
        generation.sizeTermIds.length === 0 ||
        new Set(generation.sizeTermIds).size !==
          generation.sizeTermIds.length ||
        generation.sizeTermIds.some(
          (id) => typeof id !== "string" || !taxonomyIdPattern.test(id),
        ) ||
        !Array.isArray(generation.applications)
      )
        return false;
      if (
        generation.nameRef !== undefined &&
        (!record(generation.nameRef) ||
          !fields(generation.nameRef, ["categoryId", "termId"]) ||
          ![VARIANT_CATEGORY_IDS.structure, ELEMENT_CATEGORY_ID].includes(
            String(generation.nameRef.categoryId),
          ) ||
          typeof generation.nameRef.termId !== "string" ||
          !taxonomyIdPattern.test(generation.nameRef.termId))
      )
        return false;
      if (
        !generation.nameRef &&
        generation.applications.some(
          (application) =>
            record(application) &&
            record(application.targets) &&
            (application.targets.kind === "all"
              ? properties.some(
                  (binding) => record(binding) && "$ref" in binding,
                )
              : Array.isArray(application.targets.bindingIds) &&
                application.targets.bindingIds.length > 0),
        )
      )
        return false;
      for (const application of generation.applications) {
        if (
          !record(application) ||
          !fields(application, ["id", "ruleId", "targets", "previewTargets"]) ||
          typeof application.id !== "string" ||
          !taxonomyIdPattern.test(application.id) ||
          applications.has(application.id) ||
          typeof application.ruleId !== "string" ||
          !application.ruleId.trim() ||
          !record(application.targets)
        )
          return false;
        applications.add(application.id);
        const preview = application.previewTargets;
        if (preview !== undefined) {
          if (!record(preview)) return false;
          if (preview.kind === "all") {
            if (!fields(preview, ["kind"])) return false;
          } else if (
            preview.kind !== "custom" ||
            !fields(preview, ["kind", "bindingIds"]) ||
            !Array.isArray(preview.bindingIds) ||
            new Set(preview.bindingIds).size !== preview.bindingIds.length ||
            preview.bindingIds.some(
              (id) =>
                !(structure.elements as StructureChild[] | undefined)?.some(
                  (element) =>
                    isLeaf(element) &&
                    elementSlots(element.kind).some(
                      (slot) => elementBindingId(element.id, slot) === id,
                    ),
                ),
            )
          )
            return false;
        }
        const targets = application.targets;
        if (targets.kind === "all") {
          if (!fields(targets, ["kind"])) return false;
        } else if (
          targets.kind !== "custom" ||
          !fields(targets, ["kind", "bindingIds"]) ||
          !Array.isArray(targets.bindingIds) ||
          (!targets.bindingIds.length && !preview) ||
          new Set(targets.bindingIds).size !== targets.bindingIds.length ||
          targets.bindingIds.some(
            (id) =>
              !STRUCTURE_SLOT_KEYS.some(
                (slot) =>
                  id ===
                  structureBindingId(structure.conceptId as string, slot),
              ),
          )
        )
          return false;
      }
    }
  }
  return true;
}
export function assertStructures(
  value: unknown,
): asserts value is StructuresDocument {
  if (!isStructuresDocument(value))
    throw new Error(
      "Invalid Structures: check names, stable identities, required properties, classifications, and exclusive token references or supported values.",
    );
}
export function structureTaxonomyAssignments(
  binding: StructureBinding,
): Classification {
  return {
    ...binding.classification,
    ...("value" in binding && binding.value.kind === "term"
      ? {
          [structureSlot(binding) === "direction"
            ? categories.axis
            : categories.position]: binding.value.termId,
        }
      : {}),
  };
}
export function assertStructureTaxonomy(
  document: StructuresDocument,
  taxonomy: TaxonomyDocument,
) {
  assertStructures(document);
  assertStructureGraph(document.structures);
  for (const structure of document.structures) {
    const optionIssues = [
      ...structureVariantIssues(structure),
      ...(structure.editor?.properties ?? []).flatMap((property) =>
        property.kind === "boolean"
          ? []
          : [
              ...classificationIssues(property.classification, taxonomy),
              ...property.options.flatMap((option) =>
                classificationIssues(option.classification, taxonomy),
              ),
            ],
      ),
    ];
    if (optionIssues.length) throw new Error(optionIssues.join(" "));
    for (const override of Object.values(structure.editor?.overrides ?? {}))
      assertElementTaxonomy(Object.values(override.elements ?? {}), taxonomy);
    assertElementTaxonomy(leafElements(structure), taxonomy);
    const generation = structureGeneration(structure);
    for (const termId of generation.sizeTermIds) {
      const category = taxonomy.categories.find(
        (item) => item.id === VARIANT_CATEGORY_IDS.size,
      );
      if (
        !category ||
        category.key !== "size" ||
        category.valueType !== "string" ||
        category.cardinality !== "one" ||
        !category.scopes.includes("structures") ||
        !taxonomy.terms.some(
          (term) => term.id === termId && term.categoryId === category.id,
        )
      ) {
        throw new Error(
          `${structure.name}: a generated size term is unavailable or incompatible.`,
        );
      }
    }
    if (generation.nameRef) {
      const category = taxonomy.categories.find(
        (item) => item.id === generation.nameRef!.categoryId,
      );
      if (
        !category ||
        !["structure", "element"].includes(category.key) ||
        category.valueType !== "string" ||
        category.cardinality !== "one" ||
        !category.scopes.includes("structures") ||
        !taxonomy.terms.some(
          (term) =>
            term.id === generation.nameRef!.termId &&
            term.categoryId === category.id &&
            typeof term.value === "string",
        )
      ) {
        throw new Error(
          `${structure.name}: its governed Structure name is unavailable or incompatible.`,
        );
      }
    }
    for (const binding of structure.properties) {
      const slot = structureSlot(binding)!;
      const assignments = structureTaxonomyAssignments(binding);
      for (const [categoryId, termId] of Object.entries(assignments)) {
        const category = taxonomy.categories.find(
          (item) => item.id === categoryId,
        );
        if (
          !category ||
          category.valueType !== "string" ||
          category.cardinality !== "one" ||
          !category.scopes.includes("structures") ||
          !taxonomy.terms.some(
            (term) => term.id === termId && term.categoryId === categoryId,
          )
        ) {
          throw new Error(
            `${structure.name} - ${definition(slot).label}: a referenced Registry term or category is unavailable or incompatible.`,
          );
        }
      }
    }
  }
}
export function assertStructureReferences(
  document: StructuresDocument,
  available: ReadonlyMap<string, PrimitiveReferenceFamily>,
  onlyFamily?: PrimitiveReferenceFamily,
  typography?: TypographyDocument,
) {
  assertStructures(document);
  for (const structure of document.structures) {
    for (const override of Object.values(structure.editor?.overrides ?? {})) {
      const option = assignStructure(
        { ...structure, editor: undefined },
        override.slots ?? {},
      );
      assertStructureReferences(
        {
          schemaVersion: STRUCTURES_SCHEMA_VERSION,
          structures: [
            {
              ...option,
              elements: (option.elements ?? []).map((child) =>
                isLeaf(child)
                  ? (override.elements?.[child.id] ?? child)
                  : child,
              ),
            },
          ],
        },
        available,
        onlyFamily,
        typography,
      );
    }
  }
  for (const structure of document.structures)
    for (const binding of structure.properties) {
      if (!("$ref" in binding)) continue;
      const slot = structureSlot(binding)!;
      const family = definition(slot).family;
      if (onlyFamily && family !== onlyFamily) continue;
      if (available.get(binding.$ref) !== family)
        throw new Error(
          `${structure.name} - ${definition(slot).label} uses a ${family} token that would be unavailable. Change its reference before removing the source or step.`,
        );
    }
  for (const structure of document.structures)
    for (const element of leafElements(structure))
      for (const binding of element.bindings) {
        const family = available.get(binding.$ref);
        if (onlyFamily && binding.family !== onlyFamily) continue;
        if (family !== binding.family)
          throw new Error(
            `${structure.name}: a template token source would be unavailable. Change its reference first.`,
          );
        const valid =
          binding.slot === "fontSize" || binding.slot === "lineHeight"
            ? family === "typography"
            : binding.slot === "size"
              ? family === "size" || family === "typography"
              : family === "size";
        if (!valid)
          throw new Error(
            `${structure.name}: a template element references an unavailable or incompatible token. Change its binding before removing the source.`,
          );
        if (
          binding.family === "typography" &&
          typography &&
          !elementMetricAllowed(
            binding.slot,
            typographyReferenceCoordinates(typography).get(binding.$ref)
              ?.metricId,
          )
        ) {
          throw new Error(
            `${structure.name}: the element's Typography metric is incompatible with this property.`,
          );
        }
      }
}
export function assignStructure(
  structure: Structure,
  changes: Partial<Record<StructureSlot, StructureSelection | null>>,
): Structure {
  const properties = STRUCTURE_SLOT_KEYS.flatMap((slot) => {
    const selected =
      slot in changes ? changes[slot] : structureSelection(structure, slot);
    return selected
      ? [
          {
            id: structureBindingId(structure.conceptId, slot),
            classification: { ...definition(slot).classification },
            ...selected,
          },
        ]
      : [];
  });
  const next = { ...structure, properties };
  assertStructures({
    schemaVersion: STRUCTURES_SCHEMA_VERSION,
    structures: [next],
  });
  return next;
}
export function createStructure(
  name: string,
  conceptId = crypto.randomUUID(),
): Structure {
  return assignStructure(
    {
      conceptId,
      name: name.trim(),
      properties: [],
      elements: [],
      generation: { sizeTermIds: [SIZE_TERM_IDS.m], applications: [] },
    },
    {
      width: { value: { kind: "sizing", preset: "hug" } },
      height: { value: { kind: "sizing", preset: "hug" } },
      horizontal: { value: { kind: "term", termId: terms.left } },
      vertical: { value: { kind: "term", termId: terms.top } },
      direction: { value: { kind: "term", termId: terms.horizontal } },
    },
  );
}
export function upgradeStructuresDocument(input: unknown): StructuresDocument {
  assertStructures(input);
  return {
    schemaVersion: STRUCTURES_SCHEMA_VERSION,
    structures: input.structures.map((source) => {
      const previousGeneration = structureGeneration(source);
      const normalized =
        input.schemaVersion < 5 && previousGeneration.sizeTermIds.length > 1
          ? {
              ...source,
              generation: {
                ...previousGeneration,
                sizeTermIds: Object.values(SIZE_TERM_IDS),
              },
            }
          : source;
      return assignStructure(normalized, {
        direction: structureSelection(source, "direction") ?? {
          value: { kind: "term", termId: terms.horizontal },
        },
      });
    }),
  };
}
