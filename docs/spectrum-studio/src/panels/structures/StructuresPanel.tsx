// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  ListView,
  ListViewItem,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { useDeletionToast } from "../../components/deletionToastContext";
import { editModeAtom } from "../../state/view/editMode";
import {
  addStructureAtom,
  applyStructureRuleAtom,
  removeStructureAtom,
  removeStructureRuleAtom,
  renameStructureAtom,
  resolvedStructuresAtom,
  restoreStructureAtom,
  restoreStructureRuleAtom,
  selectedStructureIdAtom,
  setStructureSizesAtom,
} from "../../features/structures/state";
import { StructureCard } from "./StructureCard";
import { authoringSnapshotAtom } from "../../features/edit-session/state";
import { primitiveReferencesAtom } from "../../features/tokens/primitiveReferenceState";
import { rulesAtom } from "../../features/logic/library";
import { buildTshirtArtifacts } from "../../features/design-data/tshirtArtifacts";
import { eligibleStructureBindings } from "../../features/structures/generation";
import { structureGeneration } from "../../features/structures/model";
import { workingTshirtArtifactsAtom } from "../../features/design-data/tshirtState";

const panelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
});
const listStyles = style({ flexGrow: 1, minHeight: 0, minWidth: 0 });

export function StructuresPanel() {
  const structures = useAtomValue(resolvedStructuresAtom);
  const snapshot = useAtomValue(authoringSnapshotAtom);
  const references = useAtomValue(primitiveReferencesAtom);
  const rules = useAtomValue(rulesAtom);
  const generation = useAtomValue(workingTshirtArtifactsAtom);
  const [selected, setSelected] = useAtom(selectedStructureIdAtom);
  const editing = useAtomValue(editModeAtom);
  const add = useSetAtom(addStructureAtom);
  const rename = useSetAtom(renameStructureAtom);
  const remove = useSetAtom(removeStructureAtom);
  const restore = useSetAtom(restoreStructureAtom);
  const applyRule = useSetAtom(applyStructureRuleAtom);
  const sizes = useSetAtom(setStructureSizesAtom);
  const removeRule = useSetAtom(removeStructureRuleAtom);
  const restoreRule = useSetAtom(restoreStructureRuleAtom);
  const { notifyDeleted } = useDeletionToast();
  const [focusId, setFocusId] = useState<string | null>(null);
  const report = (failure: unknown) =>
    ToastQueue.negative(
      failure instanceof Error ? failure.message : String(failure),
    );
  return (
    <div className={panelStyles} data-component="StructuresPanel">
      {editing && (
        <ActionButton
          onPress={() => {
            try {
              setFocusId(add());
            } catch (failure) {
              report(failure);
            }
          }}
        >
          <Add />
          <Text>Add structure</Text>
        </ActionButton>
      )}
      {generation.status === "error" && <p role="alert">{generation.error}</p>}
      {structures.length === 0 ? (
        <Text>
          {editing
            ? "Add a structure to begin."
            : "Enter Edit mode to add a structure."}
        </Text>
      ) : (
        <ListView
          aria-label="Structures"
          selectionMode="single"
          selectionStyle="highlight"
          isQuiet
          overflowMode="wrap"
          styles={listStyles}
          selectedKeys={selected ? [selected] : []}
          onSelectionChange={(keys) => {
            if (keys !== "all")
              setSelected(
                typeof [...keys][0] === "string" ? String([...keys][0]) : null,
              );
          }}
        >
          {structures.map((structure) => (
            <ListViewItem
              key={structure.conceptId}
              id={structure.conceptId}
              textValue={structure.name}
            >
              <StructureCard
                structure={structure}
                isReadOnly={!editing}
                focusName={focusId === structure.conceptId}
                onNameFocused={() => setFocusId(null)}
                rules={rules}
                references={references}
                onSizesChange={(sizeTermIds) =>
                  sizes({ structureId: structure.conceptId, sizeTermIds })
                }
                onApplyRule={(application) =>
                  applyRule({ structureId: structure.conceptId, application })
                }
                previewRule={(application) => {
                  const hasLayout =
                    application.targets.kind === "all"
                      ? eligibleStructureBindings(structure).length > 0
                      : application.targets.bindingIds.length > 0;
                  const generation = structureGeneration(structure);
                  if (hasLayout && !generation.nameRef)
                    throw new Error(
                      "Choose Token naming in Structure settings before generating layout tokens.",
                    );
                  const updated = {
                    ...structure,
                    generation: {
                      ...generation,
                      applications: [
                        ...generation.applications.filter(
                          (item) => item.id !== application.id,
                        ),
                        application,
                      ],
                    },
                  };
                  return buildTshirtArtifacts({
                    ...snapshot,
                    structures: {
                      ...snapshot.structures!,
                      structures: snapshot.structures!.structures.map((item) =>
                        item.conceptId === structure.conceptId ? updated : item,
                      ),
                    },
                  });
                }}
                onRemoveRule={(application) => {
                  try {
                    const removed = removeRule({
                      structureId: structure.conceptId,
                      applicationId: application.id,
                    });
                    notifyDeleted("Generation application", () => {
                      try {
                        restoreRule(removed);
                      } catch (failure) {
                        report(failure);
                      }
                    });
                  } catch (failure) {
                    report(failure);
                  }
                }}
                onRename={(name) => rename({ id: structure.conceptId, name })}
                onDelete={() => {
                  try {
                    const removed = remove(structure.conceptId);
                    notifyDeleted(`Structure ${structure.name}`, () => {
                      try {
                        restore(removed);
                      } catch (failure) {
                        report(failure);
                      }
                    });
                  } catch (failure) {
                    report(failure);
                  }
                }}
              />
            </ListViewItem>
          ))}
        </ListView>
      )}
    </div>
  );
}
