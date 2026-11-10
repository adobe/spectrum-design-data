// Copyright 2026 Adobe. All rights reserved.
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import {
  primitiveReferencesFromOutputs,
  type PrimitiveReference,
} from "../tokens/primitiveReferences";
import { generateDimensionScale } from "../scales/foundation";
import { generateTypography } from "../typography/typographyGeneration";
import {
  appliedStructureBindings,
  structureName,
  structureNameClassification,
  structureSizes,
} from "../structures/generation";
import {
  ELEMENT_CATEGORY_ID,
  ELEMENT_SLOT_LABELS,
  elementReferenceAllowed,
  type ElementBinding,
  type StructureElement,
} from "../structures/elements";
import { appliedElementBindings } from "../structures/elementResolution";
import { tshirtMappings, type TshirtVariantMapping } from "../logic/tshirt";
import {
  hasVariantTokenNaming,
  mergeClassifications,
} from "../option-groups/model";
import {
  blockingProjectionIssues,
  projectClassification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import {
  SIZE_TERM_IDS,
  VARIANT_CATEGORY_IDS,
} from "../taxonomy/variantVocabulary";
import { generatorTermId } from "../logic/generator";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";
import { canonicalTokenModeKey, tokenModeSetIds } from "../tokens/browserModel";
import { modeSelections } from "../modes/combinations";
import { scaleIdentityContext } from "../modes/scaleKeys";
import { semanticIdentityKey } from "../structures/semanticIdentity";
import type { TshirtAuthoringSource } from "./tshirtArtifacts";
import type { TshirtArtifactBundle, TshirtSemanticRow } from "./tshirtTypes";
import { structureEditor } from "../structures/variants";
import {
  layoutConfigurationEditor,
  ownedLayoutAt,
} from "../structures/configuration";
import {
  structureBinding,
  structureGeneration,
  structureSelection,
  structureSlot,
  structureSlotDefinition,
  type Structure,
  type StructureSlot,
} from "../structures/model";
import { isConstraintSlot } from "../structures/resolution";
import { canonicalJson } from "./canonicalJson";
import { tokenUuid } from "../tokens/model";
import type { OptionProperty } from "../option-groups/model";
import type { TshirtSizingRule } from "../logic/model";
import type { StructureLiteralBinding } from "../structures/model";
import { resolveModeParameterValues } from "../modes/parameterResolution";

interface LeafContext {
  context: Record<string, string>;
  selection: Record<string, string>;
  related: ReturnType<typeof canonicalAliasRows>;
}

interface LeafResources {
  taxonomy: TaxonomyDocument;
  aliases: ReturnType<typeof canonicalAliasRows>;
  references: PrimitiveReference[];
}

function resourcesFor(
  source: TshirtAuthoringSource,
): LeafResources | undefined {
  if (!source.taxonomy || !source.structures || !source.rules) return;
  const complete = completeAliasSource({
    ...source,
    interpolations: source.interpolations ?? [],
    tokenOverrides: source.tokenOverrides ?? {},
    browserTokenEdits: source.browserTokenEdits ?? {},
  });
  const aliases = canonicalAliasRows(
    complete,
    undefined,
    "preserve-for-review",
    {
      excludeColors: true,
      includeUnpublished: true,
    },
  );
  const modeValues = resolveModeParameterValues(
    {
      color: complete.colorSystem,
      typography: complete.typography,
      componentSizing: complete.componentSizing,
    },
    [],
    undefined,
    { modeSets: complete.modeSets },
  );
  const dimensions = (family: "size" | "spacing" | "radius") =>
    complete[family].scales.map((scale) => ({
      scale,
      values: generateDimensionScale(
        family,
        scale,
        complete.rules,
        complete.scaleTypes,
        modeValues,
      ),
    }));
  const references = primitiveReferencesFromOutputs(
    {
      spacing: [],
      size: dimensions("size"),
      radius: [],
      elevation: { document: complete.elevation, levels: [] },
      typography: {
        document: complete.typography,
        values: generateTypography(
          complete.typography,
          undefined,
          complete.rules,
          complete.scaleTypes,
          complete.interpolations,
        ),
        naming: {
          registry: complete.taxonomy,
          names: complete.typography.metricNames,
          outputUnit: complete.typography.outputUnit,
        },
      },
    },
    complete.taxonomy,
  );
  return { taxonomy: complete.taxonomy, aliases, references };
}

function literalTarget(
  structure: Structure,
  element: StructureElement,
  binding: Extract<ElementBinding, { value: { kind: "number" } }>,
): PrimitiveReference {
  const { value, unit } = binding.value;
  return {
    id: binding.id,
    family: binding.family,
    sourceId: structure.conceptId,
    index: 0,
    sourceName: structure.name,
    nativeId: binding.id,
    name: `${element.kind} ${ELEMENT_SLOT_LABELS[binding.slot]}`,
    value,
    displayValue: `${value}${unit === "multiplier" ? "" : "px"}`,
    hidden: true,
    unit,
  };
}

function contextsFor(
  binding: ElementBinding,
  anchor: PrimitiveReference,
  aliases: LeafResources["aliases"],
  modeSets: TshirtAuthoringSource["modeSets"],
): LeafContext[] {
  const related =
    "$ref" in binding
      ? aliases.filter(
          (row) =>
            row.token.type === anchor.family &&
            row.token.groupId === (anchor.metricId ?? anchor.sourceId),
        )
      : [];
  const invalid = related.find(
    (row) =>
      row.token.validationError ||
      blockingProjectionIssues(row.token.projection).length,
  );
  if (invalid)
    throw new Error(
      `The leaf binding's mode values are invalid (${invalid.token.validationError ?? blockingProjectionIssues(invalid.token.projection).join(" ")}). Repair its primitive source.`,
    );
  if ("$ref" in binding && !related.length)
    throw new Error(
      "The leaf binding's mode values are unavailable. Repair its primitive source.",
    );
  const axes = new Set(related.flatMap((row) => tokenModeSetIds(row.context)));
  return modeSelections(modeSets.filter((axis) => axes.has(axis.id))).map(
    (selection) => ({ selection, context: {}, related }),
  );
}

function referencesForContext(
  anchor: PrimitiveReference,
  context: LeafContext,
  references: PrimitiveReference[],
) {
  if (!context.related.length) return references;
  return references.map((reference): PrimitiveReference => {
    if (
      reference.sourceId !== anchor.sourceId ||
      reference.family !== anchor.family
    )
      return reference;
    const row = context.related
      .filter(
        (item) =>
          (item.id === reference.id ||
            (item.token.sourceId ?? item.token.id) === reference.nativeId) &&
          (JSON.parse(item.context) as [string, string][]).every(
            ([axis, mode]) => context.selection[axis] === mode,
          ),
      )
      .sort((left, right) => right.context.length - left.context.length)[0];
    if (!row)
      throw new Error("A leaf binding has an unresolved mode dependency.");
    return {
      ...reference,
      value: row.token.value,
      valueOverridden: row.token.valueOverridden,
    };
  });
}

function namedContext(
  selection: Record<string, string>,
  source: TshirtAuthoringSource,
) {
  return Object.fromEntries(
    Object.entries(selection).map(([id, mode]) => {
      const axis = source.modeSets.find((item) => item.id === id);
      const selected = axis?.modes.find((item) => item.id === mode);
      if (!axis || !selected)
        throw new Error("A leaf mode context is unavailable.");
      return [axis.key, selected.key];
    }),
  );
}

function propertyClassification(
  taxonomy: TaxonomyDocument,
  binding: ElementBinding,
  target: PrimitiveReference,
) {
  const constraint = isConstraintSlot(binding.slot)
    ? structureSlotDefinition(binding.slot).classification
    : undefined;
  const value =
    binding.slot === "fontSize"
      ? "size"
      : binding.slot === "lineHeight"
        ? target.unit === "multiplier"
          ? "unitless line height"
          : "line height"
        : binding.slot;
  const category = taxonomy.categories.find((item) => item.key === "property")!;
  const term = taxonomy.terms.find(
    (item) => item.categoryId === category.id && item.value === value,
  );
  if (!term && !constraint)
    throw new Error(`Choose a registered property term for ${value}.`);
  return constraint ?? { [category.id]: term!.id };
}

function emitLeafRow(
  bundle: TshirtArtifactBundle,
  modeSets: TshirtAuthoringSource["modeSets"],
  taxonomy: TaxonomyDocument,
  contextStructure: Structure,
  identityStructure: Structure,
  property: OptionProperty | undefined,
  optionId: string | undefined,
  element: StructureElement,
  binding: ElementBinding,
  target: PrimitiveReference,
  size: string,
  leafContext: LeafContext,
  mapping: Omit<TshirtVariantMapping, "target">,
  application?: { id: string; rule: TshirtSizingRule },
) {
  const classification = mergeClassifications(
    structureNameClassification(contextStructure),
    {
      [ELEMENT_CATEGORY_ID]: element.termId,
      ...propertyClassification(taxonomy, binding, target),
      [VARIANT_CATEGORY_IDS.size]: generatorTermId(size),
    },
    ...(property?.kind === "variant" ? [property.classification] : []),
    ...(property && optionId
      ? [
          property.kind === "variant"
            ? (property.options.find((item) => item.id === optionId)
                ?.classification ?? {})
            : {},
        ]
      : []),
  );
  if (classification.issues.length)
    throw new Error(classification.issues.join(" "));
  const projection = projectClassification(
    taxonomy,
    classification.classification,
    "structures",
  );
  if (projection.issues.length) throw new Error(projection.issues.join(" "));
  const identity = optionId
    ? structureEditor(identityStructure).semanticIdentities?.[optionId]?.[
        semanticIdentityKey(`element/${element.id}/${binding.slot}`, size)
      ]
    : undefined;
  const uuid =
    identity?.rows[canonicalTokenModeKey(leafContext.selection)] ??
    tokenUuid(
      `structure-semantic-row:v1:${tokenUuid(
        `structure-semantic:v1:${contextStructure.conceptId}:${canonicalJson(classification.classification)}`,
      )}:${canonicalJson(scaleIdentityContext(leafContext.context, modeSets))}`,
    );
  if (
    optionId &&
    (!identity || !identity.rows[canonicalTokenModeKey(leafContext.selection)])
  )
    throw new Error("The variant leaf's stored token identity is unavailable.");
  const conceptId =
    identity?.conceptId ??
    tokenUuid(
      `structure-semantic:v1:${contextStructure.conceptId}:${canonicalJson(classification.classification)}`,
    );
  const token = {
    uuid,
    name: {
      ...Object.fromEntries(
        projection.segments.map((segment) => [
          segment.key,
          segment.values
            .map((item) => kebabCaseNameFormatter.formatValue(item))
            .join("-"),
        ]),
      ),
      size,
      ...leafContext.context,
    },
    value: `${target.value}${target.unit === "multiplier" ? "" : "px"}`,
  };
  const row: TshirtSemanticRow = {
    token,
    conceptId,
    classification: classification.classification,
    structureId: contextStructure.conceptId,
    structureName: contextStructure.name,
    ...(property && { propertyId: property.id }),
    ...(optionId && { optionId }),
    canonicalName: projection.name,
    bindingIds: [binding.id],
    applicationIds: application ? [application.id] : [],
    ruleIds: application ? [application.rule.id] : [],
    size,
    target,
    ...(!("$ref" in binding) && { targetKind: "literal" as const }),
    context: leafContext.context,
    selection: leafContext.selection,
    kind: Object.keys(leafContext.selection).length ? "binding" : "baseline",
    mapping,
  };
  const existing = bundle.semantics.find(
    (candidate) => candidate.token.uuid === uuid,
  );
  if (existing) {
    if (
      canonicalJson(existing.token) !== canonicalJson(row.token) ||
      canonicalJson(existing.classification) !==
        canonicalJson(row.classification)
    )
      throw new Error(
        `Repeated leaf bindings produce conflicting semantic assignments (${existing.bindingIds.join(", ")}: ${existing.token.value}; ${binding.id}: ${row.token.value}).`,
      );
    existing.bindingIds = [...new Set([...existing.bindingIds, binding.id])];
    existing.applicationIds = [
      ...new Set([...existing.applicationIds, ...row.applicationIds]),
    ];
    existing.ruleIds = [...new Set([...existing.ruleIds, ...row.ruleIds])];
    return;
  }
  bundle.tokens.push(token);
  bundle.semantics.push(row);
}

function appendBindings(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
  resources: LeafResources,
  contextStructure: Structure,
  bindingStructure: Structure,
  element: StructureElement,
  bindings: readonly ElementBinding[],
  property?: OptionProperty,
  optionId?: string,
) {
  const references = resources.references;
  const applications = appliedElementBindings(
    {
      ...bindingStructure,
      elements: bindingStructure.elements?.map((child) =>
        child.id === element.id
          ? { ...element, bindings: [...bindings] }
          : child,
      ),
    },
    source.rules ?? [],
    references,
  );
  for (const binding of bindings) {
    const anchor =
      "$ref" in binding
        ? references.find((item) => item.id === binding.$ref)
        : literalTarget(bindingStructure, element, binding);
    if (
      !anchor ||
      ("$ref" in binding &&
        (!elementReferenceAllowed(binding.slot, anchor) || anchor.error))
    )
      throw new Error(
        `${contextStructure.name} ${ELEMENT_SLOT_LABELS[binding.slot]}: the linked source is unavailable or incompatible.`,
      );
    const application = applications.find(
      (item) => item.binding.id === binding.id,
    );
    for (const context of contextsFor(
      binding,
      anchor,
      resources.aliases,
      source.modeSets,
    )) {
      const contextual = referencesForContext(anchor, context, references);
      const contextualAnchor =
        "$ref" in binding
          ? contextual.find((item) => item.id === anchor.id)!
          : anchor;
      const leafContext = {
        ...context,
        context: namedContext(context.selection, source),
      };
      for (const size of structureSizes(contextStructure).filter((item) =>
        Object.hasOwn(SIZE_TERM_IDS, item),
      )) {
        const mapped = application
          ? tshirtMappings(
              application.rule,
              contextualAnchor,
              contextual,
              [size],
              { rules: source.rules, scaleTypes: source.scaleTypes },
            )[0]
          : {
              size,
              termId: generatorTermId(size),
              offset: 0,
              requested: contextualAnchor.index,
              actual: contextualAnchor.index,
              target: contextualAnchor,
            };
        const { target, ...mapping } = mapped;
        emitLeafRow(
          bundle,
          source.modeSets,
          resources.taxonomy,
          contextStructure,
          bindingStructure,
          property,
          optionId,
          element,
          binding,
          target,
          size,
          leafContext,
          mapping,
          application && {
            id: application.application.id,
            rule: application.rule,
          },
        );
      }
    }
  }
}

function contextualScopes(
  structures: readonly Structure[],
): { context: Structure; source: Structure }[] {
  return structures
    .filter((structure) => !structure.parentStructureId)
    .flatMap((context) => {
      const scopes = [{ context, source: context }];
      const visit = (parent: Structure, path: string) => {
        for (const child of parent.elements ?? []) {
          if (child.kind !== "structureReference") continue;
          const childPath = `${path}/${child.id}`;
          const target = ownedLayoutAt(context, childPath, structures);
          if (!target) continue;
          const configuration = context.editor?.layouts?.[childPath];
          scopes.push({
            context,
            source: configuration
              ? {
                  ...target,
                  editor: layoutConfigurationEditor(context, configuration),
                }
              : target,
          });
          visit(target, childPath);
        }
      };
      visit(context, "");
      return scopes;
    });
}

export function appendVariantLeafRows(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
  resources?: LeafResources,
) {
  if (!source.taxonomy || !source.structures) return;
  for (const { context, source: structure } of contextualScopes(
    source.structures.structures,
  )) {
    if (!structureGenerationHasName(context, source.taxonomy)) continue;
    if (!structure.editor) continue;
    const editor = structureEditor(structure);
    for (const property of editor.properties) {
      if (property.kind !== "variant") continue;
      for (const option of property.options) {
        if (
          option.id === property.defaultOptionId ||
          !hasVariantTokenNaming(property, option)
        )
          continue;
        const override = editor.overrides[option.id];
        for (const element of Object.values(override?.elements ?? {})) {
          const base = structure.elements?.find(
            (child) => child.id === element.id,
          );
          if (!base || base.kind === "structureReference") continue;
          const changed = element.bindings.filter((binding) => {
            const previous = base.bindings.find(
              (item) => item.slot === binding.slot,
            );
            return (
              !previous ||
              canonicalJson(
                "$ref" in previous
                  ? { $ref: previous.$ref }
                  : { value: previous.value },
              ) !==
                canonicalJson(
                  "$ref" in binding
                    ? { $ref: binding.$ref }
                    : { value: binding.value },
                )
            );
          });
          if (changed.length) {
            resources ??= resourcesFor(source);
            if (!resources) return;
            appendBindings(
              source,
              bundle,
              resources,
              context,
              structure,
              element,
              changed,
              property,
              option.id,
            );
          }
        }
      }
    }
  }
}

function appendDefaultLeafRows(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
) {
  if (!source.structures || !source.taxonomy) return;
  let resources: LeafResources | undefined;
  for (const { context, source: structure } of contextualScopes(
    source.structures.structures,
  )) {
    if (!structureGenerationHasName(context, source.taxonomy)) continue;
    for (const element of structure.elements ?? [])
      if (element.kind !== "structureReference" && element.bindings.length) {
        resources ??= resourcesFor(source);
        if (!resources) return;
        appendBindings(
          source,
          bundle,
          resources,
          context,
          structure,
          element,
          element.bindings,
        );
      }
  }
  return resources;
}

function structureGenerationHasName(
  structure: Structure,
  taxonomy: TaxonomyDocument,
) {
  const reference = structure.generation?.nameRef;
  return (
    !!reference &&
    taxonomy.categories.find((category) => category.id === reference.categoryId)
      ?.key === "structure"
  );
}

function appendLiteralLayoutBinding(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
  contextStructure: Structure,
  bindingStructure: Structure,
  identityStructure: Structure,
  binding: StructureLiteralBinding,
  property?: OptionProperty,
  optionId?: string,
) {
  if (
    binding.value.kind !== "number" ||
    !source.taxonomy ||
    !structureGeneration(contextStructure).nameRef
  )
    return;
  const slot = structureSlot(binding);
  if (!slot) return;
  const propertyCategory = property?.kind === "variant" ? property : undefined;
  const taxonomy = source.taxonomy;
  for (const size of structureSizes(contextStructure).filter((item) =>
    Object.hasOwn(SIZE_TERM_IDS, item),
  )) {
    const classification = mergeClassifications(
      binding.classification,
      structureNameClassification(contextStructure),
      { [VARIANT_CATEGORY_IDS.size]: generatorTermId(size) },
      ...(propertyCategory ? [propertyCategory.classification] : []),
      ...(propertyCategory && optionId
        ? [
            propertyCategory.options.find((item) => item.id === optionId)
              ?.classification ?? {},
          ]
        : []),
    );
    if (classification.issues.length)
      throw new Error(classification.issues.join(" "));
    const projection = projectClassification(
      taxonomy,
      classification.classification,
      "structures",
    );
    if (projection.issues.length) throw new Error(projection.issues.join(" "));
    const identity = optionId
      ? structureEditor(identityStructure).semanticIdentities?.[optionId]?.[
          semanticIdentityKey(slot, size)
        ]
      : undefined;
    const uuid =
      identity?.rows[canonicalTokenModeKey({})] ??
      tokenUuid(
        `structure-semantic-row:v1:${tokenUuid(
          `structure-semantic:v1:${contextStructure.conceptId}:${canonicalJson(classification.classification)}`,
        )}:{}`,
      );
    if (optionId && (!identity || !identity.rows[canonicalTokenModeKey({})]))
      throw new Error(
        "The variant layout value's stored token identity is unavailable.",
      );
    const token = {
      uuid,
      name: {
        ...Object.fromEntries(
          projection.segments.map((segment) => [
            segment.key,
            segment.values
              .map((item) => kebabCaseNameFormatter.formatValue(item))
              .join("-"),
          ]),
        ),
        size,
      },
      value: `${binding.value.value}px`,
    };
    const target: PrimitiveReference = {
      id: binding.id,
      family: structureSlotDefinition(slot).family!,
      sourceId: bindingStructure.conceptId,
      index: 0,
      sourceName: bindingStructure.name,
      nativeId: binding.id,
      name: `${bindingStructure.name} ${structureSlotDefinition(slot).label}`,
      value: binding.value.value,
      displayValue: `${binding.value.value}px`,
      hidden: true,
      unit: "px",
    };
    const row: TshirtSemanticRow = {
      token,
      conceptId:
        identity?.conceptId ??
        tokenUuid(
          `structure-semantic:v1:${contextStructure.conceptId}:${canonicalJson(classification.classification)}`,
        ),
      classification: classification.classification,
      structureId: contextStructure.conceptId,
      structureName: structureName(contextStructure, taxonomy),
      ...(propertyCategory && { propertyId: propertyCategory.id }),
      ...(optionId && { optionId }),
      canonicalName: projection.name,
      bindingIds: [binding.id],
      applicationIds: [],
      ruleIds: [],
      size,
      target,
      targetKind: "literal",
      context: {},
      selection: {},
      kind: "baseline",
      mapping: {
        size,
        termId: generatorTermId(size),
        offset: 0,
        requested: 0,
        actual: 0,
      },
    };
    const existing = bundle.semantics.find(
      (candidate) => candidate.token.uuid === uuid,
    );
    if (existing) {
      if (
        canonicalJson(existing.token) !== canonicalJson(row.token) ||
        canonicalJson(existing.classification) !==
          canonicalJson(row.classification)
      )
        throw new Error(
          "Repeated layout values produce conflicting semantic assignments.",
        );
      existing.bindingIds = [...new Set([...existing.bindingIds, binding.id])];
    } else {
      bundle.tokens.push(token);
      bundle.semantics.push(row);
    }
  }
}

function appendLayoutLiteralRows(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
) {
  if (!source.structures) return;
  for (const { context, source: structure } of contextualScopes(
    source.structures.structures,
  )) {
    // Typed values a rule scales are generated with the rule's sizes instead.
    const applied = appliedStructureBindings(structure, source.rules ?? []);
    const scaled = new Set(applied.map((item) => item.binding.id));
    // Typed overrides generate sizes only under a ratio rule; others stay literal.
    const ratioScaled = new Set(
      applied
        .filter((item) => item.rule.movement === "ratio")
        .map((item) => item.binding.id),
    );
    for (const binding of structure.properties)
      if (
        "value" in binding &&
        binding.value.kind === "number" &&
        !scaled.has(binding.id)
      )
        appendLiteralLayoutBinding(
          source,
          bundle,
          context,
          structure,
          structure,
          binding,
        );
    const editor = structureEditor(structure);
    for (const property of editor.properties) {
      if (property.kind !== "variant") continue;
      for (const option of property.options) {
        if (
          option.id === property.defaultOptionId ||
          !hasVariantTokenNaming(property, option)
        )
          continue;
        const override = editor.overrides[option.id];
        for (const [key, selection] of Object.entries(override?.slots ?? {})) {
          if (
            !selection ||
            !("value" in selection) ||
            selection.value.kind !== "number" ||
            canonicalJson(selection) ===
              canonicalJson(structureSelection(structure, key as StructureSlot))
          )
            continue;
          const current = structureBinding(structure, key as StructureSlot);
          if (!current || ratioScaled.has(current.id)) continue;
          appendLiteralLayoutBinding(
            source,
            bundle,
            context,
            structure,
            structure,
            { ...current, value: selection.value },
            property,
            option.id,
          );
        }
      }
    }
  }
}

export function appendStructureLeafRows(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
) {
  const resources = appendDefaultLeafRows(source, bundle);
  appendVariantLeafRows(source, bundle, resources);
  appendLayoutLiteralRows(source, bundle);
}
