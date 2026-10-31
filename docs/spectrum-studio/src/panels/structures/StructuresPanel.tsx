// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, ListView, ListViewItem, Text } from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue, useStore } from "jotai";
import { useNotify } from "../../components/notifications/notificationContext";
import { editModeAtom } from "../../state/view/editMode";
import {
  addStructureAtom,
  removeStructureAtom,
  resolvedStructuresAtom,
  restoreStructureAtom,
  selectedStructureIdAtom,
} from "../../features/structures/state";
import { StructureCard } from "./StructureCard";
import { workingTshirtArtifactsAtom } from "../../features/design-data/tshirtState";
import { StructureThumbnail } from "../../views/structures/StructureThumbnail";

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
  const generation = useAtomValue(workingTshirtArtifactsAtom);
  const [selected, setSelected] = useAtom(selectedStructureIdAtom);
  const editing = useAtomValue(editModeAtom);
  const store = useStore();
  const notify = useNotify();
  return (
    <div className={panelStyles} data-component="StructuresPanel">
      {editing && (
        <ActionButton
          onPress={() =>
            notify.added("structure", () => store.set(addStructureAtom))
          }
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
                preview={<StructureThumbnail structure={structure} />}
                structure={structure}
                isReadOnly={!editing}
                onDelete={() => {
                  notify.remove({
                    kind: "structure",
                    noun: structure.name,
                    run: (store) =>
                      store.set(removeStructureAtom, structure.conceptId),
                    undo: (removed) => {
                      if (removed) store.set(restoreStructureAtom, removed);
                    },
                    onDone: () => {
                      if (selected === structure.conceptId) setSelected(null);
                    },
                  });
                }}
              />
            </ListViewItem>
          ))}
        </ListView>
      )}
    </div>
  );
}
