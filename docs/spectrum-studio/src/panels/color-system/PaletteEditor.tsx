// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Text, ToastQueue } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import { useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";
import { PaletteColorRow } from "../../components/palette/PaletteColorRow";
import { useDeletionToast } from "../../components/deletionToastContext";
import { EditOnly, useIsReadOnly } from "../../components/editable";
import { paletteSwatches } from "../../features/color-system/palette";
import { paletteConsumers } from "../../features/color-system/paletteReferences";
import {
  addPaletteColorAtom,
  colorSystemDocumentAtom,
  removePaletteColorAtom,
  resolvedColorSystemDocumentAtom,
  restorePaletteColorAtom,
  updatePaletteColorAtom,
} from "../../features/color-system/state";
import { modeSetsAtom } from "../../features/modes/state";
import { SourceNameEditor } from "../registry/SourceNameEditor";
import { taxonomyPaletteSourceId } from "../../features/taxonomy/model";

const editorStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const emptyStyles = style({ font: "body", color: "neutral-subdued" });

export function PaletteEditor() {
  const colorDocument = useAtomValue(resolvedColorSystemDocumentAtom);
  const baseDocument = useAtomValue(colorSystemDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const isReadOnly = useIsReadOnly();
  const addColor = useSetAtom(addPaletteColorAtom);
  const updateColor = useSetAtom(updatePaletteColorAtom);
  const removeColor = useSetAtom(removePaletteColorAtom);
  const restoreColor = useSetAtom(restorePaletteColorAtom);
  const { notifyDeleted } = useDeletionToast();
  const outputGamut = colorDocument.settings.colorOutput;
  const swatches = useMemo(
    () => paletteSwatches(colorDocument.palette, outputGamut),
    [colorDocument.palette, outputGamut],
  );

  return (
    <div className={editorStyles}>
      <EditOnly>
        <div>
          <ActionButton
            onPress={() => {
              try {
                addColor();
              } catch (failure) {
                ToastQueue.negative(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
            }}
          >
            <Add />
            <Text>Add palette color</Text>
          </ActionButton>
        </div>
      </EditOnly>
      {swatches.length === 0 && (
        <p className={emptyStyles}>
          {isReadOnly
            ? "This system has no palette colors."
            : "Add fixed colors such as a brand color, black, or white. They do not adapt, and color scale stops can link to them."}
        </p>
      )}
      {swatches.map(({ color, duplicateOf }) => (
        <div
          key={color.id}
          className={editorStyles}
          data-palette-source={color.id}
        >
          <PaletteColorRow
            color={color}
            outputGamut={outputGamut}
            isReadOnly={isReadOnly}
            duplicateOf={duplicateOf?.name}
            nameEditor={(helpText) => (
              <SourceNameEditor
                sourceId={taxonomyPaletteSourceId(color.id)}
                label="Palette color name"
                contextualHelp={helpText}
              />
            )}
            usedByCount={
              paletteConsumers(baseDocument, modeSets, color.id).length
            }
            onRename={(name) => {
              const result = updateColor({ id: color.id, name });
              return result.ok ? null : result.error;
            }}
            onChangeValue={(channels) => {
              const result = updateColor({ id: color.id, ...channels });
              return result.ok ? null : result.error;
            }}
            onDelete={() => {
              try {
                const removed = removeColor(color.id);
                if (removed)
                  notifyDeleted(`Palette color ${color.name}`, () =>
                    restoreColor(removed),
                  );
              } catch (failure) {
                ToastQueue.negative(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}
