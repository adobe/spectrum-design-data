// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../modes/model";
import { COMPONENT_SIZES } from "../foundations/componentSizes";
import { structureSizes } from "./generation";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import type { Structure, StructuresDocument } from "./model";
import { structureEditor } from "./variants";

export interface VariantSemanticIdentity {
  conceptId: string;
  rows: Record<string, string>;
}
export type VariantSemanticIdentities = Record<
  string,
  Record<string, VariantSemanticIdentity>
>;

export function semanticIdentityKey(binding: string, size: string) {
  return JSON.stringify([binding, size]);
}

export function synchronizeVariantIdentities(
  document: StructuresDocument,
  modeSets: readonly ModeSet[],
): StructuresDocument {
  if (
    !document.structures.some((structure) =>
      Object.values(structure.editor?.overrides ?? {}).some(
        (override) =>
          Object.values(override.slots ?? {}).some(
            (value) => value && "$ref" in value,
          ) ||
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
          value && "$ref" in value ? [slot] : [],
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
