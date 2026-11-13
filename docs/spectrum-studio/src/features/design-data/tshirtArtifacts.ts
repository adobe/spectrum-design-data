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
import { resolveTypographyDocument } from "../typography/resolution";
import { resolveModeParameterValues } from "../modes/parameterResolution";
import { parameterOwners } from "../modes/parameters";
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
  contextForModes,
} from "../modes/combinations";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { scaleIdentityContext } from "../modes/scaleKeys";
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
import {
  tokenEdit,
  tokenIdentity,
  tokenIdentityRow,
} from "../tokens/canonicalIdentity";
import { canonicalTokenByUuid } from "../tokens/canonicalCatalogue";
import { isLeaf } from "../structures/children";
export type {
  TshirtArtifactBundle,
  TshirtSemanticRow,
  TshirtDiagnostic,
} from "./tshirtTypes";

export interface TshirtAuthoringSource extends DimensionAuthoringSource {
  styles?: import("../styles/model").StylesDocument;
  structures?: StructuresDocument;
  elevation?: ElevationDocument;
  opacity?: OpacityDocument;
  interpolations?: import("../scales/interpolationDefinition").Interpolation[];
  tokenOverrides?: import("../tokens/model").TokenOverrideMap;
  /** Tokens linked across all structures, kept when a build isolates one structure. */
  linkedReferenceIds?: readonly string[];
}
const buildCounts = { full: 0, focused: 0 };
/** Counts token-set generations so timing tests can detect repeated work. */
export function tshirtBuildStats() {
  return { ...buildCounts };
}
export function buildFocusedTshirtArtifacts(
  source: TshirtAuthoringSource,
  structureId: string | null,
): TshirtArtifactBundle {
  const catalog = source.structures?.structures ?? [];
  const byId = new Map(
    catalog.map((structure) => [structure.conceptId, structure]),
  );
  const owned = new Map<string, string[]>();
  for (const structure of catalog) {
    if (!structure.parentStructureId) continue;
    const children = owned.get(structure.parentStructureId) ?? [];
    children.push(structure.conceptId);
    owned.set(structure.parentStructureId, children);
  }
  const scope = new Set(structureId ? [structureId] : []);
  for (const id of scope) {
    const structure = byId.get(id);
    if (!structure) throw new Error(`Structure ${id} is no longer available.`);
    if (structure.parentStructureId) scope.add(structure.parentStructureId);
    for (const child of structure.elements ?? [])
      if (!isLeaf(child)) scope.add(child.structureId);
    for (const childId of owned.get(id) ?? []) scope.add(childId);
  }
  if (!source.structures)
    throw new Error("Structure preview needs an available authoring document.");
  buildCounts.focused++;
  return generateTshirtArtifacts({
    ...source,
    structures: {
      ...source.structures,
      structures: catalog.filter((structure) => scope.has(structure.conceptId)),
    },
    linkedReferenceIds:
      source.linkedReferenceIds ??
      catalog.flatMap((structure) =>
        structure.properties.flatMap((binding) =>
          "$ref" in binding ? [binding.$ref] : [],
        ),
      ),
  });
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
  modeSets: TshirtAuthoringSource["modeSets"],
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
          `dimension-row:${conceptId}:${canonicalJson(scaleIdentityContext(context.context, modeSets))}`,
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
  buildCounts.full++;
  return generateTshirtArtifacts(snapshot, sourceKind);
}
function generateTshirtArtifacts(
  snapshot: TshirtAuthoringSource,
  sourceKind: TshirtArtifactBundle["sourceKind"] = "working",
): TshirtArtifactBundle {
  const bundle = snapshot.taxonomy
    ? withTaxonomyProjection(snapshot.taxonomy, () =>
        appendStructureVariantArtifacts(
          snapshot,
          buildTshirtBatch(snapshot, sourceKind),
          buildTshirtBatch,
        ),
      )
    : buildTshirtBatch(snapshot, sourceKind);
  const replacements = new Map<string, TshirtTokenRecord>();
  const edits = snapshot.browserTokenEdits ?? {};
  for (const lineage of bundle.primitiveLineage) {
    const identity = tokenIdentity(edits, lineage.nativeId);
    if (!identity) continue;
    const overrideContext = canonicalTokenModeKey(
      Object.fromEntries(
        snapshot.modeSets.flatMap((axis) => {
          const mode = axis.modes.find(
            (mode) => mode.key === lineage.context[axis.key],
          );
          return mode ? [[axis.id, mode.id]] : [];
        }),
      ),
    );
    const uuid = tokenEdit(edits, lineage.nativeId)?.values[overrideContext]
      ? identity.rows[overrideContext]
      : (identity.rows[overrideContext] ??
        tokenIdentityRow(identity, snapshot.modeSets, lineage.context));
    if (!uuid) continue;
    const rowContext = Object.keys(identity.rows).find(
      (key) => identity.rows[key] === uuid,
    )!;
    const conditions = Object.fromEntries(
      (JSON.parse(rowContext) as [string, string][]).flatMap(
        ([axisId, modeId]) => {
          const axis = snapshot.modeSets.find((axis) => axis.id === axisId);
          const mode = axis?.modes.find((mode) => mode.id === modeId);
          return axis && mode ? [[axis.key, mode.key]] : [];
        },
      ),
    );
    const original = bundle.tokens.find((token) => token.uuid === lineage.uuid);
    if (!original) continue;
    replacements.set(original.uuid, {
      ...original,
      uuid,
      conceptId: identity.conceptId,
      name: canonicalTokenByUuid.get(uuid)?.name ?? {
        ...identity.name,
        ...conditions,
      },
    });
    lineage.uuid = uuid;
    lineage.conceptId = identity.conceptId;
  }
  for (const row of bundle.semantics) {
    const identity = tokenIdentity(
      snapshot.browserTokenEdits ?? {},
      row.sourceId ?? row.conceptId,
    );
    if (!identity) continue;
    const context = canonicalTokenModeKey(
      Object.fromEntries(
        Object.entries(row.context).flatMap(([key, mode]) => {
          const axis = snapshot.modeSets.find((axis) => axis.key === key);
          const option = axis?.modes.find((option) => option.key === mode);
          return axis && option ? [[axis.id, option.id]] : [];
        }),
      ),
    );
    const uuid = identity.rows[context] ?? row.token.uuid;
    if (!identity.rows[context])
      bundle.diagnostics.push({
        severity: "warning",
        code: "identity",
        message: `${formatTshirtName(row.token.name)} needs a persisted row identity for ${context}.`,
        structureId: row.structureId,
        bindingIds: row.bindingIds,
        ruleIds: row.ruleIds,
        size: row.size,
        requested: row.mapping.requested,
        actual: row.mapping.actual,
        targetId: row.target.id,
        context: row.context,
      });
    const token = {
      ...row.token,
      uuid,
      conceptId: identity.conceptId,
      name: canonicalTokenByUuid.get(uuid)?.name ?? {
        ...identity.name,
        ...row.context,
      },
    };
    replacements.set(row.token.uuid, token);
    row.sourceId ??= row.conceptId;
    row.conceptId = identity.conceptId;
    row.token = token;
  }
  const tokens = new Map<string, TshirtTokenRecord>();
  for (const token of [
    ...bundle.tokens,
    ...bundle.semantics.map((row) => row.token),
  ]) {
    let next = replacements.get(token.uuid) ?? token;
    if (next.$ref && replacements.has(next.$ref))
      next = { ...next, $ref: replacements.get(next.$ref)!.uuid };
    const existing = tokens.get(next.uuid);
    if (existing && canonicalJson(existing) !== canonicalJson(next))
      throw new Error(
        `Generated token ${next.uuid} has conflicting publication records: ${canonicalJson(existing)} and ${canonicalJson(next)}. Review its source identities.`,
      );
    tokens.set(next.uuid, next);
  }
  bundle.tokens = [...tokens.values()];
  for (const row of bundle.semantics)
    row.token = tokens.get(row.token.uuid) ?? row.token;
  const names = new Map(
    bundle.semantics
      .filter((row) => row.optionId && row.canonicalName)
      .map((row) => [row.token.uuid, row.canonicalName]),
  );
  assertTshirtGraph(
    bundle.tokens,
    (token) => names.get(token.uuid),
    bundle.vocabulary.sizes?.map((term) => term.value),
    snapshot.modeSets,
  );
  return bundle;
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
  const parameterOwnership = parameterOwners(snapshot.modeSets);
  const defaults = Object.fromEntries(
    snapshot.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  );
  const parametersForSelection = (selection: Record<string, string>) =>
    resolveModeParameterValues(
      {
        color: snapshot.colorSystem,
        typography: snapshot.typography,
        componentSizing: snapshot.componentSizing,
      },
      modesForSelection(snapshot.modeSets, { ...defaults, ...selection }),
      undefined,
      { modeSets: snapshot.modeSets },
    );
  const typographyAxes = snapshot.modeSets.filter((axis) =>
    ["typography.textZoom", "typography.textSize"].some(
      (id) => parameterOwnership[id] === axis.id,
    ),
  );
  const typographyContexts = modeSelections(typographyAxes, defaults).map(
    (selection): SourceContext => {
      const modes = modesForSelection(snapshot.modeSets, selection);
      const isDefault = typographyAxes.every(
        (axis) => selection[axis.id] === axis.defaultModeId,
      );
      const document = resolveTypographyDocument(
        snapshot.typography,
        modes,
        undefined,
        { modeSets: snapshot.modeSets },
      );
      return {
        kind: isDefault ? "baseline" : "binding",
        selection,
        context: isDefault
          ? {}
          : contextForModes(
              typographyAxes,
              modesForSelection(typographyAxes, selection),
            ),
        references: primitiveReferencesFromOutputs(
          {
            spacing: [],
            size: [],
            radius: [],
            elevation: { document: elevation, levels: [] },
            typography: {
              document,
              values: generateTypography(
                document,
                undefined,
                rules,
                scaleTypes,
                snapshot.interpolations,
              ),
              naming: {
                registry: taxonomy,
                names: document.metricNames,
                outputUnit: document.outputUnit,
              },
            },
          },
          taxonomy,
        ),
      };
    },
  );
  contexts.set(sourceKey("typography", "metrics"), typographyContexts);
  const referencesForSelection = (selection: Record<string, string>) => {
    const active = { ...defaults, ...selection };
    return [...contexts.values()].flatMap((plans) => {
      const matches = plans.filter((plan) =>
        Object.entries(plan.context).every(([key, value]) => {
          const axis = snapshot.modeSets.find((set) => set.key === key);
          return axis?.modes.some(
            (mode) => mode.id === active[axis.id] && mode.key === value,
          );
        }),
      );
      const selected = matches.sort(
        (a, b) =>
          Number(b.kind === "override") - Number(a.kind === "override") ||
          Object.keys(b.context).length - Object.keys(a.context).length,
      )[0];
      return selected?.references ?? [];
    });
  };
  let baseline: PrimitiveReference[] | undefined;
  const baselineReferences = () =>
    (baseline ??= referencesForSelection(defaults));
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
        const componentAxis = snapshot.modeSets.find(
          (axis) => axis.id === parameterOwnership["size.componentSize"],
        );
        const componentContexts = groupContexts.flatMap((context) => {
          const anchor = context.references.find(
            (item) => item.id === referenceId,
          )!;
          if (
            anchor.family !== "spacing" ||
            anchor.componentSizeApplied ||
            !componentAxis ||
            context.context[componentAxis.key] !== undefined ||
            context.kind === "override"
          )
            return [context];
          return componentAxis.modes.map(
            (mode): SourceContext => ({
              ...context,
              kind:
                mode.id === componentAxis.defaultModeId
                  ? context.kind
                  : "binding",
              selection: { ...context.selection, [componentAxis.id]: mode.id },
              context:
                mode.id === componentAxis.defaultModeId
                  ? context.context
                  : { ...context.context, [componentAxis.key]: mode.key },
            }),
          );
        });
        for (const context of componentContexts) {
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
              {
                rules,
                scaleTypes,
                componentSize: parametersForSelection(context.selection)[
                  "size.componentSize"
                ],
              },
            ),
          });
        }
      } else {
        const dependencies = new Set<string>();
        if (lead.value.kind === "number") {
          const owner = parameterOwnership["size.componentSize"];
          if (owner) dependencies.add(owner);
        } else {
          const minimum = structure.properties.find(
            (item) => structureSlot(item) === "minHeight",
          );
          const ids = [
            lead.value.contentRef,
            ...(minimum && "$ref" in minimum ? [minimum.$ref] : []),
          ];
          for (const plans of contexts.values())
            if (
              plans.some((plan) =>
                plan.references.some((reference) => ids.includes(reference.id)),
              )
            )
              for (const plan of plans)
                for (const key of Object.keys(plan.context)) {
                  const axis = snapshot.modeSets.find((set) => set.key === key);
                  if (axis) dependencies.add(axis.id);
                }
          if (minimum && !("$ref" in minimum)) {
            const owner = parameterOwnership["size.componentSize"];
            if (owner) dependencies.add(owner);
          }
        }
        const virtualAxes = snapshot.modeSets.filter((axis) =>
          dependencies.has(axis.id),
        );
        for (const selection of modeSelections(virtualAxes, defaults)) {
          const isDefault = virtualAxes.every(
            (axis) => selection[axis.id] === axis.defaultModeId,
          );
          const context: SourceContext = {
            kind: isDefault ? "baseline" : "binding",
            context: isDefault
              ? {}
              : contextForModes(
                  virtualAxes,
                  modesForSelection(virtualAxes, selection),
                ),
            selection,
            references: referencesForSelection(selection),
          };
          runs.push({
            context,
            mappings: virtualMappings(
              structure,
              label,
              lead,
              group.bindings[0].rule,
              context.references,
              {
                rules,
                scaleTypes,
                componentSize:
                  parametersForSelection(selection)["size.componentSize"],
              },
              linkedIds,
            ),
          });
        }
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
            `structure-semantic-row:v1:${conceptId}:${canonicalJson(scaleIdentityContext(context.context, snapshot.modeSets))}`,
          );
          const primitive = primitiveRecord(
            mapping.target,
            context,
            snapshot.modeSets,
          );
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
    snapshot.modeSets,
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
