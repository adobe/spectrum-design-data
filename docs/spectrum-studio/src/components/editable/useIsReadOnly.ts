// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { editModeAtom } from "../../state/view/editMode";

/** `override` lets the platform picker invert the rule: read-only *while* editing. */
export function useIsReadOnly(override?: boolean) {
  const isEditMode = useAtomValue(editModeAtom);
  return override ?? !isEditMode;
}
