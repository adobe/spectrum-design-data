// Copyright 2026 Adobe. All rights reserved.
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import { useAtomValue, useSetAtom } from "jotai";
import { ModeSetCard } from "../components/ModeSetCard";
import { ModeSetEditorDialog } from "../components/ModeSetEditorDialog";
import { EditOnly } from "../components/editable";
import { createModeSet } from "../features/modes/model";
import { addModeSetAtom, modeSetsAtom } from "../features/modes/state";

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
const emptyStyles = style({ font: "body", color: "neutral-subdued" });

export default function Modes() {
  const modeSets = useAtomValue(modeSetsAtom);
  const addModeSet = useSetAtom(addModeSetAtom);

  return (
    <div className="pageMainContent" data-component="Modes">
      <div className={pageStyles}>
        <header className={headerStyles}>
          <h2 className={headingStyles}>Mode sets</h2>
          <EditOnly>
            <ModeSetEditorDialog
              trigger={
                <Button variant="accent">
                  <Add />
                  <Text>Add mode set</Text>
                </Button>
              }
              title="New mode set"
              createDraft={createModeSet}
              onSave={(modeSet) => addModeSet(modeSet)}
            />
          </EditOnly>
        </header>
        {modeSets.length === 0 ? (
          <p className={emptyStyles}>No mode sets yet.</p>
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
