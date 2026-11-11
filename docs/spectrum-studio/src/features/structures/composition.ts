// Copyright 2026 Adobe. All rights reserved.
import { COMPONENT_SIZES } from "../foundations/componentSizes";
import { generatorSizeKey } from "../logic/generator";
import { isTshirtRule } from "../logic/model";
import type { Rule } from "../logic/model";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import {
  tshirtPreview,
  type TshirtArtifactBundle,
} from "../design-data/tshirtArtifacts";
import {
  assertStructureGraph,
  isLeaf,
  type StructureInstance,
} from "./children";
import { structureSizes } from "./generation";
import { resolveElements, type ResolvedElement } from "./elementResolution";
import {
  resolveStructure,
  UNMEASURED_LAYOUT,
  type PreviewLayoutContext,
} from "./resolution";
import { structureGeneration, structureSlot, type Structure } from "./model";
import {
  EMPTY_STRUCTURE_PREVIEW,
  type StructurePreviewState,
} from "./variants";
import {
  configuredStructure,
  structureConfigurationIssues,
} from "./configuration";
import type { TextStyleSource } from "../styles/textAppearance";

export interface ResolvedModule {
  instance: StructureInstance;
  composition: ResolvedComposition;
}
export type ResolvedChild = ResolvedElement | ResolvedModule;
export interface ResolvedComposition {
  structure: Structure;
  size: string;
  resolved: ReturnType<typeof resolveStructure>;
  children: ResolvedChild[];
  issues: string[];
  warnings: string[];
}
export function structureHasIndentation(
  structure: Structure,
  catalog: readonly Structure[],
  visited = new Set<string>(),
): boolean {
  if (visited.has(structure.conceptId)) return false;
  visited.add(structure.conceptId);
  if (
    structure.properties.some((binding) => structureSlot(binding) === "indent")
  )
    return true;
  return (structure.elements ?? []).some((child) => {
    if ("structureId" in child) {
      const target = catalog.find(
        (item) => item.conceptId === child.structureId,
      );
      return target ? structureHasIndentation(target, catalog, visited) : false;
    }
    return false;
  });
}
export function supportedStructureSize(
  source: Structure,
  requested: string,
  rules: readonly Rule[] = [],
) {
  const mapped = structureGeneration(source)
    .applications.map((application) =>
      rules.find((rule) => rule.id === application.ruleId),
    )
    .filter((rule) => rule !== undefined && isTshirtRule(rule))
    .find((rule) =>
      rule.mappings.some(
        (mapping) => generatorSizeKey(mapping.termId) === requested,
      ),
    );
  const order: string[] = mapped
    ? mapped.mappings.map((mapping) => generatorSizeKey(mapping.termId))
    : COMPONENT_SIZES.map((size) => size.id);
  const available = structureSizes(source);
  if (!available.length) throw new Error(`${source.name}: no supported sizes.`);
  if (available.includes(requested)) return requested;
  if (
    !order.includes(requested) ||
    !available.some((size) => order.includes(size))
  )
    throw new Error(
      `${source.name}: this Size option has no mapping in the attached Generator.`,
    );
  const distance = (size: string) =>
    !order.includes(size)
      ? Infinity
      : Math.abs(order.indexOf(size) - order.indexOf(requested));
  return [...available].sort(
    (a, b) =>
      distance(a) - distance(b) ||
      (a === "m" ? -1 : b === "m" ? 1 : order.indexOf(a) - order.indexOf(b)),
  )[0];
}
export function resolveComposition(
  source: Structure,
  catalog: readonly Structure[],
  references: readonly PrimitiveReference[],
  rules: readonly Rule[],
  bundle?: TshirtArtifactBundle,
  selection: Record<string, string> = {},
  requested: string = "m",
  layout = UNMEASURED_LAYOUT,
  measurements: Readonly<Record<string, PreviewLayoutContext>> = {},
  options: Record<string, string> = {},
  indentationLevel: 0 | 1 | 2 = 1,
  previews: Readonly<Record<string, StructurePreviewState>> = {},
  textStyles?: TextStyleSource,
): ResolvedComposition {
  assertStructureGraph(catalog);
  const byId = new Map(catalog.map((source) => [source.conceptId, source]));
  const rootPreviews = {
    ...previews,
    [source.conceptId]: {
      ...EMPTY_STRUCTURE_PREVIEW,
      ...previews[source.conceptId],
      options: { ...previews[source.conceptId]?.options, ...options },
      indentationLevel,
    },
  };
  const visit = (
    structure: Structure,
    wanted: string,
    context: PreviewLayoutContext,
    path: string,
    configurationRoot: Structure,
    configurationPath: string,
    configurationPreviews: Readonly<Record<string, StructurePreviewState>>,
  ): ResolvedComposition => {
    const configured = configuredStructure(
      configurationRoot,
      configurationPath,
      catalog,
      configurationPreviews,
    );
    const effective = configured.structure;
    const size = supportedStructureSize(structure, wanted, rules);
    const preview = bundle
      ? tshirtPreview(
          effective,
          size,
          bundle,
          selection,
          references,
          configured.options,
          configured.sizes,
          configured.previewOnlySlots,
        )
      : undefined;
    const resolved = resolveStructure(
      preview?.structure ?? effective,
      preview?.references ?? references,
      context,
      indentationLevel,
    );
    const leaves = new Map(
      resolveElements(effective, references, rules, size, textStyles).map(
        (leaf) => [leaf.element.id, leaf],
      ),
    );
    const children = (effective.elements ?? []).map((child): ResolvedChild => {
      if (isLeaf(child)) return leaves.get(child.id)!;
      const target = byId.get(child.structureId);
      if (!target)
        throw new Error(
          `${structure.name}: referenced Structure ${child.structureId} is unavailable.`,
        );
      const childPath = `${path}/${child.id}`;
      const owned = target.parentStructureId === structure.conceptId;
      return {
        instance: child,
        composition: visit(
          target,
          size,
          measurements[childPath] ?? UNMEASURED_LAYOUT,
          childPath,
          owned ? configurationRoot : target,
          owned ? `${configurationPath}/${child.id}` : "",
          owned ? configurationPreviews : {},
        ),
      };
    });
    return {
      structure: effective,
      size,
      resolved,
      children,
      issues: [
        ...configured.issues,
        ...structureConfigurationIssues(structure, catalog),
        ...Object.values(resolved.issues),
        ...children.flatMap((child) =>
          "composition" in child ? child.composition.issues : child.issues,
        ),
      ],
      warnings: [
        ...(size !== wanted
          ? [
              `${structure.name}: ${wanted.toUpperCase()} is unavailable; showing ${size.toUpperCase()}.`,
            ]
          : []),
        ...(preview?.warnings ?? []),
        ...children.flatMap((child) =>
          "composition" in child ? child.composition.warnings : child.warnings,
        ),
      ],
    };
  };
  return visit(source, requested, layout, "", source, "", rootPreviews);
}

export function resolveCompositionResult(
  ...input: Parameters<typeof resolveComposition>
) {
  try {
    return { status: "ready" as const, value: resolveComposition(...input) };
  } catch (failure) {
    return {
      status: "error" as const,
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
}
