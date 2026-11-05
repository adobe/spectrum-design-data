// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../modes/model";
import { COMPONENT_SIZES } from "../foundations/componentSizes";
import { structureSizes } from "./generation";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import type { Structure, StructuresDocument } from "./model";
import type { StructureSelection } from "./model";
import { structureEditor } from "./variants";
import { ownedLayoutAt, layoutConfigurationEditor } from "./configuration";

export interface VariantSemanticIdentity {
  conceptId: string;
  rows: { [context: string]: string };
}
export interface VariantSemanticIdentities {
  [optionId: string]: { [binding: string]: VariantSemanticIdentity };
}

export function semanticIdentityKey(binding: string, size: string) {
  return JSON.stringify([binding, size]);
}

const hasSemanticSlotOverride = (
  selection: StructureSelection | null | undefined,
) =>
  !!selection &&
  ("$ref" in selection ||
    ("value" in selection && selection.value.kind === "number"));

export function synchronizeVariantIdentities(
  document: StructuresDocument,
  modeSets: readonly ModeSet[],
): StructuresDocument {
  const direct = synchronizeDirectVariantIdentities(document, modeSets);
  let changed = false;
  const structures = direct.structures.map((root) => {
    if (!root.editor?.layouts) return root;
    let updated = false;
    const layouts = { ...root.editor.layouts };
    for (const [path, configuration] of Object.entries(layouts)) {
      const target = ownedLayoutAt(root, path, direct.structures);
      if (!target) continue;
      const editor = layoutConfigurationEditor(root, configuration);
      const synchronized = synchronizeDirectVariantIdentities(
        { ...direct, structures: [{ ...target, editor }] },
        modeSets,
      ).structures[0].editor!;
      if (synchronized.semanticIdentities !== editor.semanticIdentities) {
        layouts[path] = {
          ...configuration,
          semanticIdentities: synchronized.semanticIdentities,
        };
        updated = true;
      }
    }
    changed ||= updated;
    return updated ? { ...root, editor: { ...root.editor, layouts } } : root;
  });
  return changed ? { ...direct, structures } : direct;
}

function synchronizeDirectVariantIdentities(
  document: StructuresDocument,
  modeSets: readonly ModeSet[],
): StructuresDocument {
  if (
    !document.structures.some((structure) =>
      Object.values(structure.editor?.overrides ?? {}).some(
        (override) =>
          Object.values(override.slots ?? {}).some(hasSemanticSlotOverride) ||
          Object.values(override.elements ?? {}).some(
            (element) => element.bindings.length,
          ),
      ),
    )
  )
    return document;
  const count = modeSets.reduce(
    (total, axis) => total * (axis.modes.length + 1),
    1,
  );
  if (count > 20000)
    throw new Error(
      "Variant token contexts exceed the 20,000-row limit. Reduce the number of mode combinations.",
    );
  const selections = modeSets.reduce<Record<string, string>[]>(
    (rows, axis) =>
      rows.flatMap((row) => [
        row,
        ...axis.modes.map((mode) => ({ ...row, [axis.id]: mode.id })),
      ]),
    [{}],
  );
  const keys = selections.map(canonicalTokenModeKey);
  let changed = false;
  const structures = document.structures.map((structure): Structure => {
    if (!structure.editor) return structure;
    let updated = false;
    const editor = structureEditor(structure);
    const identities = structuredClone(editor.semanticIdentities ?? {});
    const optionIds = new Set(
      editor.properties.flatMap((property) =>
        property.kind === "variant"
          ? property.options.map((option) => option.id)
          : [],
      ),
    );
    for (const id of Object.keys(identities))
      if (!optionIds.has(id)) {
        delete identities[id];
        updated = true;
      }
    for (const [optionId, override] of Object.entries(editor.overrides)) {
      const bindings = [
        ...Object.entries(override.slots ?? {}).flatMap(([slot, value]) =>
          hasSemanticSlotOverride(value) ? [slot] : [],
        ),
        ...Object.entries(override.elements ?? {}).flatMap(([id, element]) =>
          element.bindings.map((binding) => `element/${id}/${binding.slot}`),
        ),
      ];
      if (!bindings.length) continue;
      const options = (identities[optionId] ??= {});
      for (const binding of bindings)
        for (const size of new Set([
          ...COMPONENT_SIZES.map((item) => item.id),
          ...structureSizes(structure),
        ])) {
          const key = semanticIdentityKey(binding, size);
          if (!options[key]) {
            options[key] = { conceptId: crypto.randomUUID(), rows: {} };
            updated = true;
          }
          for (const context of keys)
            if (!options[key].rows[context]) {
              options[key].rows[context] = crypto.randomUUID();
              updated = true;
            }
        }
    }
    changed ||= updated;
    return updated
      ? { ...structure, editor: { ...editor, semanticIdentities: identities } }
      : structure;
  });
  return changed ? { ...document, structures } : document;
}
