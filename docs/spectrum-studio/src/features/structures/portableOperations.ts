// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyDocument } from "../taxonomy/model";
import { configuredStructure, ownedLayoutAt } from "./configuration";
import {
  EMPTY_STRUCTURE_PREVIEW,
  type StructurePreviewState,
} from "./variants";
import type { Structure } from "./model";
import type { StructureChild } from "./children";
import {
  fromPortableStructures,
  type StructureContractIssue,
  type StructureContractResult,
} from "./portableConversion";
import type {
  PortableStructuresDocument,
  StructureConfiguration,
  StructureTarget,
} from "./portableModel";

export interface StructureChoices {
  options: Readonly<Record<string, string>>;
  booleans: Readonly<Record<string, boolean>>;
}

export interface EffectiveStructureChild {
  authored: StructureChild;
  resolved?: StructureChild;
  visible: boolean;
  structure?: EffectiveStructure;
}

export interface EffectiveStructure {
  target: StructureTarget;
  authored: Structure;
  resolved: Structure;
  children: EffectiveStructureChild[];
  configuration: StructureConfiguration[];
  sizes: ReturnType<typeof configuredStructure>["sizes"];
  issues: string[];
}

function sameTarget(left: StructureTarget, right: StructureTarget) {
  return (
    left.structureId === right.structureId &&
    left.path.length === right.path.length &&
    left.path.every((id, index) => id === right.path[index])
  );
}

function sameField(
  left: StructureConfiguration,
  right: StructureConfiguration,
) {
  if (
    !sameTarget(left.target, right.target) ||
    left.when?.optionId !== right.when?.optionId ||
    left.when?.valueId !== right.when?.valueId ||
    left.effect.kind !== right.effect.kind
  )
    return false;
  const field = (entry: StructureConfiguration) => {
    const effect = entry.effect;
    return "bindingId" in effect
      ? effect.bindingId
      : "elementId" in effect
        ? effect.elementId
        : "";
  };
  return field(left) === field(right);
}

/** Replaces one authored field, never an entire parent configuration. */
export function setStructureConfiguration(
  document: PortableStructuresDocument,
  taxonomy: TaxonomyDocument,
  entry: StructureConfiguration,
): StructureContractResult<PortableStructuresDocument> {
  const updated = structuredClone(document);
  const owner = updated.structures.find(
    (structure) => structure.conceptId === entry.target.structureId,
  );
  if (!owner)
    return {
      status: "unavailable",
      issues: [
        {
          structureId: entry.target.structureId,
          message: "The configuration owner is unavailable.",
        },
      ],
    };
  const index = owner.configuration.findIndex((previous) =>
    sameField(previous, entry),
  );
  if (index < 0) owner.configuration.push(structuredClone(entry));
  else owner.configuration[index] = structuredClone(entry);
  const checked = fromPortableStructures(updated, taxonomy);
  return checked.status === "ready"
    ? { status: "ready", value: updated }
    : checked;
}

/**
 * A platform-independent graph for testing the cutover. It uses the existing
 * option resolver through the read bridge, not a second interpretation of effects.
 */
export function evaluatePortableStructure(
  document: PortableStructuresDocument,
  taxonomy: TaxonomyDocument,
  structureId: string,
  choices: Readonly<Record<string, StructureChoices>> = {},
): StructureContractResult<EffectiveStructure> {
  const restored = fromPortableStructures(document, taxonomy);
  if (restored.status !== "ready") return restored;
  const catalog = restored.value;
  const root = catalog.structures.find(
    (source) => source.conceptId === structureId,
  );
  if (!root)
    return {
      status: "unavailable",
      issues: [
        { structureId, message: "The requested Structure is unavailable." },
      ],
    };
  const previews: Record<string, StructurePreviewState> = Object.fromEntries(
    Object.entries(choices).map(([id, selected]) => [
      id,
      {
        ...EMPTY_STRUCTURE_PREVIEW,
        options: { ...selected.options },
        booleans: { ...selected.booleans },
      },
    ]),
  );
  const issues: StructureContractIssue[] = [];
  const visit = (
    owner: Structure,
    path: string[],
    selections: Readonly<Record<string, StructurePreviewState>>,
    ancestors: readonly string[],
  ): EffectiveStructure | undefined => {
    const source = path.length
      ? ownedLayoutAt(owner, `/${path.join("/")}`, catalog.structures)
      : owner;
    if (!source || ancestors.includes(source.conceptId)) {
      issues.push({
        structureId: owner.conceptId,
        message:
          "The Structure graph contains an unavailable or cyclic reference.",
      });
      return;
    }
    const effective = configuredStructure(
      owner,
      path.length ? `/${path.join("/")}` : "",
      catalog.structures,
      selections,
    );
    const visible = new Map(
      (effective.structure.elements ?? []).map((child) => [child.id, child]),
    );
    const authored = new Map(
      (source.elements ?? []).map((child) => [child.id, child]),
    );
    const children = effective.order.flatMap(
      (id): EffectiveStructureChild[] => {
        const child = authored.get(id);
        if (!child) return [];
        const node: EffectiveStructureChild = {
          authored: child,
          resolved: visible.get(id),
          visible: visible.has(id),
        };
        if (child.kind === "structureReference") {
          const definition = catalog.structures.find(
            (source) => source.conceptId === child.structureId,
          );
          if (!definition) {
            issues.push({
              structureId: source.conceptId,
              message: "A referenced Structure is unavailable.",
            });
            return [node];
          }
          node.structure =
            definition.parentStructureId === source.conceptId
              ? visit(owner, [...path, child.id], selections, [
                  ...ancestors,
                  source.conceptId,
                ])
              : visit(definition, [], {}, [...ancestors, source.conceptId]);
        }
        return [node];
      },
    );
    const target = { structureId: owner.conceptId, path };
    const configuration: StructureConfiguration[] = [];
    for (let depth = 0; depth <= path.length; depth++) {
      const ancestor = depth
        ? ownedLayoutAt(
            owner,
            `/${path.slice(0, depth).join("/")}`,
            catalog.structures,
          )!
        : owner;
      const definition = document.structures.find(
        (definition) => definition.conceptId === ancestor.conceptId,
      )!;
      configuration.push(
        ...definition.configuration.filter((entry) =>
          sameTarget(entry.target, {
            structureId: ancestor.conceptId,
            path: path.slice(depth),
          }),
        ),
      );
    }
    return {
      target,
      authored: source,
      resolved: effective.structure,
      children,
      configuration,
      sizes: effective.sizes,
      issues: effective.issues,
    };
  };
  const value = visit(root, [], previews, []);
  return value && !issues.length
    ? { status: "ready", value }
    : { status: "unavailable", issues };
}
