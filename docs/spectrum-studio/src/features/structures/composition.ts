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
import { structureGeneration, type Structure } from "./model";

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
): ResolvedComposition {
  assertStructureGraph(catalog);
  const byId = new Map(catalog.map((source) => [source.conceptId, source]));
  const visit = (
    structure: Structure,
    wanted: string,
    context: PreviewLayoutContext,
    path: string,
  ): ResolvedComposition => {
    const size = supportedStructureSize(structure, wanted, rules);
    const preview = bundle
      ? tshirtPreview(
          structure,
          size,
          bundle,
          selection,
          references,
          path === "" ? options : {},
        )
      : undefined;
    const resolved = resolveStructure(
      preview?.structure ?? structure,
      preview?.references ?? references,
      context,
    );
    const leaves = new Map(
      resolveElements(structure, references, rules, size).map((leaf) => [
        leaf.element.id,
        leaf,
      ]),
    );
    const children = (structure.elements ?? []).map((child): ResolvedChild => {
      if (isLeaf(child)) return leaves.get(child.id)!;
      const target = byId.get(child.structureId);
      if (!target)
        throw new Error(
          `${structure.name}: referenced Structure ${child.structureId} is unavailable.`,
        );
      const childPath = `${path}/${child.id}`;
      return {
        instance: child,
        composition: visit(
          target,
          size,
          measurements[childPath] ?? UNMEASURED_LAYOUT,
          childPath,
        ),
      };
    });
    return {
      structure,
      size,
      resolved,
      children,
      issues: [
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
  return visit(source, requested, layout, "");
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
