// Copyright 2026 Adobe. All rights reserved.
import type { ElevationDocument } from "../elevation/model";
import type { OpacityDocument } from "../opacity/model";
import { generateElevation } from "../elevation/generate";
import { elevationOwnerIds } from "../elevation/output";
import { resolveElevationDocument } from "../elevation/resolution";
import { tshirtMappings, type TshirtVariantMapping } from "../logic/tshirt";
import {
  generatorOutputName,
  generatorSizeKey,
  generatorTermId,
} from "../logic/generator";
import type { TshirtSizingRule } from "../logic/model";
import { generateTypography } from "../typography/typographyGeneration";
import { centerInMinHeight } from "../structures/resolution";
import { generateDimensionScale } from "../scales/foundation";
import { clampScaleRange } from "../scales/stepNames";
import { dimensionIssues } from "../scales/issues";
import {
  assertStructureTaxonomy,
  STRUCTURE_SLOT_KEYS,
  structureGeneration,
  structureSlot,
  structureSlotDefinition,
  type Structure,
  type StructureBinding,
  type StructureSlot,
  type StructuresDocument,
} from "../structures/model";
import {
  appliedStructureBindings,
  assertGenerationReferences,
  type GeneratingBinding,
  isGeneratingBinding,
  structureName,
  structureTokenName,
  structureNameClassification,
  structureSizes,
  structureTokenGroups,
} from "../structures/generation";
import { foundationNameSegment } from "../taxonomy/formatting";
import { resolveNamedSource } from "../taxonomy/naming";
import { VARIANT_CATEGORY_IDS } from "../taxonomy/variantVocabulary";
import {
  modeCombinationCount,
  modeSelections,
  modesForSelection,
} from "../modes/combinations";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { tokenUuid } from "../tokens/model";
import { primitiveReferenceId } from "../tokens/primitiveIdentity";
import {
  primitiveReferencesFromOutputs,
  type PrimitiveReference,
} from "../tokens/primitiveReferences";
import { canonicalJson } from "./canonicalJson";
import {
  captureDimensionSource,
  type DimensionAuthoringSource,
} from "./dimensionArtifacts";
import { SHADOW_VALUE_TYPE } from "./shadowValue";
import {
  TSHIRT_FIELDS,
  TSHIRT_PROFILE,
  PHYSICAL_POSITIONS,
  assertTshirtField,
  assertTshirtGraph,
  exactDimensionValue,
  exactShadowValue,
  formatTshirtName,
  GENERATOR_PROFILE,
  type TshirtTokenRecord,
} from "./tshirtProfile";
import type { TshirtArtifactBundle, TshirtSemanticRow } from "./tshirtTypes";
import { ELEMENT_CATEGORY_ID } from "../structures/elements";
import {
  ELEMENT_NAMING_FIELD,
  TSHIRT_COMPOSITION_PROFILE,
  TSHIRT_NAMING_FIELDS,
} from "./tshirtProfile";
import {
  projectClassification,
  withTaxonomyProjection,
} from "../taxonomy/model";
import { appendStructureVariantArtifacts } from "./structureVariantArtifacts";
export type {
  TshirtArtifactBundle,
  TshirtSemanticRow,
  TshirtDiagnostic,
} from "./tshirtTypes";

export interface TshirtAuthoringSource extends DimensionAuthoringSource {
  structures?: StructuresDocument;
  elevation?: ElevationDocument;
  opacity?: OpacityDocument;
  interpolations?: import("../scales/interpolationDefinition").Interpolation[];
  tokenOverrides?: import("../tokens/model").TokenOverrideMap;
  /** Tokens linked across all structures, kept when a build isolates one structure. */
  linkedReferenceIds?: readonly string[];
}
interface SourceContext {
  kind: TshirtSemanticRow["kind"];
  context: Record<string, string>;
  selection: Record<string, string>;
  references: PrimitiveReference[];
}
const primitiveProperty = (family: PrimitiveReference["family"]) =>
  family === "radius"
    ? "corner-radius"
    : family === "elevation"
      ? "shadow"
      : family;
function primitiveRecord(
  target: PrimitiveReference,
  context: SourceContext,
): { token: TshirtTokenRecord; conceptId: string } {
  if (target.step === undefined || !target.sourceName)
    throw new Error(
      "Generated targets need typed scale indices and governed source names.",
    );
  const conceptId =
    target.family === "elevation"
      ? target.nativeId
      : tokenUuid(
          `dimension-concept:${target.family}:${target.sourceId}:${target.step}`,
        );
  const uuid =
    target.family === "elevation"
      ? tokenUuid(
          `elevation-shadow:${target.nativeId}:${canonicalTokenModeKey(context.selection)}`,
        )
      : tokenUuid(
          `dimension-row:${conceptId}:${canonicalJson(context.context)}`,
        );
  return {
    conceptId,
    token: {
      uuid,
      name: {
        property: primitiveProperty(target.family),
        foundationScale: foundationNameSegment(target.sourceName),
        scaleIndex: String(target.step),
        ...context.context,
      },
      ...(target.family === "elevation"
        ? {
            $valueType: SHADOW_VALUE_TYPE,
            value: exactShadowValue(target.shadows ?? []),
          }
        : { value: exactDimensionValue(target.value) }),
    },
  };
}

export function buildTshirtArtifacts(
  snapshot: TshirtAuthoringSource,
  sourceKind: TshirtArtifactBundle["sourceKind"] = "working",
): TshirtArtifactBundle {
  return snapshot.taxonomy
    ? withTaxonomyProjection(snapshot.taxonomy, () =>
        appendStructureVariantArtifacts(
          snapshot,
          buildTshirtBatch(snapshot, sourceKind),
          buildTshirtBatch,
        ),
      )
    : buildTshirtBatch(snapshot, sourceKind);
}

function virtualAnchor(
  structure: Structure,
  binding: GeneratingBinding,
  family: PrimitiveReference["family"],
  value: number,
): PrimitiveReference {
  return {
    id: `structure-value:${binding.id}`,
    family,
    sourceId: `structure:${structure.conceptId}`,
    sourceName: "structure value",
    index: 0,
    step: 0,
    nativeId: binding.id,
    name: `${value}px`,
    value,
    displayValue: `${value}px`,
    unit: "px",
    hidden: true,
    synthetic: true,
  };
}

/** The token that equals a generated value exactly, so outputs alias it; otherwise a literal. */
function exactOrLiteral(
  template: PrimitiveReference,
  value: number,
  references: readonly PrimitiveReference[],
  preferredSources: ReadonlySet<string> = new Set(),
): PrimitiveReference {
  const matches = references.filter(
    (item) =>
      item.family === template.family &&
      !item.hidden &&
      !item.error &&
      item.value === value,
  );
  // New scales are listed first, so prefer scales the structure already links to keep aliases stable.
  return (
    matches.find((item) => preferredSources.has(item.sourceId)) ??
    matches[0] ?? {
      ...template,
      id: `${template.id}:${value}`,
      name: `${value}px`,
      value,
      displayValue: `${value}px`,
    }
  );
}

function virtualMappings(
  structure: Structure,
  label: string,
  binding: GeneratingBinding,
  rule: TshirtSizingRule,
  references: readonly PrimitiveReference[],
  context: Parameters<typeof tshirtMappings>[4],
  linkedIds: readonly string[] = [],
): TshirtVariantMapping[] {
  if ("$ref" in binding) throw new Error("Expected a typed or derived value.");
  const slot = structureSlot(binding)!;
  const family = structureSlotDefinition(slot)
    .family as PrimitiveReference["family"];
  const sizes = structureSizes(structure);
  const preferredSources = new Set(
    linkedIds.flatMap((id) => {
      const linked = references.find((reference) => reference.id === id);
      return linked?.family === family ? [linked.sourceId] : [];
    }),
  );
  if (binding.value.kind === "number") {
    const anchor = virtualAnchor(
      structure,
      binding,
      family,
      binding.value.value,
    );
    if (rule.movement !== "ratio")
      throw new Error(
        `${label} - ${structureSlotDefinition(slot).label}: a typed value can only scale with a Multiply by ratio rule. Choose a ratio rule or a token.`,
      );
    return tshirtMappings(rule, anchor, references, sizes, context).map(
      (mapping) =>
        mapping.target.synthetic
          ? {
              ...mapping,
              target: exactOrLiteral(
                anchor,
                mapping.target.value as number,
                references,
                preferredSources,
              ),
            }
          : mapping,
    );
  }
  const contentRef = binding.value.contentRef;
  const content = references.find((item) => item.id === contentRef);
  if (!content)
    throw new Error(
      `${label} - ${structureSlotDefinition(slot).label}: the content height token is unavailable. Choose another line height.`,
    );
  const rules = context?.rules ?? [];
  const minimum = structure.properties.find(
    (item) => structureSlot(item) === "minHeight",
  );
  if (!minimum || !("$ref" in minimum || minimum.value.kind === "number"))
    throw new Error(
      `${label} - ${structureSlotDefinition(slot).label}: set a Min height token or value so the content can be centered.`,
    );
  const minimumApplied = appliedStructureBindings(structure, rules).find(
    (item) => item.binding.id === minimum.id,
  );
  const minimumAnchor =
    "$ref" in minimum
      ? references.find((item) => item.id === minimum.$ref)
      : virtualAnchor(
          structure,
          minimum as GeneratingBinding,
          "size",
          (minimum.value as { value: number }).value,
        );
  if (!minimumAnchor)
    throw new Error(
      `${label} - Min height: the linked token is unavailable. Repair its source reference.`,
    );
  const template = virtualAnchor(structure, binding, family, 0);
  return sizes.map((size) => {
    const height = minimumApplied
      ? tshirtMappings(
          minimumApplied.rule,
          minimumAnchor,
          references,
          [size],
          context,
        )[0].target.value
      : minimumAnchor.value;
    // Content steps with Min height so every centered padding agrees at each size.
    const contentHeight = tshirtMappings(
      minimumApplied?.rule ?? rule,
      content,
      references,
      [size],
      context,
    )[0].target.value;
    if (typeof height !== "number" || typeof contentHeight !== "number")
      throw new Error(
        `${label} - ${structureSlotDefinition(slot).label}: Min height and content height must be numbers.`,
      );
    const centered = centerInMinHeight(height, contentHeight);
    return {
      size,
      termId: generatorTermId(size),
      offset: 0,
      requested: 0,
      actual: 0,
      target: exactOrLiteral(
        template,
        centered.value,
        references,
        preferredSources,
      ),
      ...(centered.issue && { warning: `${size}: ${centered.issue}` }),
    };
  });
}

function buildTshirtBatch(
  snapshot: TshirtAuthoringSource,
  sourceKind: TshirtArtifactBundle["sourceKind"],
): TshirtArtifactBundle {
  if (
    !snapshot.structures ||
    !snapshot.taxonomy ||
    !snapshot.rules ||
    !snapshot.elevation ||
    !snapshot.scaleTypes
  )
    throw new Error(
      "T-shirt generation needs complete authoritative authoring data.",
    );
  const { structures, taxonomy, rules, elevation, scaleTypes } = snapshot;
  assertStructureTaxonomy(structures, taxonomy);
  const usedAxes = new Set<string>();
  const bundle: TshirtArtifactBundle = {
    profile: structuredClone(TSHIRT_PROFILE),
    sourceKind,
    tokens: [],
    semantics: [],
    primitiveLineage: [],
    diagnostics: [],
    fields: structuredClone(TSHIRT_FIELDS),
    vocabulary: {
      structures: [],
      foundationScales: [],
      physicalPositions: [...PHYSICAL_POSITIONS],
    },
    modeSets: [],
  };
  const groupsByStructure = new Map(
    structures.structures
      .filter((structure) => structureGeneration(structure).applications.length)
      .map((structure) => [
        structure.conceptId,
        structureTokenGroups(structure, rules),
      ]),
  );
  const emitting = structures.structures.filter(
    (structure) => groupsByStructure.get(structure.conceptId)?.length,
  );
  const sizeIds = [
    ...new Set(
      emitting.flatMap(
        (structure) => structureGeneration(structure).sizeTermIds,
      ),
    ),
  ];
  if (
    sizeIds.some(
      (id) =>
        generatorOutputName(id, taxonomy) !== generatorSizeKey(id) ||
        generatorSizeKey(id) === id,
    )
  ) {
    bundle.profile = structuredClone(GENERATOR_PROFILE);
    bundle.vocabulary.sizes = sizeIds.map((id) => ({
      id,
      label: String(taxonomy.terms.find((term) => term.id === id)!.value),
      value: generatorOutputName(id, taxonomy),
    }));
    bundle.vocabulary.elements = [];
    bundle.fields.push(structuredClone(ELEMENT_NAMING_FIELD));
    bundle.fields = bundle.fields.map((field) =>
      "name" in field && field.name === "size"
        ? { ...field, registry: "extensions/registry/sizes.json" }
        : field,
    );
  }
  if (
    emitting.some(
      (source) =>
        structureGeneration(source).nameRef?.categoryId === ELEMENT_CATEGORY_ID,
    )
  ) {
    if (!bundle.vocabulary.sizes)
      bundle.profile = structuredClone(TSHIRT_COMPOSITION_PROFILE);
    if (
      !bundle.fields.some(
        (field) => "name" in field && field.name === "element",
      )
    )
      bundle.fields.push(structuredClone(ELEMENT_NAMING_FIELD));
    bundle.vocabulary.elements = [];
  }
  if (!emitting.length) return bundle;
  const contexts = new Map<string, SourceContext[]>();
  const sourceKey = (family: string, sourceId: string) =>
    `${family}:${sourceId}`;
  const required = new Set(
    [...groupsByStructure.values()].flatMap((groups) =>
      groups.flatMap((group) =>
        group.bindings.flatMap((item) =>
          "$ref" in item.binding ? [item.binding.$ref] : [],
        ),
      ),
    ),
  );
  // Typed and derived values alias a token when they equal one exactly, so load whole families.
  const virtualFamilies = new Set(
    [...groupsByStructure.values()].flatMap((groups) =>
      groups.flatMap((group) =>
        "$ref" in group.bindings[0].binding
          ? []
          : [structureSlotDefinition(group.bindings[0].slot).family],
      ),
    ),
  );
  const usesFamily = (family: string, ids: string[]) =>
    virtualFamilies.has(family as never) || ids.some((id) => required.has(id));
  const sourceIds = new Set<string>();
  for (const family of ["spacing", "size", "radius"] as const)
    for (const scale of snapshot[family]?.scales ?? []) {
      const { below, above } = clampScaleRange(scale.below, scale.above);
      if (
        usesFamily(
          family,
          Array.from({ length: below + above + 1 }, (_, index) =>
            primitiveReferenceId(family, scale.id, index - below),
          ),
        )
      )
        sourceIds.add(scale.id);
    }
  const dimension = captureDimensionSource(snapshot, {
    includeUnpublished: true,
    sourceIds,
  });
  for (const family of ["spacing", "size", "radius"] as const)
    for (const scale of dimension[family].scales) {
      const { below, above } = clampScaleRange(scale.below, scale.above);
      if (
        !usesFamily(
          family,
          Array.from({ length: below + above + 1 }, (_, index) =>
            primitiveReferenceId(family, scale.id, index - below),
          ),
        )
      )
        continue;
      const key = sourceKey(family, scale.id);
      const plans = dimension.plans.filter(
        (plan) => plan.domain === family && plan.scaleId === scale.id,
      );
      const evaluated = plans.map((plan): SourceContext => {
        const named = resolveNamedSource(scale, taxonomy, family);
        const values = generateDimensionScale(
          family,
          named,
          [...dimension.rules, ...(dimension[family].pendingRules ?? [])],
          dimension.formulas,
          plan.parameters,
        );
        if (
          family === "radius" &&
          dimensionIssues(values, "non-negative").issues.some(
            (issue) => issue !== "duplicate",
          )
        )
          throw new Error(
            `Invalid Radius source "${named.name}": raw and rounded values must be finite and non-negative.`,
          );
        const edits =
          plan.kind === "override"
            ? dimension.edits
            : Object.fromEntries(
                Object.entries(dimension.edits).map(([id, edit]) => [
                  id,
                  { ...edit, values: {} },
                ]),
              );
        const references = primitiveReferencesFromOutputs(
          {
            spacing: family === "spacing" ? [{ scale: named, values }] : [],
            size: family === "size" ? [{ scale: named, values }] : [],
            radius: family === "radius" ? [{ scale: named, values }] : [],
            elevation: { document: elevation, levels: [] },
          },
          taxonomy,
          edits,
          canonicalTokenModeKey(plan.selection),
        );
        return {
          kind: plan.kind,
          context: plan.context,
          selection: plan.selection,
          references,
        };
      });
      contexts.set(key, evaluated);
    }
  const owners = elevationOwnerIds(snapshot.modeSets, snapshot, elevation);
  const axes = snapshot.modeSets.filter((set) => owners.has(set.id));
  const needsElevation = [...groupsByStructure.values()].some((groups) =>
    groups.some((group) => group.property === "shadow"),
  );
  const count = modeCombinationCount(axes);
  if (needsElevation && count > 256)
    throw new Error("Elevation generation exceeds 256 owning contexts.");
  const elevationSelection = needsElevation ? modeSelections(axes) : [];
  const elevationContexts = needsElevation
    ? elevationSelection.map((selection): SourceContext => {
        const modes = modesForSelection(axes, selection);
        const context = Object.fromEntries(
          axes.map((axis, index) => [axis.key, modes[index].key]),
        );
        const resolved = resolveElevationDocument(
          elevation,
          modes,
          snapshot.modeSets,
          {},
          snapshot,
        );
        return {
          kind: "binding",
          context,
          selection,
          references: primitiveReferencesFromOutputs(
            {
              spacing: [],
              size: [],
              radius: [],
              elevation: {
                document: elevation,
                levels: generateElevation(
                  resolved,
                  scaleTypes,
                  snapshot.colorSystem.settings.colorOutput,
                ),
              },
            },
            taxonomy,
          ),
        };
      })
    : [];
  contexts.set(sourceKey("elevation", elevation.id), elevationContexts);
  let baseline: PrimitiveReference[] | undefined;
  const baselineReferences = () =>
    (baseline ??= [
      ...[...contexts.values()].flatMap((plans) => plans[0]?.references ?? []),
      ...primitiveReferencesFromOutputs(
        {
          spacing: [],
          size: [],
          radius: [],
          elevation: { document: elevation, levels: [] },
          typography: {
            document: snapshot.typography,
            values: generateTypography(
              snapshot.typography,
              undefined,
              rules,
              scaleTypes,
              snapshot.interpolations,
            ),
            naming: {
              registry: taxonomy,
              names: snapshot.typography.metricNames,
              outputUnit: snapshot.typography.outputUnit,
            },
          },
        },
        taxonomy,
      ).filter((reference) => reference.family === "typography"),
    ]);
  const tokenRows = new Map<string, TshirtTokenRecord>();
  const primitiveRows = new Set<string>();
  // Tokens structures already link; typed and derived values alias the same scales.
  const linkedIds =
    snapshot.linkedReferenceIds ??
    structures.structures.flatMap((structure) =>
      structure.properties.flatMap((item) =>
        "$ref" in item ? [item.$ref] : [],
      ),
    );
  for (const structure of emitting) {
    assertGenerationReferences(structure, rules, baselineReferences());
    const nameRef = structureGeneration(structure).nameRef!;
    const namingProjection = projectClassification(
      taxonomy,
      structureNameClassification(structure),
      "structures",
    );
    if (namingProjection.issues.length)
      throw new Error(namingProjection.issues.join(" "));
    const label = structureName(structure, taxonomy);
    const tokenLabel = structureTokenName(structure, taxonomy);
    const structureValue = foundationNameSegment(tokenLabel);
    const facet =
      nameRef.categoryId === ELEMENT_CATEGORY_ID ? "element" : "structure";
    const vocabulary =
      facet === "element"
        ? bundle.vocabulary.elements!
        : bundle.vocabulary.structures;
    if (!vocabulary.some((item) => item.id === nameRef.termId))
      vocabulary.push({
        id: nameRef.termId,
        label: tokenLabel,
        value: structureValue,
      });
    for (const group of groupsByStructure.get(structure.conceptId)!) {
      const lead = group.bindings[0].binding;
      const runs: {
        context: SourceContext;
        mappings: TshirtVariantMapping[];
      }[] = [];
      if ("$ref" in lead) {
        const referenceId = lead.$ref;
        const groupContexts = [...contexts.values()].find((plans) =>
          plans[0]?.references.some((item) => item.id === referenceId),
        );
        if (!groupContexts?.length)
          throw new Error(
            `${label}: the Medium anchor is unavailable. Repair its source reference.`,
          );
        for (const context of groupContexts) {
          const anchor = context.references.find(
            (item) => item.id === referenceId,
          )!;
          runs.push({
            context,
            mappings: tshirtMappings(
              group.bindings[0].rule,
              anchor,
              context.references,
              structureSizes(structure),
              { rules, scaleTypes },
            ),
          });
        }
      } else {
        const context: SourceContext = {
          kind: "baseline",
          context: {},
          selection: {},
          references: baselineReferences(),
        };
        runs.push({
          context,
          mappings: virtualMappings(
            structure,
            label,
            lead,
            group.bindings[0].rule,
            context.references,
            { rules, scaleTypes },
            linkedIds,
          ),
        });
      }
      for (const { context, mappings } of runs) {
        for (const mapping of mappings) {
          if (context.kind === "override" && !mapping.target.valueOverridden)
            continue;
          const classification = {
            ...group.classification,
            ...structureNameClassification(structure),
            [VARIANT_CATEGORY_IDS.size]: mapping.termId,
          };
          const conceptId = tokenUuid(
            `structure-semantic:v1:${structure.conceptId}:${canonicalJson(classification)}`,
          );
          const uuid = tokenUuid(
            `structure-semantic-row:v1:${conceptId}:${canonicalJson(context.context)}`,
          );
          const primitive = primitiveRecord(mapping.target, context);
          const token: TshirtTokenRecord = {
            uuid,
            name: {
              ...namingProjection.flat,
              [facet]: structureValue,
              property: group.property,
              ...(group.orientation && { orientation: group.orientation }),
              ...(group.position && { position: group.position }),
              size: generatorOutputName(mapping.termId, taxonomy),
              ...context.context,
            },
            ...(mapping.target.family === "elevation" && {
              $valueType: SHADOW_VALUE_TYPE,
            }),
            ...(mapping.target.hidden
              ? { value: primitive.token.value! }
              : { $ref: primitive.token.uuid }),
          };
          tokenRows.set(uuid, token);
          if (
            !mapping.target.hidden &&
            !primitiveRows.has(primitive.token.uuid)
          ) {
            primitiveRows.add(primitive.token.uuid);
            tokenRows.set(primitive.token.uuid, primitive.token);
            bundle.primitiveLineage.push({
              uuid: primitive.token.uuid,
              conceptId: primitive.conceptId,
              nativeReference: mapping.target.id,
              nativeId: mapping.target.nativeId,
              sourceId: mapping.target.sourceId,
              index: mapping.target.index,
              step: mapping.target.step!,
              context: context.context,
              selection: context.selection,
            });
          }
          const { target, ...details } = mapping;
          const row: TshirtSemanticRow = {
            token,
            conceptId,
            classification,
            structureId: structure.conceptId,
            structureName: label,
            bindingIds: group.bindings.map((item) => item.binding.id),
            applicationIds: [
              ...new Set(group.bindings.map((item) => item.application.id)),
            ],
            ruleIds: [...new Set(group.bindings.map((item) => item.rule.id))],
            size: mapping.size,
            target,
            ...(target.synthetic && { targetKind: "literal" as const }),
            context: context.context,
            selection: context.selection,
            kind: context.kind,
            mapping: details,
          };
          if (
            taxonomy.classifications[conceptId] ||
            (snapshot.browserTokenEdits?.[conceptId] &&
              !snapshot.browserTokenEdits[conceptId].authoring)
          )
            throw new Error(
              "Generated variants cannot have direct token or classification overrides. Edit their source, Structure or rule.",
            );
          bundle.semantics.push(row);
          if (mapping.warning)
            bundle.diagnostics.push({
              severity: "warning",
              code: "$ref" in lead ? "nearest" : "derived",
              message: `${formatTshirtName(token.name)}: ${mapping.warning}`,
              structureId: structure.conceptId,
              bindingIds: row.bindingIds,
              ruleIds: row.ruleIds,
              size: mapping.size,
              requested: mapping.requested,
              actual: mapping.actual,
              targetId: mapping.target.id,
              context: context.context,
            });
          if (
            !mapping.target.synthetic &&
            !bundle.vocabulary.foundationScales.some(
              (item) => item.sourceId === mapping.target.sourceId,
            )
          )
            bundle.vocabulary.foundationScales.push({
              sourceId: mapping.target.sourceId,
              label: mapping.target.sourceName!,
              value: foundationNameSegment(mapping.target.sourceName!),
            });
          for (const axis of snapshot.modeSets)
            if (context.context[axis.key] !== undefined) usedAxes.add(axis.id);
        }
      }
    }
  }
  for (const axis of snapshot.modeSets.filter((axis) =>
    usedAxes.has(axis.id),
  )) {
    if (TSHIRT_NAMING_FIELDS.some((field) => field.name === axis.key))
      throw new Error(
        `Mode key "${axis.key}" conflicts with a semantic field.`,
      );
    const field = {
      specVersion: "1.0.0-draft",
      name: axis.key,
      kind: "mode-set",
      registry: null,
      validation: "advisory",
      serialization: { position: 100 + bundle.modeSets.length },
      scope: null,
      required: false,
      valueType: "string",
    };
    assertTshirtField(field);
    bundle.fields.push(field);
    bundle.modeSets.push({
      id: axis.id,
      key: axis.key,
      defaultModeId: axis.defaultModeId,
      modes: axis.modes.map(({ id, key }) => ({ id, key })),
    });
  }
  bundle.tokens = [...tokenRows.values()].sort((left, right) =>
    left.uuid.localeCompare(right.uuid),
  );
  if (bundle.semantics.length > 20000)
    throw new Error("T-shirt output exceeds the 20,000-row limit.");
  if (
    new Set(bundle.semantics.map((row) => row.token.uuid)).size !==
    bundle.semantics.length
  )
    throw new Error(
      "Generated semantic identities collide. Review Structure names and grouping.",
    );
  assertTshirtGraph(
    bundle.tokens,
    undefined,
    bundle.vocabulary.sizes?.map((term) => term.value),
  );
  const declared = new Set(
    bundle.fields.flatMap((field) =>
      "name" in field && typeof field.name === "string" ? [field.name] : [],
    ),
  );
  for (const token of bundle.tokens) {
    if (Object.keys(token.name).some((key) => !declared.has(key)))
      throw new Error("Generated output uses an undeclared name field.");
    if (
      token.name.structure &&
      !bundle.vocabulary.structures.some(
        (term) => term.value === token.name.structure,
      )
    )
      throw new Error("Generated output has an undeclared Structure term.");
    if (
      token.name.element &&
      !bundle.vocabulary.elements?.some(
        (term) => term.value === token.name.element,
      )
    )
      throw new Error(
        "Generated output has an undeclared Element naming term.",
      );
    if (
      token.name.foundationScale &&
      !bundle.vocabulary.foundationScales.some(
        (term) => term.value === token.name.foundationScale,
      )
    )
      throw new Error("Generated output has an undeclared foundation scale.");
    for (const axis of bundle.modeSets)
      if (
        token.name[axis.key] !== undefined &&
        !axis.modes.some((mode) => mode.key === token.name[axis.key])
      )
        throw new Error("Generated output has an undeclared mode value.");
  }
  return bundle;
}

export function selectedTshirtRows(
  bundle: TshirtArtifactBundle,
  structureId: string,
  size: string,
  selection: Record<string, string>,
  options?: Record<string, string>,
) {
  const context = Object.fromEntries(
    bundle.modeSets.map((axis) => [
      axis.key,
      axis.modes.find(
        (mode) => mode.id === (selection[axis.id] ?? axis.defaultModeId),
      )?.key,
    ]),
  );
  const rows = new Map<string, TshirtSemanticRow>();
  for (const row of bundle.semantics.filter(
    (row) =>
      row.structureId === structureId &&
      row.size === size &&
      (!row.optionId ||
        options === undefined ||
        (!!row.propertyId && options[row.propertyId] === row.optionId)) &&
      Object.entries(row.context).every(
        ([key, value]) => context[key] === value,
      ),
  )) {
    const previous = rows.get(row.conceptId);
    if (
      !previous ||
      Object.keys(row.context).length > Object.keys(previous.context).length ||
      row.kind === "override"
    )
      rows.set(row.conceptId, row);
  }
  return [...rows.values()];
}

export function tshirtPreview(
  structure: Structure,
  size: string,
  bundle: TshirtArtifactBundle,
  selection: Record<string, string>,
  references: readonly PrimitiveReference[],
  options: Record<string, string> = {},
  sizes: Partial<Record<StructureSlot, string>> = {},
  previewOnlySlots: readonly StructureSlot[] = [],
) {
  const configuredSizes = new Map(
    Object.entries(sizes).map(([slot, termId]) => [
      slot,
      generatorSizeKey(termId),
    ]),
  );
  const rows = [...new Set([size, ...configuredSizes.values()])]
    .flatMap((selectedSize) =>
      selectedTshirtRows(
        bundle,
        structure.conceptId,
        selectedSize,
        selection,
        options,
      ).filter((row) =>
        row.bindingIds.some((id) => {
          const binding = structure.properties.find((item) => item.id === id);
          const slot = binding && structureSlot(binding);
          return ((slot && configuredSizes.get(slot)) || size) === selectedSize;
        }),
      ),
    )
    .map((row) => liveTshirtRow(row, references));
  const assignments = new Map(
    rows.flatMap((row) =>
      row.bindingIds.flatMap((bindingId) => {
        const binding = structure.properties.find(
          (item) => item.id === bindingId,
        );
        const slot = binding && structureSlot(binding);
        return slot && previewOnlySlots.includes(slot)
          ? []
          : [[bindingId, row] as const];
      }),
    ),
  );
  for (const slot of STRUCTURE_SLOT_KEYS) {
    if (!configuredSizes.has(slot)) continue;
    const binding = structure.properties.find(
      (item) => structureSlot(item) === slot && isGeneratingBinding(item),
    );
    if (
      binding &&
      !previewOnlySlots.includes(slot) &&
      !assignments.has(binding.id)
    )
      throw new Error(
        `${structure.name}: the selected generated size for ${slot} is unavailable.`,
      );
  }
  const preview = {
    ...structure,
    properties: structure.properties.map((binding) => {
      const row = assignments.get(binding.id);
      if (!row || !isGeneratingBinding(binding)) return binding;
      const identity = { ...binding } as Partial<typeof binding> & {
        value?: unknown;
      };
      delete identity.value;
      return {
        ...identity,
        $ref: row.token.uuid,
      } as StructureBinding;
    }),
  };
  const resolved = rows.map(
    (row): PrimitiveReference => ({
      ...row.target,
      id: row.token.uuid,
      name: row.canonicalName ?? formatTshirtName(row.token.name),
    }),
  );
  return {
    structure: preview,
    references: [...references, ...resolved],
    rows,
    warnings: rows.flatMap((row) =>
      row.mapping.warning ? [row.mapping.warning] : [],
    ),
  };
}
export function liveTshirtRow(
  row: TshirtSemanticRow,
  references: readonly PrimitiveReference[],
): TshirtSemanticRow {
  const target =
    row.targetKind === "literal"
      ? row.target
      : references.find((reference) => reference.id === row.target.id);
  if (!target || target.family !== row.target.family || target.error)
    throw new Error(
      target?.error ?? "This generated target is unavailable in the preview.",
    );
  const value =
    target.family === "elevation"
      ? exactShadowValue(target.shadows ?? [])
      : target.unit === "multiplier"
        ? String(target.value)
        : exactDimensionValue(target.value);
  return {
    ...row,
    target,
    token: "$ref" in row.token ? row.token : { ...row.token, value },
  };
}
