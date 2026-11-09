// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { componentSizingDocumentAtom } from "../foundations/componentSizingState";
import {
  isSizingMultiplier,
  SIZING_PARAMETER_IDS,
} from "../foundations/componentSizing";
import { updateTypographyAtom } from "../typography/state";
import { setActiveModeParameterAtom } from "./selection";

export const updateSizingParameterAtom = atom(
  null,
  (get, set, input: { parameterId: string; value: number }) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change sizing baselines.");
    if (!SIZING_PARAMETER_IDS.some((id) => id === input.parameterId))
      throw new Error("Choose a supported sizing parameter.");
    if (!isSizingMultiplier(input.value))
      throw new Error("Enter a percentage greater than zero.");
    if (set(setActiveModeParameterAtom, input)) return;
    if (input.parameterId === "typography.textSize")
      set(updateTypographyAtom, { textSize: input.value });
    else
      set(componentSizingDocumentAtom, {
        ...get(componentSizingDocumentAtom),
        componentSize: input.value,
      });
  },
);
