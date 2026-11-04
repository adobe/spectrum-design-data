// Copyright 2026 Adobe. All rights reserved.
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import { useAtomValue, useSetAtom } from "jotai";
import { ModeSetCard } from "../components/ModeSetCard";
import { centeredPageStyles } from "../components/pageLayout";
import { CategoryIllustratedMessage } from "../components/CategoryIllustratedMessage";
import { EditOnly } from "../components/editable";
import { modeSetsAtom } from "../features/modes/state";
import {
  editingModeSetIdAtom,
  NEW_MODE_SET_ID,
  pendingModeSetFoundationAtom,
} from "../state/view/modesView";
import { ModeSetEditorLayout } from "./modes/ModeSetEditorLayout";

const pageStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
  height: "full",
  minHeight: 0,
  overflow: "auto",
  padding: 24,
});
const headerStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
});
const headingStyles = style({ font: "heading-lg", margin: 0 });
const listStyles = style({ display: "flex", flexDirection: "column", gap: 16 });

export default function Modes() {
  const modeSets = useAtomValue(modeSetsAtom);
  const editingId = useAtomValue(editingModeSetIdAtom);
  const setEditingId = useSetAtom(editingModeSetIdAtom);
  const setPendingFoundation = useSetAtom(pendingModeSetFoundationAtom);

  if (editingId)
    return <ModeSetEditorLayout key={editingId} modeSetId={editingId} />;

  return (
    <div className="pageMainContent" data-component="Modes">
      <div className={`${pageStyles} ${centeredPageStyles}`}>
        <header className={headerStyles}>
          <h2 className={headingStyles}>Modes</h2>
          <EditOnly>
            <Button
              variant="accent"
              onPress={() => {
                setPendingFoundation(null);
                setEditingId(NEW_MODE_SET_ID);
              }}
            >
              <Add />
              <Text>Add mode set</Text>
            </Button>
          </EditOnly>
        </header>
        {modeSets.length === 0 ? (
          <CategoryIllustratedMessage category="modes" title="No modes">
            Create a mode set to begin.
          </CategoryIllustratedMessage>
        ) : (
          <div className={listStyles}>
            {modeSets.map((modeSet, index) => (
              <ModeSetCard key={modeSet.id} modeSet={modeSet} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
