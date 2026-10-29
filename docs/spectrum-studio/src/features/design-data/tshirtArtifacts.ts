// Copyright 2026 Adobe. All rights reserved.
import type { ComponentSize } from "../foundations/componentSizes";
import type { ElevationDocument } from "../elevation/model";
import { generateElevation } from "../elevation/generate";
import { elevationOwnerIds } from "../elevation/output";
import { resolveElevationDocument } from "../elevation/resolution";
import { tshirtMappings } from "../logic/tshirt";
import { generateDimensionScale } from "../scales/foundation";
import { clampScaleRange } from "../scales/stepNames";
import { dimensionIssues } from "../scales/issues";
import {
  assertStructureTaxonomy,
  structureGeneration,
  type Structure,
  type StructuresDocument,
} from "../structures/model";
import {
  assertGenerationReferences,
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
  type TshirtTokenRecord,
} from "./tshirtProfile";
import type { TshirtArtifactBundle, TshirtSemanticRow } from "./tshirtTypes";
import { ELEMENT_CATEGORY_ID } from "../structures/elements";
import {
  ELEMENT_NAMING_FIELD,
  TSHIRT_COMPOSITION_PROFILE,
  TSHIRT_NAMING_FIELDS,
} from "./tshirtProfile";
import { withTaxonomyProjection } from "../taxonomy/model";
export type {
  TshirtArtifactBundle,
  TshirtSemanticRow,
  TshirtDiagnostic,
} from "./tshirtTypes";

export interface TshirtAuthoringSource extends DimensionAuthoringSource {
  structures?: StructuresDocument;
  elevation?: ElevationDocument;
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
        buildTshirtBatch(snapshot, sourceKind),
      )
    : buildTshirtBatch(snapshot, sourceKind);
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
  if (
    emitting.some(
      (source) =>
        structureGeneration(source).nameRef?.categoryId === ELEMENT_CATEGORY_ID,
    )
  ) {
    bundle.profile = structuredClone(TSHIRT_COMPOSITION_PROFILE);
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
        group.bindings.map((item) => item.binding.$ref),
      ),
    ),
  );
  const sourceIds = new Set<string>();
  for (const family of ["spacing", "size", "radius"] as const)
    for (const scale of snapshot[family]?.scales ?? []) {
      const { below, above } = clampScaleRange(scale.below, scale.above);
      if (
        Array.from({ length: below + above + 1 }, (_, index) =>
          primitiveReferenceId(family, scale.id, index - below),
        ).some((id) => required.has(id))
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
        !Array.from({ length: below + above + 1 }, (_, index) =>
          primitiveReferenceId(family, scale.id, index - below),
        ).some((id) => required.has(id))
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
  const owners = elevationOwnerIds(snapshot.modeSets);
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
  const tokenRows = new Map<string, TshirtTokenRecord>();
  const primitiveRows = new Set<string>();
  for (const structure of emitting) {
    assertGenerationReferences(
      structure,
      rules,
      [...contexts.values()].flatMap((plans) => plans[0]?.references ?? []),
    );
    const nameRef = structureGeneration(structure).nameRef!;
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
      const referenceId = group.bindings[0].binding.$ref;
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
        const mappings = tshirtMappings(
          group.bindings[0].rule,
          anchor,
          context.references,
          structureSizes(structure),
        );
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
              [facet]: structureValue,
              property: group.property,
              ...(group.orientation && { orientation: group.orientation }),
              ...(group.position && { position: group.position }),
              size: mapping.size,
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
            context: context.context,
            selection: context.selection,
            kind: context.kind,
            mapping: details,
          };
          if (
            taxonomy.classifications[conceptId] ||
            snapshot.browserTokenEdits?.[conceptId]
          )
            throw new Error(
              "Generated variants cannot have direct token or classification overrides. Edit their source, Structure or rule.",
            );
          bundle.semantics.push(row);
          if (mapping.warning)
            bundle.diagnostics.push({
              severity: "warning",
              code: "nearest",
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
  assertTshirtGraph(bundle.tokens);
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
  size: ComponentSize,
  selection: Record<string, string>,
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
  size: ComponentSize,
  bundle: TshirtArtifactBundle,
  selection: Record<string, string>,
  references: readonly PrimitiveReference[],
) {
  const rows = selectedTshirtRows(
    bundle,
    structure.conceptId,
    size,
    selection,
  ).map((row) => liveTshirtRow(row, references));
  const assignments = new Map(
    rows.flatMap((row) =>
      row.bindingIds.map((bindingId) => [bindingId, row] as const),
    ),
  );
  const preview = {
    ...structure,
    properties: structure.properties.map((binding) => {
      const row = assignments.get(binding.id);
      return row && "$ref" in binding
        ? { ...binding, $ref: row.token.uuid }
        : binding;
    }),
  };
  const resolved = rows.map(
    (row): PrimitiveReference => ({
      ...row.target,
      id: row.token.uuid,
      name: formatTshirtName(row.token.name),
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
  const target = references.find((reference) => reference.id === row.target.id);
  if (!target || target.family !== row.target.family || target.error)
    throw new Error(
      target?.error ?? "This generated target is unavailable in the preview.",
    );
  const value =
    target.family === "elevation"
      ? exactShadowValue(target.shadows ?? [])
      : exactDimensionValue(target.value);
  return {
    ...row,
    target,
    token: "$ref" in row.token ? row.token : { ...row.token, value },
  };
}
