// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "./state";
import {
  isRuleList,
  isTshirtRule,
  type TshirtSizingRule,
} from "../logic/model";
import { tshirtRatio } from "../logic/tshirt";
import { ruleAppliesTo } from "../logic/applicability";
import {
  createScaleType,
  isScaleType,
  TYPOGRAPHY_SCALE_TYPE_ID,
} from "../scales/scaleType";
import { generateDimensionScale } from "../scales/foundation";
import { primitiveReferenceId } from "../tokens/primitiveIdentity";
import {
  structureGeneration,
  structureSlot,
  structureSlotDefinition,
  type Structure,
  type StructureSelection,
  type StructureSlot,
  isStructuresDocument,
} from "../structures/model";
import { structureTokenGroups } from "../structures/generation";
import {
  createLayoutScale,
  type LayoutChanges,
  type LayoutScaleSource,
} from "../structures/layoutScales";
import { ownedLayoutAt } from "../structures/configuration";
import type { StructureOptionOverrides } from "../structures/variants";
import { isTaxonomyDocument } from "../taxonomy/model";
import { isSpacingDocument } from "../spacing/model";
import { isSizeDocument } from "../size/model";
import { isRadiusDocument } from "../radius/model";

type MigrationSource = LayoutScaleSource &
  Pick<EditSessionSnapshot, "structures">;
export function isLayoutScaleMigrationSource(
  value: unknown,
): value is MigrationSource {
  if (!value || typeof value !== "object") return false;
  return (
    "rules" in value &&
    isRuleList(value.rules) &&
    "structures" in value &&
    isStructuresDocument(value.structures) &&
    "taxonomy" in value &&
    isTaxonomyDocument(value.taxonomy) &&
    "scaleTypes" in value &&
    Array.isArray(value.scaleTypes) &&
    value.scaleTypes.every(isScaleType) &&
    "spacing" in value &&
    isSpacingDocument(value.spacing) &&
    "size" in value &&
    isSizeDocument(value.size) &&
    "radius" in value &&
    isRadiusDocument(value.radius)
  );
}

/** Upgrades one decoded source. Saved and working sources share allocations, not data. */
export function upgradeLayoutScalesSnapshot<Source extends MigrationSource>(
  source: Source,
  identities: Map<string, string> = new Map(),
): Source {
  const ratioRules =
    source.rules?.filter(
      (rule): rule is TshirtSizingRule =>
        isTshirtRule(rule) && rule.movement === "ratio",
    ) ?? [];
  if (!ratioRules.length) return source;
  if (!source.structures || !source.taxonomy || !source.scaleTypes)
    throw new Error(
      "Converting legacy ratio rules needs the Structure, Registry, and formula sources.",
    );
  let snapshot = structuredClone(source);
  const allocate = (key: string) => {
    const id = identities.get(key) ?? crypto.randomUUID();
    identities.set(key, id);
    return id;
  };
  const formulas = new Map<string, string>();
  for (const rule of ratioRules) {
    const ratioSource = rule.ratio;
    const linked =
      ratioSource?.kind === "parameter"
        ? source.scaleTypes.find((item) => item.id === ratioSource.scaleTypeId)
        : undefined;
    const ratio = tshirtRatio(rule, source.scaleTypes);
    if (
      linked?.id === TYPOGRAPHY_SCALE_TYPE_ID &&
      rule.ratio?.kind === "parameter" &&
      rule.ratio.parameterId === "ratio"
    ) {
      formulas.set(rule.id, linked.id);
    } else {
      const id = allocate(`legacy-ratio:${rule.id}:formula`);
      const template = createScaleType("geometric");
      let name = rule.name;
      let number = 2;
      while (
        snapshot.scaleTypes!.some(
          (formula) =>
            formula.name.trim().toLowerCase() === name.trim().toLowerCase(),
        )
      )
        name = `${rule.name} ${number++}`;
      const formula = {
        ...template,
        id,
        name,
        base: { ...template.base, overridable: true },
        parameters: template.parameters.map((parameter) => ({
          ...parameter,
          default: parameter.id === "ratio" ? ratio : 0,
          overridable: true,
        })),
      };
      snapshot = {
        ...snapshot,
        scaleTypes: [...snapshot.scaleTypes!, formula],
      };
      formulas.set(rule.id, id);
    }
  }
  const convert = (
    structure: Structure,
    selection: StructureSelection,
    slot: StructureSlot,
    rule: TshirtSizingRule,
    key: string,
  ): StructureSelection => {
    const family = structureSlotDefinition(slot).family;
    if (family !== "spacing" && family !== "size" && family !== "radius")
      throw new Error(
        `${structure.name}: legacy ratio generation uses an unsupported Foundation.`,
      );
    let base: number;
    if ("$ref" in selection) {
      const document = source[family];
      let found: number | undefined;
      for (const scale of document?.scales ?? []) {
        const value = generateDimensionScale(
          family,
          scale,
          source.rules,
          source.scaleTypes,
        ).find(
          (item) =>
            primitiveReferenceId(family, scale.id, item.index) ===
            selection.$ref,
        );
        if (value) found = value.value;
      }
      if (found === undefined)
        throw new Error(
          `${structure.name}: the legacy ratio anchor is unavailable. Restore its source before converting.`,
        );
      base = found;
    } else if (
      selection.value.kind === "number" &&
      selection.value.unit === "px"
    ) {
      base = selection.value.value;
    } else {
      // Centering remains owned by the existing content/min-height derivation.
      if (selection.value.kind === "derived") return selection;
      throw new Error(
        `${structure.name}: this legacy ratio value cannot become a dimension scale.`,
      );
    }
    const result = createLayoutScale(
      snapshot,
      family,
      base,
      formulas.get(rule.id)!,
      rule.mappings.map((item) => item.offset),
      rule.roundingRuleId ?? "rule-no-rounding",
      allocate,
      key,
      {
        componentSizeScaling: family === "spacing",
        validateBase: false,
        name: identities.get(`${key}:label`),
      },
    );
    snapshot = result.snapshot;
    identities.set(`${key}:label`, snapshot[family]!.scales[0].name);
    return { $ref: result.reference };
  };
  const convertOverrides = (
    structure: Structure,
    overrides: Record<string, StructureOptionOverrides> | undefined,
    key: string,
  ) => {
    if (!overrides) return overrides;
    return Object.fromEntries(
      Object.entries(overrides).map(([valueId, override]) => {
        const changes: LayoutChanges = {};
        const shared = new Map<string, StructureSelection>();
        for (const [field, selection] of Object.entries(override.slots ?? {})) {
          const slot = field as StructureSlot;
          if (
            !selection ||
            ("value" in selection && selection.value.kind !== "number")
          )
            continue;
          const binding = structure.properties.find(
            (item) => structureSlot(item) === slot,
          );
          if (!binding) continue;
          const family = structureSlotDefinition(slot).family;
          const application = structureGeneration(structure).applications.find(
            (item) => {
              const rule = ratioRules.find((rule) => rule.id === item.ruleId);
              return (
                rule &&
                family &&
                family !== "typography" &&
                ruleAppliesTo(rule, family) &&
                (item.targets.kind === "all" ||
                  item.targets.bindingIds.includes(binding.id))
              );
            },
          );
          const rule = ratioRules.find(
            (item) => item.id === application?.ruleId,
          );
          if (!rule) continue;
          const groupKey = JSON.stringify([family, rule.id, selection]);
          let replacement = shared.get(groupKey);
          if (!replacement) {
            replacement = convert(
              structure,
              selection,
              slot,
              rule,
              `${key}:${valueId}:${binding.id}`,
            );
            shared.set(groupKey, replacement);
          }
          changes[slot] = replacement;
        }
        return [
          valueId,
          {
            ...override,
            ...(override.slots && { slots: { ...override.slots, ...changes } }),
          },
        ];
      }),
    );
  };
  const structures = source.structures.structures.map((structure) => {
    const replacements = new Map<string, StructureSelection>();
    for (const group of structureTokenGroups(structure, source.rules!)) {
      const rule = group.bindings[0].rule;
      if (rule.movement !== "ratio") continue;
      const lead = group.bindings[0];
      const selection =
        "$ref" in lead.binding
          ? { $ref: lead.binding.$ref }
          : { value: lead.binding.value };
      const key = `legacy-ratio:${structure.conceptId}:${group.bindings.map((item) => item.binding.id).sort()[0]}`;
      const replacement = convert(structure, selection, lead.slot, rule, key);
      for (const item of group.bindings)
        replacements.set(item.binding.id, replacement);
    }
    const editor = structure.editor;
    const nextEditor = editor && {
      ...editor,
      overrides: convertOverrides(
        structure,
        editor.overrides,
        `legacy-ratio:${structure.conceptId}:options`,
      )!,
      ...(editor.layouts && {
        layouts: Object.fromEntries(
          Object.entries(editor.layouts).map(([path, configuration]) => {
            const target = ownedLayoutAt(
              structure,
              path,
              source.structures!.structures,
            );
            if (!target)
              throw new Error(
                "A legacy ratio configuration targets an unavailable owned layout.",
              );
            return [
              path,
              {
                ...configuration,
                ...(configuration.overrides && {
                  overrides: convertOverrides(
                    target,
                    configuration.overrides,
                    `legacy-ratio:${structure.conceptId}:${path}`,
                  ),
                }),
              },
            ];
          }),
        ),
      }),
    };
    return {
      ...structure,
      properties: structure.properties.map((binding) => {
        const replacement = replacements.get(binding.id);
        return replacement
          ? {
              id: binding.id,
              classification: binding.classification,
              ...replacement,
            }
          : binding;
      }),
      ...(nextEditor && { editor: nextEditor }),
    };
  });
  for (const family of ["spacing", "size", "radius"] as const) {
    const document = snapshot[family];
    if (!document) continue;
    const previousIds = new Set(
      source[family]?.scales.map((scale) => scale.id),
    );
    const existing = document.scales
      .filter((scale) => previousIds.has(scale.id))
      .sort(
        (left, right) =>
          source[family]!.scales.findIndex((scale) => scale.id === left.id) -
          source[family]!.scales.findIndex((scale) => scale.id === right.id),
      );
    snapshot = {
      ...snapshot,
      [family]: {
        ...document,
        scales: [
          ...existing,
          ...document.scales.filter((scale) => !previousIds.has(scale.id)),
        ],
      },
    };
  }
  return {
    ...snapshot,
    structures: { ...source.structures, structures },
    rules: source.rules!.map((rule) => {
      if (!isTshirtRule(rule) || rule.movement !== "ratio") return rule;
      const { ratio, roundingRuleId, ...rest } = rule;
      void ratio;
      void roundingRuleId;
      return { ...rest, movement: "available-token" };
    }),
  };
}
