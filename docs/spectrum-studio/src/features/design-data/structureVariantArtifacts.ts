// Copyright 2026 Adobe. All rights reserved.
import {
  hasVariantTokenNaming,
  mergeClassifications,
} from "../option-groups/model";
import { projectClassification } from "../taxonomy/model";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { semanticIdentityKey } from "../structures/semanticIdentity";
import {
  assignStructure,
  structureBinding,
  structureGeneration,
  structureSelection,
  type StructureRuleApplication,
  type StructureSelection,
  type StructureSlot,
} from "../structures/model";
import { structureEditor } from "../structures/variants";
import { configurationSources } from "../structures/configuration";
import { canonicalJson } from "./canonicalJson";
import type { TshirtAuthoringSource } from "./tshirtArtifacts";
import {
  assertTshirtGraph,
  TSHIRT_COMPOSITION_PROFILE,
  ELEMENT_NAMING_FIELD,
  TSHIRT_VARIANTS_PROFILE,
  GENERATOR_PROFILE,
  type TshirtTokenRecord,
} from "./tshirtProfile";
import type { TshirtArtifactBundle } from "./tshirtTypes";
import { appendStructureLeafRows } from "./structureVariantLeaves";
import { ELEMENT_CATEGORY_ID } from "../structures/elements";
import type { TshirtSizingRule } from "../logic/model";
import { SIZE_TERM_IDS } from "../taxonomy/variantVocabulary";

const inheritedBindingRule: TshirtSizingRule = {
  id: "structure-variant-inherited-binding",
  name: "Inherited binding",
  description: "",
  type: "tshirt-sizing",
  movement: "available-token",
  mappings: Object.values(SIZE_TERM_IDS).map((termId) => ({
    termId,
    offset: 0,
  })),
};

type BatchBuilder = (
  source: TshirtAuthoringSource,
  kind: TshirtArtifactBundle["sourceKind"],
) => TshirtArtifactBundle;

export function appendStructureVariantArtifacts(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
  build: BatchBuilder,
): TshirtArtifactBundle {
  if (!source.taxonomy || !source.structures) return bundle;
  const semanticCount = bundle.semantics.length;
  appendStructureLeafRows(source, bundle);
  const leafRows = bundle.semantics
    .slice(semanticCount)
    .filter((row) => row.token.name.element);
  if (leafRows.length) {
    if (!("extensionId" in bundle.profile))
      bundle.profile = structuredClone(TSHIRT_COMPOSITION_PROFILE);
    if (
      !bundle.fields.some(
        (field) => "name" in field && field.name === "element",
      )
    )
      bundle.fields.push(structuredClone(ELEMENT_NAMING_FIELD));
    bundle.vocabulary.elements ??= [];
    for (const row of leafRows) {
      const termId = row.classification[ELEMENT_CATEGORY_ID];
      const term = source.taxonomy.terms.find((item) => item.id === termId);
      if (
        term &&
        !bundle.vocabulary.elements.some((item) => item.id === term.id)
      )
        bundle.vocabulary.elements.push({
          id: term.id,
          label: String(term.value),
          value: String(row.token.name.element),
        });
    }
  }
  const densityCategoryId = source.taxonomy.categories.find(
    (category) => category.key === "density",
  )?.id;
  const tokens = new Map(bundle.tokens.map((token) => [token.uuid, token]));
  const names = new Map(
    bundle.semantics
      .filter((row) => row.canonicalName)
      .map((row) => [
        row.token.uuid,
        JSON.stringify([
          row.canonicalName,
          canonicalTokenModeKey(row.selection),
        ]),
      ]),
  );
  for (const structure of configurationSources(source.structures.structures)) {
    const editor = structureEditor(structure);
    for (const property of editor.properties) {
      if (property.kind !== "variant") continue;
      for (const option of property.options) {
        if (option.id === property.defaultOptionId) continue;
        if (!hasVariantTokenNaming(property, option)) continue;
        const override = editor.overrides[option.id];
        if (!override) continue;
        const changes: Partial<Record<StructureSlot, StructureSelection>> = {};
        for (const [key, selection] of Object.entries(override.slots ?? {})) {
          const slot = key as StructureSlot;
          if (
            !selection ||
            !(
              "$ref" in selection ||
              selection.value.kind === "number" ||
              selection.value.kind === "derived"
            ) ||
            JSON.stringify(selection) ===
              JSON.stringify(structureSelection(structure, slot))
          )
            continue;
          changes[slot] = selection;
        }
        const slots = Object.keys(changes) as StructureSlot[];
        if (!slots.length) continue;
        const effective = assignStructure(structure, changes);
        const generation = structureGeneration(structure);
        const inheritedRule: TshirtSizingRule = {
          ...inheritedBindingRule,
          type: "generator",
          applicability: { kind: "all" },
          defaultTermId: generation.sizeTermIds[0],
          mappings: generation.sizeTermIds.map((termId) => ({
            termId,
            offset: 0,
          })),
        };
        const applications = new Map<string, StructureRuleApplication>();
        const bindings = new Map(
          slots.map((slot) => [structureBinding(effective, slot)!.id, slot]),
        );
        for (const bindingId of bindings.keys()) {
          const application = generation.applications.find(
            (item) =>
              item.targets.kind === "all" ||
              item.targets.bindingIds.includes(bindingId),
          ) ?? {
            id: property.id,
            ruleId: inheritedBindingRule.id,
            targets: { kind: "all" as const },
          };
          const previous = applications.get(application.id);
          applications.set(application.id, {
            ...application,
            targets: {
              kind: "custom",
              bindingIds: [
                ...(previous?.targets.kind === "custom"
                  ? previous.targets.bindingIds
                  : []),
                bindingId,
              ],
            },
            previewTargets: { kind: "custom", bindingIds: [] },
          });
        }
        if (!generation.nameRef)
          throw new Error(
            `${structure.name}: choose its Registry token naming term in Appearance before changing a variant binding.`,
          );
        // A centered value reads Min height at each size, so keep its binding and rule.
        const minimum = structureBinding(effective, "minHeight");
        const centers = slots.some((slot) => {
          const selection = changes[slot]!;
          return "value" in selection && selection.value.kind === "derived";
        });
        const minimumApplications =
          centers && minimum
            ? generation.applications.filter(
                (item) =>
                  !applications.has(item.id) &&
                  (item.targets.kind === "all" ||
                    item.targets.bindingIds.includes(minimum.id)),
              )
            : [];
        const sourceStructure = { ...effective };
        delete sourceStructure.parentStructureId;
        const isolated = {
          ...sourceStructure,
          editor: undefined,
          elements: [],
          properties: effective.properties.filter(
            (item) =>
              bindings.has(item.id) ||
              !("$ref" in item) ||
              (minimumApplications.length > 0 && item.id === minimum?.id),
          ),
          generation: {
            ...generation,
            applications: [
              ...applications.values(),
              ...minimumApplications.map((item) => ({
                ...item,
                targets: { kind: "custom" as const, bindingIds: [minimum!.id] },
                previewTargets: { kind: "custom" as const, bindingIds: [] },
              })),
            ],
          },
        };
        const generated = build(
          {
            ...source,
            rules: [...(source.rules ?? []), inheritedRule],
            structures: { ...source.structures, structures: [isolated] },
          },
          bundle.sourceKind,
        );
        const semanticIds = new Set(
          generated.semantics.map((row) => row.token.uuid),
        );
        for (const token of generated.tokens)
          if (!semanticIds.has(token.uuid)) tokens.set(token.uuid, token);
        for (const lineage of generated.primitiveLineage)
          if (
            !bundle.primitiveLineage.some((item) => item.uuid === lineage.uuid)
          )
            bundle.primitiveLineage.push(lineage);
        for (const row of generated.semantics) {
          if (!row.bindingIds.some((id) => bindings.has(id))) continue;
          const optionCategories = new Set(Object.keys(option.classification));
          const baseClassification = Object.fromEntries(
            Object.entries(row.classification).filter(
              ([categoryId]) => !optionCategories.has(categoryId),
            ),
          );
          const merged = mergeClassifications(
            baseClassification,
            property.classification,
            option.classification,
          );
          if (merged.issues.length) throw new Error(merged.issues.join(" "));
          const projection = projectClassification(
            source.taxonomy,
            merged.classification,
            "structures",
          );
          if (projection.issues.length)
            throw new Error(projection.issues.join(" "));
          const identity =
            editor.semanticIdentities?.[option.id]?.[
              semanticIdentityKey(bindings.get(row.bindingIds[0])!, row.size)
            ];
          const uuid = identity?.rows[canonicalTokenModeKey(row.selection)];
          if (!identity || !uuid)
            throw new Error(
              `${structure.name}: this variant's stored token identity is unavailable. Reapply its binding.`,
            );
          const name = Object.fromEntries(
            projection.segments.map((segment) => [
              segment.key === "axis" &&
              densityCategoryId !== undefined &&
              option.classification[densityCategoryId] !== undefined
                ? "orientation"
                : segment.key,
              segment.values
                .map((value) => kebabCaseNameFormatter.formatValue(value))
                .join("-"),
            ]),
          );
          const token: TshirtTokenRecord = {
            ...row.token,
            uuid,
            name: {
              ...row.token.name,
              ...name,
              size: row.token.name.size,
              ...row.context,
            },
          };
          const canonicalName = projection.name;
          const semantic = {
            ...row,
            token,
            conceptId: identity.conceptId,
            classification: merged.classification,
            canonicalName,
            propertyId: property.id,
            optionId: option.id,
            applicationIds: row.applicationIds.filter(
              (id) => applications.get(id)?.ruleId !== inheritedBindingRule.id,
            ),
            ruleIds: row.ruleIds.filter((id) => id !== inheritedBindingRule.id),
          };
          const existing = bundle.semantics.find(
            (item) =>
              item.token.uuid === uuid &&
              item.kind === semantic.kind &&
              canonicalJson(item.context) === canonicalJson(semantic.context),
          );
          if (existing) {
            if (canonicalJson(existing) !== canonicalJson(semantic))
              throw new Error(
                `${structure.name} / ${property.name} / ${option.name}: generated identity ${uuid} has conflicting owned-layout assignments.`,
              );
            continue;
          }
          tokens.set(uuid, token);
          names.set(
            uuid,
            JSON.stringify([
              canonicalName,
              canonicalTokenModeKey(row.selection),
            ]),
          );
          bundle.semantics.push(semantic);
        }
        bundle.diagnostics.push(...generated.diagnostics);
        for (const field of generated.fields)
          if (
            !bundle.fields.some(
              (item) => JSON.stringify(item) === JSON.stringify(field),
            )
          )
            bundle.fields.push(field);
        for (const axis of generated.modeSets)
          if (!bundle.modeSets.some((item) => item.id === axis.id))
            bundle.modeSets.push(axis);
        for (const scale of generated.vocabulary.foundationScales)
          if (
            !bundle.vocabulary.foundationScales.some(
              (item) => item.sourceId === scale.sourceId,
            )
          )
            bundle.vocabulary.foundationScales.push(scale);
        for (const kind of ["structures", "elements", "sizes"] as const) {
          for (const term of generated.vocabulary[kind] ?? []) {
            const vocabulary = (bundle.vocabulary[kind] ??= []);
            if (!vocabulary.some((item) => item.id === term.id))
              vocabulary.push(term);
          }
          if (generated.vocabulary.sizes)
            bundle.profile = structuredClone(GENERATOR_PROFILE);
        }
      }
    }
  }
  if (bundle.semantics.some((row) => row.optionId)) {
    if (!bundle.vocabulary.sizes)
      bundle.profile = structuredClone(TSHIRT_VARIANTS_PROFILE);
    bundle.vocabulary.elements ??= [];
    if (
      !bundle.fields.some(
        (field) => "name" in field && field.name === "element",
      )
    )
      bundle.fields.push(structuredClone(ELEMENT_NAMING_FIELD));
    for (const row of bundle.semantics.filter(
      (item) => item.optionId && item.token.name.element,
    )) {
      const category = source.taxonomy.categories.find(
        (item) => item.key === "element",
      )!;
      const id = row.classification[category.id];
      const term = source.taxonomy.terms.find((item) => item.id === id);
      if (
        term &&
        !bundle.vocabulary.elements.some((item) => item.id === term.id)
      )
        bundle.vocabulary.elements.push({
          id: term.id,
          label: String(term.value),
          value: row.token.name.element,
        });
    }
    for (const category of source.taxonomy.categories.filter((item) =>
      item.scopes.includes("structures"),
    )) {
      if (
        !bundle.fields.some(
          (field) => "name" in field && field.name === category.key,
        )
      )
        bundle.fields.push({
          specVersion: "1.0.0-draft",
          name: category.key,
          kind: "semantic",
          valueType: "string",
          registry: null,
          validation: "advisory",
          serialization: {
            position: source.taxonomy.order.indexOf(category.id),
          },
          scope: null,
          required: false,
        });
    }
    for (const axis of source.modeSets) {
      if (
        !bundle.semantics.some((row) => row.context[axis.key] !== undefined) ||
        bundle.modeSets.some((item) => item.id === axis.id)
      )
        continue;
      bundle.modeSets.push({
        id: axis.id,
        key: axis.key,
        defaultModeId: axis.defaultModeId,
        modes: axis.modes.map(({ id, key }) => ({ id, key })),
      });
      bundle.fields.push({
        specVersion: "1.0.0-draft",
        name: axis.key,
        kind: "mode-set",
        registry: null,
        validation: "advisory",
        serialization: { position: 100 + bundle.modeSets.length },
        scope: null,
        required: false,
        valueType: "string",
      });
    }
  }
  if (bundle.semantics.length > 20000)
    throw new Error("Variant output exceeds the 20,000-row limit.");
  bundle.tokens = [...tokens.values()].sort((left, right) =>
    left.uuid.localeCompare(right.uuid),
  );
  assertTshirtGraph(
    bundle.tokens,
    (token) => names.get(token.uuid),
    bundle.vocabulary.sizes?.map((term) => term.value),
  );
  return bundle;
}
