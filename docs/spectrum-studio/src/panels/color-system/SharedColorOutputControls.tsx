// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue, useSetAtom } from "jotai";
import { ColorOutputControls } from "./ColorOutputControls";
import {
  colorOutputSettingsAtom,
  updateColorOutputSettingsAtom,
} from "../../features/color-system/state";
import { editModeAtom } from "../../state/view/editMode";

export function SharedColorOutputControls() {
  const value = useAtomValue(colorOutputSettingsAtom);
  const isEditing = useAtomValue(editModeAtom);
  const update = useSetAtom(updateColorOutputSettingsAtom);
  return (
    <ColorOutputControls
      value={value}
      isReadOnly={!isEditing}
      onChange={update}
    />
  );
}
