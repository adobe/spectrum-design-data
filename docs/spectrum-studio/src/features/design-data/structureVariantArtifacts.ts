// Copyright 2026 Adobe. All rights reserved.
import { mergeClassifications } from "../option-groups/model";
import { projectClassification } from "../taxonomy/model";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { semanticIdentityKey } from "../structures/semanticIdentity";
import {
  assignStructure,
  structureBinding,
  structureGeneration,
  structureSelection,
  structureSlot,
  type StructureSlot,
} from "../structures/model";
import { structureEditor } from "../structures/variants";
import type { TshirtAuthoringSource } from "./tshirtArtifacts";
import {
  assertTshirtGraph,
  ELEMENT_NAMING_FIELD,
  TSHIRT_VARIANTS_PROFILE,
  GENERATOR_PROFILE,
  type TshirtTokenRecord,
} from "./tshirtProfile";
import type { TshirtArtifactBundle } from "./tshirtTypes";
import { appendVariantLeafRows } from "./structureVariantLeaves";
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
  appendVariantLeafRows(source, bundle);
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
  for (const structure of source.structures.structures) {
    const editor = structureEditor(structure);
    for (const property of editor.properties) {
      if (property.kind !== "variant") continue;
      for (const option of property.options) {
        if (option.id === property.defaultOptionId) continue;
        const override = editor.overrides[option.id];
        if (!override) continue;
        for (const [key, selection] of Object.entries(override.slots ?? {})) {
          const slot = key as StructureSlot;
          if (
            !selection ||
            !("$ref" in selection) ||
            JSON.stringify(selection) ===
              JSON.stringify(structureSelection(structure, slot))
          )
            continue;
          const effective = assignStructure(structure, { [slot]: selection });
          const binding = structureBinding(effective, slot)!;
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
          const application = generation.applications.find(
            (item) =>
              item.targets.kind === "all" ||
              item.targets.bindingIds.includes(binding.id),
          ) ?? {
            id: property.id,
            ruleId: inheritedBindingRule.id,
            targets: { kind: "all" as const },
          };
          if (!generation.nameRef)
            throw new Error(
              `${structure.name}: choose its Registry token naming term in Appearance before changing a variant binding.`,
            );
          const isolated = {
            ...effective,
            editor: undefined,
            elements: [],
            properties: effective.properties.filter(
              (item) => structureSlot(item) === slot || !("$ref" in item),
            ),
            generation: {
              ...generation,
              applications: [
                {
                  ...application,
                  targets: {
                    kind: "custom" as const,
                    bindingIds: [binding.id],
                  },
                  previewTargets: { kind: "custom" as const, bindingIds: [] },
                },
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
              !bundle.primitiveLineage.some(
                (item) => item.uuid === lineage.uuid,
              )
            )
              bundle.primitiveLineage.push(lineage);
          for (const row of generated.semantics) {
            const merged = mergeClassifications(
              row.classification,
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
                semanticIdentityKey(slot, row.size)
              ];
            const uuid = identity?.rows[canonicalTokenModeKey(row.selection)];
            if (!identity || !uuid)
              throw new Error(
                `${structure.name}: this variant's stored token identity is unavailable. Reapply its binding.`,
              );
            const name = Object.fromEntries(
              projection.segments.map((segment) => [
                segment.key,
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
            tokens.set(uuid, token);
            names.set(
              uuid,
              JSON.stringify([
                canonicalName,
                canonicalTokenModeKey(row.selection),
              ]),
            );
            bundle.semantics.push({
              ...row,
              token,
              conceptId: identity.conceptId,
              classification: merged.classification,
              canonicalName,
              propertyId: property.id,
              optionId: option.id,
              ...(application.ruleId === inheritedBindingRule.id && {
                applicationIds: [],
                ruleIds: [],
              }),
            });
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
