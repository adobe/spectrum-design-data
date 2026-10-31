// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  Text,
  TextArea,
} from "@react-spectrum/s2";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useState } from "react";
import { Panel } from "../../components/Panel";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { EditableTextField } from "../../components/editable";
import type { Structure } from "../../features/structures/model";
import { renameStructureAtom } from "../../features/structures/state";
import { updateStructureEditorAtom } from "../../features/structures/variantState";
import {
  structureEditor,
  resolveStructureOptions,
  type StructurePreviewState,
  type StructureEditorData,
} from "../../features/structures/variants";
import {
  activeVariant,
  updateOptionOverrides,
} from "../../features/structures/variantOperations";
import {
  editElementsAtom,
  selectedElementIdAtom,
  removeElementAtom,
  restoreElementAtom,
} from "../../features/structures/elementState";
import { StructureGenerationControls } from "./StructureGenerationControls";
import { StructureLayers } from "./StructureLayers";

export function StructureMetadataPanel({
  structure,
  catalog,
  preview,
  isReadOnly,
}: {
  structure: Structure;
  catalog: readonly Structure[];
  preview: StructurePreviewState;
  isReadOnly: boolean;
}) {
  const notify = useNotify();
  const rename = useSetAtom(renameStructureAtom);
  const update = useSetAtom(updateStructureEditorAtom);
  const selected = useAtomValue(selectedElementIdAtom);
  const select = useSetAtom(selectedElementIdAtom);
  const store = useStore();
  const editElements = useSetAtom(editElementsAtom);
  const [name, setName] = useState(structure.name);
  const editor = structureEditor(structure);
  const active = activeVariant(
    structure,
    preview.activePropertyId,
    preview.options,
  );
  const overrides =
    active.option && !active.isDefault
      ? (editor.overrides[active.option.id] ?? {})
      : {};
  const order = resolveStructureOptions(structure, preview).order;
  const report = (error: unknown) =>
    notify.error(error instanceof Error ? error.message : String(error));
  const save = (next: StructureEditorData) => {
    update({ structureId: structure.conceptId, editor: next });
  };
  return (
    <Panel
      label="Structure metadata and layers"
      className="structureMetadataPanel"
    >
      <NestedPanelAccordion
        defaultExpandedKeys={["metadata", "generation", "layers"]}
      >
        <AccordionItem id="metadata">
          <AccordionItemTitle>Metadata</AccordionItemTitle>
          <AccordionItemPanel>
            <div className="structureEditorFields">
              <EditableTextField
                size="S"
                label="Name"
                isRequired
                value={name}
                onChange={setName}
                isReadOnly={isReadOnly}
                onBlur={() => {
                  if (isReadOnly || name === structure.name) return;
                  try {
                    rename({ id: structure.conceptId, name });
                  } catch (error) {
                    report(error);
                    setName(structure.name);
                  }
                }}
              />
              <TextArea
                size="S"
                label="Description"
                value={structure.description ?? ""}
                isReadOnly={isReadOnly}
                onChange={(description) => {
                  try {
                    update({ structureId: structure.conceptId, description });
                  } catch (error) {
                    report(error);
                  }
                }}
              />
              <Text>Used in</Text>
              <Text>TBD</Text>
            </div>
          </AccordionItemPanel>
        </AccordionItem>
        <AccordionItem id="generation">
          <AccordionItemTitle>Generated variants</AccordionItemTitle>
          <AccordionItemPanel>
            <StructureGenerationControls
              structure={structure}
              isReadOnly={isReadOnly}
              report={report}
            />
          </AccordionItemPanel>
        </AccordionItem>
        <AccordionItem id="layers">
          <AccordionItemTitle>Layers</AccordionItemTitle>
          <AccordionItemPanel>
            <StructureLayers
              structure={structure}
              catalog={catalog}
              order={order}
              visibility={{ ...editor.visibility, ...overrides.visibility }}
              selectedId={selected}
              isReadOnly={isReadOnly}
              onSelect={select}
              onChange={save}
              report={report}
              onOrder={(ids) => {
                if (!active.option || active.isDefault) {
                  try {
                    editElements({
                      structureId: structure.conceptId,
                      elements: ids.map((id) => {
                        const child = structure.elements?.find(
                          (item) => item.id === id,
                        );
                        if (!child)
                          throw new Error(
                            "The reordered layer is unavailable.",
                          );
                        return child;
                      }),
                    });
                  } catch (error) {
                    report(error);
                  }
                } else
                  save(
                    updateOptionOverrides(editor, active.option.id, {
                      ...overrides,
                      order: ids,
                    }),
                  );
              }}
              onVisibility={(id, visible) => {
                try {
                  if (active.option && !active.isDefault)
                    save(
                      updateOptionOverrides(editor, active.option.id, {
                        ...overrides,
                        visibility: { ...overrides.visibility, [id]: visible },
                      }),
                    );
                  else
                    save({
                      ...editor,
                      visibility: { ...editor.visibility, [id]: visible },
                    });
                } catch (error) {
                  report(error);
                }
              }}
              onDelete={(id, confirmed) =>
                notify.remove({
                  kind: "structureElement",
                  run: (store) =>
                    store.set(removeElementAtom, {
                      structureId: structure.conceptId,
                      elementId: id,
                      confirmed: true,
                    }),
                  undo: (removed) => store.set(restoreElementAtom, removed),
                  confirmed,
                })
              }
            />
          </AccordionItemPanel>
        </AccordionItem>
      </NestedPanelAccordion>
    </Panel>
  );
}
