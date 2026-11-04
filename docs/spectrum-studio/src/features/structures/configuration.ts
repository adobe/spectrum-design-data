// Copyright 2026 Adobe. All rights reserved.
import { isLeaf } from "./children";
import {
  structureGeneration,
  type Structure,
  type StructuresDocument,
} from "./model";
import {
  EMPTY_STRUCTURE_PREVIEW,
  emptyStructureEditor,
  resolveStructureOptions,
  structureEditor,
  structureVariantIssues,
  reconcileVariantLayers,
  type StructureEditorData,
  type StructureLayoutConfiguration,
  type StructurePreviewState,
} from "./variants";

export function ownedLayoutAt(
  root: Structure,
  path: string,
  catalog: readonly Structure[],
): Structure | undefined {
  if (!/^\/[^/]+(?:\/[^/]+)*$/.test(path)) return;
  let current = root;
  for (const id of path.slice(1).split("/")) {
    const child = current.elements?.find((item) => item.id === id);
    if (!child || isLeaf(child)) return;
    const target = catalog.find((item) => item.conceptId === child.structureId);
    if (!target || target.parentStructureId !== current.conceptId) return;
    current = target;
  }
  return current;
}

export function layoutConfigurationEditor(
  root: Structure,
  configuration: StructureLayoutConfiguration,
): StructureEditorData {
  const editor = structureEditor(root);
  const optionIds = new Set(Object.keys(configuration.overrides ?? {}));
  const booleanIds = new Set(
    Object.values(configuration.visibilityBindings ?? {}).map(
      (binding) => binding.propertyId,
    ),
  );
  return {
    ...emptyStructureEditor(),
    ...configuration,
    properties: editor.properties.filter((property) =>
      property.kind === "boolean"
        ? booleanIds.has(property.id)
        : property.options.some((option) => optionIds.has(option.id)),
    ),
  };
}

export function configurationSources(
  catalog: readonly Structure[],
): Structure[] {
  return catalog.flatMap((root) => [
    root,
    ...Object.entries(root.editor?.layouts ?? {}).flatMap(
      ([path, configuration]) => {
        const target = ownedLayoutAt(root, path, catalog);
        return target
          ? [
              {
                ...target,
                editor: layoutConfigurationEditor(root, configuration),
              },
            ]
          : [];
      },
    ),
  ]);
}

export function structureConfigurationIssues(
  root: Structure,
  catalog: readonly Structure[],
): string[] {
  return Object.entries(root.editor?.layouts ?? {}).flatMap(
    ([path, configuration]) => {
      const target = ownedLayoutAt(root, path, catalog);
      if (!target)
        return [
          `${root.name}: a configuration targets an unavailable owned layout (${path}).`,
        ];
      return structureVariantIssues({
        ...target,
        editor: {
          ...layoutConfigurationEditor(root, configuration),
          properties: structureEditor(root).properties,
        },
      }).map((issue) => `${root.name} / ${target.name}: ${issue}`);
    },
  );
}

export function configuredStructure(
  root: Structure,
  path: string,
  catalog: readonly Structure[],
  previews: Readonly<Record<string, StructurePreviewState>> = {},
) {
  const target = path ? ownedLayoutAt(root, path, catalog) : root;
  if (!target) throw new Error("The selected owned layout is unavailable.");
  const local = structureEditor(target);
  let editor = local;
  let preview = previews[target.conceptId] ?? EMPTY_STRUCTURE_PREVIEW;
  const issues: string[] = [];
  const parts = path ? path.slice(1).split("/") : [];
  for (let depth = parts.length - 1; depth >= 0; depth--) {
    const ownerPath = depth ? `/${parts.slice(0, depth).join("/")}` : "";
    const owner = ownerPath ? ownedLayoutAt(root, ownerPath, catalog)! : root;
    const configuration =
      owner.editor?.layouts?.[`/${parts.slice(depth).join("/")}`];
    if (!configuration) continue;
    const inherited = layoutConfigurationEditor(owner, configuration);
    const ownerPreview = previews[owner.conceptId] ?? EMPTY_STRUCTURE_PREVIEW;
    for (const id of Object.keys(inherited.visibilityBindings))
      if (editor.visibilityBindings[id])
        issues.push(
          `${target.name}: this layer already has a visibility control.`,
        );
    const duplicateOptions = Object.keys(inherited.overrides).filter(
      (id) => editor.overrides[id],
    );
    if (duplicateOptions.length)
      issues.push(`${target.name}: conflicting parent option mappings.`);
    editor = {
      ...editor,
      properties: [...editor.properties, ...inherited.properties],
      visibility: { ...editor.visibility, ...inherited.visibility },
      visibilityBindings: {
        ...editor.visibilityBindings,
        ...inherited.visibilityBindings,
      },
      overrides: { ...editor.overrides, ...inherited.overrides },
    };
    preview = {
      ...preview,
      options: { ...preview.options, ...ownerPreview.options },
      booleans: { ...preview.booleans, ...ownerPreview.booleans },
    };
  }
  const authored = { ...target, editor };
  const resolved = resolveStructureOptions(authored, preview);
  for (const termId of Object.values(resolved.sizes))
    if (!structureGeneration(target).sizeTermIds.includes(termId))
      issues.push(`${target.name}: the selected binding size is unavailable.`);
  return {
    ...resolved,
    authored,
    options: preview.options,
    issues: [...issues, ...resolved.issues],
  };
}

export function withLayoutConfiguration(
  editor: StructureEditorData,
  path: string,
  configuration: StructureLayoutConfiguration,
): StructureEditorData {
  return { ...editor, layouts: { ...editor.layouts, [path]: configuration } };
}

export function reconcileOwnedConfigurations(
  before: StructuresDocument,
  after: StructuresDocument,
): StructuresDocument {
  return {
    ...after,
    structures: after.structures.map((root) => {
      if (!root.editor?.layouts) return root;
      const previous = before.structures.find(
        (item) => item.conceptId === root.conceptId,
      );
      const layouts = Object.fromEntries(
        Object.entries(root.editor.layouts).flatMap(([path, configuration]) => {
          const target = ownedLayoutAt(root, path, after.structures);
          if (!target)
            return previous && ownedLayoutAt(previous, path, before.structures)
              ? []
              : [[path, configuration]];
          const editor = reconcileVariantLayers({
            ...target,
            editor: layoutConfigurationEditor(root, configuration),
          }).editor!;
          return [
            [
              path,
              {
                ...configuration,
                ...(configuration.visibility && {
                  visibility: editor.visibility,
                }),
                ...(configuration.visibilityBindings && {
                  visibilityBindings: editor.visibilityBindings,
                }),
                ...(configuration.overrides && { overrides: editor.overrides }),
              },
            ],
          ];
        }),
      );
      return JSON.stringify(layouts) === JSON.stringify(root.editor.layouts)
        ? root
        : { ...root, editor: { ...root.editor, layouts } };
    }),
  };
}
