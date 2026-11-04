// Copyright 2026 Adobe. All rights reserved.
import {
  isStructuresDocument,
  structureBindingId,
  STRUCTURE_SLOT_KEYS,
  type Structure,
  type StructuresDocument,
  type StructureSlot,
} from "./model";
import { isLeaf } from "./children";
import {
  emptyStructureEditor,
  structureVariantIssues,
  type StructureLayoutConfiguration,
  type StructureOptionOverrides,
} from "./variants";
import { ownedLayoutAt, structureConfigurationIssues } from "./configuration";
import { termLabel } from "../taxonomy/termPresentation";
import { portableStructureIssues } from "./portableValidation";
import type { TaxonomyDocument } from "../taxonomy/model";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import type { OptionProperty } from "../option-groups/model";
import type { StructureChild } from "./children";
import type {
  PortableOption,
  PortableStructuresDocument,
  StructureCondition,
  StructureConfiguration,
  StructureExample,
  StructurePublication,
  StructureTarget,
} from "./portableModel";

export interface StructureContractIssue {
  structureId: string;
  message: string;
}

export type StructureContractResult<T> =
  | { status: "ready"; value: T }
  | { status: "unavailable"; issues: StructureContractIssue[] };

function term(taxonomy: TaxonomyDocument, reference: TaxonomyNameReference) {
  const category = taxonomy.categories.find(
    (item) => item.id === reference.categoryId,
  );
  const value = taxonomy.terms.find(
    (item) =>
      item.id === reference.termId && item.categoryId === reference.categoryId,
  );
  return category?.scopes.includes("structures") && value
    ? String(value.value)
    : undefined;
}

function portableOption(
  property: OptionProperty,
  taxonomy: TaxonomyDocument,
  categoryId: string | undefined,
): PortableOption {
  if (property.kind === "boolean") return structuredClone(property);
  const category = taxonomy.categories.find(
    (category) => category.id === categoryId,
  );
  return {
    id: property.id,
    kind: "variant",
    name: category ? { categoryId: category.id } : { name: property.name },
    classification: structuredClone(property.classification),
    defaultOptionId: property.defaultOptionId,
    values: property.options.map((option) => {
      const assigned = category && option.classification[category.id];
      const classification = structuredClone(option.classification);
      if (category) delete classification[category.id];
      return {
        id: option.id,
        name:
          category && typeof assigned === "string"
            ? { categoryId: category.id, termId: assigned }
            : { name: option.name },
        classification,
      };
    }),
  };
}

function sourceOption(
  property: PortableOption,
  taxonomy: TaxonomyDocument,
): OptionProperty {
  if (property.kind === "boolean") return structuredClone(property);
  const categoryId =
    "categoryId" in property.name ? property.name.categoryId : undefined;
  const category = taxonomy.categories.find((item) => item.id === categoryId);
  return {
    id: property.id,
    kind: "variant",
    name: category
      ? category.name
      : "name" in property.name
        ? property.name.name
        : "",
    ...(category && { categoryId: category.id }),
    classification: structuredClone(property.classification),
    defaultOptionId: property.defaultOptionId,
    options: property.values.map((option) => ({
      id: option.id,
      name:
        option.name.name !== undefined
          ? option.name.name
          : termLabel(term(taxonomy, option.name)!),
      classification: {
        ...structuredClone(option.classification),
        ...(option.name.categoryId !== undefined && {
          [option.name.categoryId]: option.name.termId,
        }),
      },
    })),
  };
}

/**
 * Caller supplies reviewed name bindings. Never registers terms, guesses an
 * existing generation name, allocates output identities or writes storage.
 */
export function toPortableStructures(
  document: StructuresDocument,
  taxonomy: TaxonomyDocument,
  names: Readonly<Record<string, TaxonomyNameReference>>,
  optionCategories: Readonly<Record<string, string>> = {},
): StructureContractResult<PortableStructuresDocument> {
  if (!isStructuresDocument(document))
    return {
      status: "unavailable",
      issues: [
        {
          structureId: "",
          message:
            "Structure assignments need valid references or finite, non-negative numeric values.",
        },
      ],
    };
  const issues: StructureContractIssue[] = [];
  for (const structure of document.structures) {
    const name = names[structure.conceptId] ?? structure.nameRef;
    if (
      (!name && !structure.parentStructureId) ||
      (name && term(taxonomy, name) === undefined)
    )
      issues.push({
        structureId: structure.conceptId,
        message:
          "Choose an available Registry name before migrating this Structure.",
      });
    for (const property of structure.editor?.properties ?? []) {
      const categoryId =
        optionCategories[property.id] ??
        (property.kind === "variant" ? property.categoryId : undefined);
      if (!categoryId) continue;
      if (
        property.kind !== "variant" ||
        !property.options.every((option) => {
          const termId = option.classification[categoryId];
          return (
            typeof termId === "string" &&
            term(taxonomy, { categoryId, termId }) !== undefined
          );
        })
      )
        issues.push({
          structureId: structure.conceptId,
          message:
            "An option category mapping does not match its Registry assignments.",
        });
    }
    for (const path of Object.keys(structure.editor?.layouts ?? {}))
      if (!ownedLayoutAt(structure, path, document.structures))
        issues.push({
          structureId: structure.conceptId,
          message: `Configuration targets an unavailable owned occurrence: ${path}.`,
        });
  }
  if (issues.length) return { status: "unavailable", issues };

  const publications: StructurePublication[] = [];
  const examples: StructureExample[] = [];
  const structures = document.structures.map((structure) => {
    const configuration: StructureConfiguration[] = [];
    const optionIds = new Map(
      (structure.editor?.properties ?? []).flatMap((property) =>
        property.kind === "variant"
          ? property.options.map((option) => [option.id, property.id] as const)
          : [],
      ),
    );
    const collect = (
      scope: StructureLayoutConfiguration,
      target: StructureTarget,
      source: Structure,
      sizes: StructureOptionOverrides["sizes"] = {},
    ) => {
      const add = (
        effect: StructureConfiguration["effect"],
        when?: StructureCondition,
      ) => {
        configuration.push({ target, ...(when && { when }), effect });
      };
      for (const [slot, termId] of Object.entries(sizes))
        add({
          kind: "size",
          bindingId: structureBindingId(
            source.conceptId,
            slot as StructureSlot,
          ),
          termId,
        });
      for (const [elementId, visible] of Object.entries(scope.visibility ?? {}))
        add({ kind: "visibility", elementId, visible });
      for (const [elementId, binding] of Object.entries(
        scope.visibilityBindings ?? {},
      ))
        add({
          kind: "visibilityBinding",
          elementId,
          optionId: binding.propertyId,
          inverted: binding.inverted,
        });
      for (const [valueId, override] of Object.entries(scope.overrides ?? {})) {
        const optionId = optionIds.get(valueId);
        if (!optionId) {
          issues.push({
            structureId: structure.conceptId,
            message: `Configuration references an unavailable option value: ${valueId}.`,
          });
          continue;
        }
        const when = { optionId, valueId };
        for (const [slot, selection] of Object.entries(override.slots ?? {}))
          add(
            {
              kind: "binding",
              bindingId: structureBindingId(
                source.conceptId,
                slot as StructureSlot,
              ),
              selection,
            },
            when,
          );
        for (const [slot, termId] of Object.entries(override.sizes ?? {}))
          add(
            {
              kind: "size",
              bindingId: structureBindingId(
                source.conceptId,
                slot as StructureSlot,
              ),
              termId,
            },
            when,
          );
        if (override.order)
          add({ kind: "order", elementIds: override.order }, when);
        for (const [elementId, visible] of Object.entries(
          override.visibility ?? {},
        ))
          add({ kind: "visibility", elementId, visible }, when);
        for (const [elementId, element] of Object.entries(
          override.elements ?? {},
        )) {
          // Keep complete imported snapshots, including intentional field removal.
          add(
            {
              kind: "elementFields",
              elementId,
              fields: {
                bindings: element.bindings,
                ...(element.orientation !== undefined && {
                  orientation: element.orientation,
                }),
                ...(element.name !== undefined && { name: element.name }),
              },
              unset: [
                ...(element.orientation === undefined
                  ? ["orientation" as const]
                  : []),
                ...(element.name === undefined ? ["name" as const] : []),
              ],
            },
            when,
          );
          examples.push({
            target,
            when,
            elementId,
            glyph: element.glyph ?? null,
          });
        }
      }
      if (scope.semanticIdentities)
        publications.push({ target, identities: scope.semanticIdentities });
    };
    if (structure.editor) {
      collect(
        structure.editor,
        { structureId: structure.conceptId, path: [] },
        structure,
        structure.editor.sizes,
      );
      for (const [path, scope] of Object.entries(
        structure.editor.layouts ?? {},
      ))
        collect(
          scope,
          { structureId: structure.conceptId, path: path.slice(1).split("/") },
          ownedLayoutAt(structure, path, document.structures)!,
        );
    }
    return {
      conceptId: structure.conceptId,
      name: names[structure.conceptId] ?? structure.nameRef ?? structure.name,
      bindings: structure.properties,
      ...(structure.parentStructureId && {
        parentStructureId: structure.parentStructureId,
      }),
      ...(structure.description !== undefined && {
        description: structure.description,
      }),
      ...(structure.generation && { generation: structure.generation }),
      ...(structure.elements && {
        elements: structure.elements.map((child) => {
          if (!isLeaf(child)) return child;
          const { glyph, ...element } = child;
          if (glyph !== undefined)
            examples.push({
              target: { structureId: structure.conceptId, path: [] },
              elementId: child.id,
              glyph,
            });
          return element;
        }),
      }),
      options: (structure.editor?.properties ?? []).map((property) =>
        portableOption(
          property,
          taxonomy,
          optionCategories[property.id] ??
            (property.kind === "variant" ? property.categoryId : undefined),
        ),
      ),
      configuration,
    };
  });
  const value: PortableStructuresDocument = structuredClone({
    schemaVersion: 1,
    structures,
    publications,
    examples,
  });
  issues.push(...portableStructureIssues(value, taxonomy));
  return issues.length
    ? { status: "unavailable", issues }
    : { status: "ready", value };
}

/**
 * Read adapter for existing domain resolution, editing and generation.
 */
export function fromPortableStructures(
  document: PortableStructuresDocument,
  taxonomy: TaxonomyDocument,
): StructureContractResult<StructuresDocument> {
  const issues = portableStructureIssues(document, taxonomy);
  if (issues.length) return { status: "unavailable", issues };
  const structures: Structure[] = document.structures.map((source) => {
    const label =
      typeof source.name === "string"
        ? source.name
        : term(taxonomy, source.name);
    if (label === undefined)
      issues.push({
        structureId: source.conceptId,
        message: "The Structure name references an unavailable Registry term.",
      });
    for (const option of source.options) {
      if (option.kind === "boolean") continue;
      const categoryId =
        "categoryId" in option.name ? option.name.categoryId : undefined;
      if (
        (categoryId !== undefined &&
          !taxonomy.categories.some(
            (category) =>
              category.id === categoryId &&
              category.scopes.includes("structures"),
          )) ||
        option.values.some(
          (value) =>
            value.name.name === undefined &&
            term(taxonomy, value.name) === undefined,
        )
      )
        issues.push({
          structureId: source.conceptId,
          message: "An option references unavailable Registry vocabulary.",
        });
    }
    return {
      conceptId: source.conceptId,
      name:
        typeof source.name === "string"
          ? source.name
          : label
            ? label.charAt(0).toUpperCase() + label.slice(1)
            : "",
      ...(typeof source.name !== "string" && {
        nameRef: structuredClone(source.name),
      }),
      properties: structuredClone(source.bindings),
      ...(source.parentStructureId && {
        parentStructureId: source.parentStructureId,
      }),
      ...(source.description !== undefined && {
        description: source.description,
      }),
      ...(source.elements && { elements: structuredClone(source.elements) }),
      ...(source.generation && {
        generation: structuredClone(source.generation),
      }),
      editor: {
        ...emptyStructureEditor(),
        properties: source.options.map((option) =>
          sourceOption(option, taxonomy),
        ),
      },
    };
  });
  if (issues.length) return { status: "unavailable", issues };

  const scopeAt = (target: StructureTarget) => {
    const owner = structures.find(
      (source) => source.conceptId === target.structureId,
    );
    const path = target.path.length ? `/${target.path.join("/")}` : "";
    const source =
      owner && (path ? ownedLayoutAt(owner, path, structures) : owner);
    if (!owner || !source) {
      issues.push({
        structureId: target.structureId,
        message: "Configuration targets an unavailable owned occurrence.",
      });
      return;
    }
    const editor = owner.editor!;
    if (!path) return { owner, source, scope: editor };
    const layouts = (editor.layouts ??= {});
    return { owner, source, scope: (layouts[path] ??= {}) };
  };
  const overrideAt = (
    owner: Structure,
    scope: StructureLayoutConfiguration,
    when: StructureCondition,
  ) => {
    if (
      !owner.editor!.properties.some(
        (property) =>
          property.kind === "variant" &&
          property.id === when.optionId &&
          property.options.some((option) => option.id === when.valueId),
      )
    ) {
      issues.push({
        structureId: owner.conceptId,
        message: "Configuration references an unavailable option value.",
      });
      return;
    }
    return ((scope.overrides ??= {})[when.valueId] ??= {});
  };
  for (const definition of document.structures) {
    for (const entry of definition.configuration) {
      if (entry.target.structureId !== definition.conceptId) {
        issues.push({
          structureId: definition.conceptId,
          message: "Configuration must belong to its owning Structure.",
        });
        continue;
      }
      const found = scopeAt(entry.target);
      if (!found) continue;
      const { owner, source, scope } = found;
      const override = entry.when && overrideAt(owner, scope, entry.when);
      if (entry.when && !override) continue;
      const effect = entry.effect;
      if (
        "elementId" in effect &&
        !source.elements?.some((child) => child.id === effect.elementId)
      ) {
        issues.push({
          structureId: owner.conceptId,
          message: "Configuration targets an unavailable element.",
        });
        continue;
      }
      if (effect.kind === "binding" || effect.kind === "size") {
        const slot = STRUCTURE_SLOT_KEYS.find(
          (slot) =>
            structureBindingId(source.conceptId, slot) === effect.bindingId,
        );
        if (!slot) {
          issues.push({
            structureId: owner.conceptId,
            message: "Configuration references an unavailable binding.",
          });
          continue;
        }
        if (effect.kind === "size") {
          if (override) (override.sizes ??= {})[slot] = effect.termId;
          else if (!entry.target.path.length)
            (owner.editor!.sizes ??= {})[slot] = effect.termId;
          else
            issues.push({
              structureId: owner.conceptId,
              message:
                "An unconditional nested size is not supported by the current generator bridge.",
            });
        } else if (override)
          (override.slots ??= {})[slot] = structuredClone(effect.selection);
        else
          issues.push({
            structureId: owner.conceptId,
            message:
              "Unconditional bindings belong in the Structure definition.",
          });
      } else if (effect.kind === "visibility") {
        const destination = override ?? scope;
        (destination.visibility ??= {})[effect.elementId] = effect.visible;
      } else if (effect.kind === "visibilityBinding") {
        if (entry.when) {
          issues.push({
            structureId: owner.conceptId,
            message:
              "A Boolean visibility relationship cannot have a variant condition.",
          });
          continue;
        }
        (scope.visibilityBindings ??= {})[effect.elementId] = {
          propertyId: effect.optionId,
          inverted: effect.inverted,
        };
      } else if (effect.kind === "order") {
        const children = source.elements ?? [];
        if (
          effect.elementIds.length !== children.length ||
          new Set(effect.elementIds).size !== children.length ||
          effect.elementIds.some(
            (id) => !children.some((child) => child.id === id),
          )
        )
          issues.push({
            structureId: owner.conceptId,
            message:
              "An option's order must contain each authored element once.",
          });
        else if (override) override.order = structuredClone(effect.elementIds);
        else
          issues.push({
            structureId: owner.conceptId,
            message: "Unconditional order belongs in the Structure definition.",
          });
      } else {
        const base = source.elements?.find(
          (child) => child.id === effect.elementId,
        );
        if (!override || !base || !isLeaf(base)) {
          issues.push({
            structureId: owner.conceptId,
            message:
              "Element fields must target an existing leaf in an option.",
          });
          continue;
        }
        const element = { ...base, ...structuredClone(effect.fields) };
        for (const key of effect.unset) delete element[key];
        (override.elements ??= {})[effect.elementId] = element;
      }
    }
  }
  for (const publication of document.publications) {
    const found = scopeAt(publication.target);
    if (found)
      found.scope.semanticIdentities = structuredClone(publication.identities);
  }
  // Apply default resources before option resources, irrespective of record order.
  const applyExample = (example: StructureExample) => {
    if (example.target.path.length && !example.when) {
      issues.push({
        structureId: example.target.structureId,
        message:
          "Unconditional resources belong to the leaf's owning definition.",
      });
      return;
    }
    const found = scopeAt(example.target);
    if (!found) return;
    const { owner, source, scope } = found;
    let element: StructureChild | undefined;
    if (example.when) {
      const override = overrideAt(owner, scope, example.when);
      const base = source.elements?.find(
        (child) => child.id === example.elementId,
      );
      if (override && base && isLeaf(base))
        element = (override.elements ??= {})[example.elementId] ??=
          structuredClone(base);
    } else
      element = source.elements?.find(
        (child) => child.id === example.elementId,
      );
    if (!element || !isLeaf(element)) {
      issues.push({
        structureId: owner.conceptId,
        message: "An example targets an unavailable leaf.",
      });
      return;
    }
    if (example.glyph === null) delete element.glyph;
    else element.glyph = example.glyph;
  };
  document.examples.filter((example) => !example.when).forEach(applyExample);
  document.examples.filter((example) => example.when).forEach(applyExample);
  for (const structure of structures)
    for (const message of [
      ...structureVariantIssues(structure),
      ...structureConfigurationIssues(structure, structures),
    ])
      issues.push({ structureId: structure.conceptId, message });
  for (const structure of structures) {
    const editor = structure.editor!;
    if (
      !editor.properties.length &&
      !Object.keys(editor.overrides).length &&
      !Object.keys(editor.visibility).length &&
      !Object.keys(editor.visibilityBindings).length &&
      !Object.keys(editor.sizes ?? {}).length &&
      !Object.keys(editor.layouts ?? {}).length &&
      editor.semanticIdentities === undefined
    )
      delete structure.editor;
  }
  const value = { schemaVersion: 7 as const, structures };
  if (!isStructuresDocument(value))
    issues.push({
      structureId: "",
      message:
        "Portable Structure assignments need finite, non-negative numeric values.",
    });
  return issues.length
    ? { status: "unavailable", issues }
    : { status: "ready", value };
}
