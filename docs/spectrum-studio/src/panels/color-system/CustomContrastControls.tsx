// Copyright 2026 Adobe. All rights reserved.
import { ToastQueue } from "@react-spectrum/s2";
import { useAtomValue, useSetAtom } from "jotai";
import { useIsReadOnly } from "../../components/editable";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
} from "../../features/color-system/state";
import {
  editCustomContrastsAtom,
  restoreCustomContrastsAtom,
} from "../../features/color-system/customContrastState";
import { useDeletionToast } from "../../components/deletionToastContext";
import { rulesAtom } from "../../features/logic/library";
import { modeSetsAtom } from "../../features/modes/state";
import { parameterOwners } from "../../features/modes/parameters";
import {
  modeSelectionAtom,
  resolveActiveMode,
} from "../../features/modes/selection";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { CustomContrastEditor } from "./CustomContrastEditor";

export function CustomContrastControls({ scaleId }: { scaleId: string }) {
  const base = useAtomValue(colorSystemDocumentAtom);
  const resolved = useAtomValue(resolvedColorSystemDocumentAtom);
  const rules = useAtomValue(rulesAtom);
  const sets = useAtomValue(modeSetsAtom);
  const selection = useAtomValue(modeSelectionAtom);
  const preview = useAtomValue(previewOverridesAtom);
  const readOnly = useIsReadOnly();
  const edit = useSetAtom(editCustomContrastsAtom);
  const restore = useSetAtom(restoreCustomContrastsAtom);
  const { notifyDeleted } = useDeletionToast();
  const scale = base.scales.find((scale) => scale.id === scaleId);
  const owner = sets.find(
    (axis) => axis.id === parameterOwners(sets)["color.contrastMultiplier"],
  );
  const mode = owner && resolveActiveMode(owner, selection);
  const isMode = !!mode && mode.id !== owner?.defaultModeId;
  function run(action: Parameters<typeof edit>[0]) {
    try {
      const undo = edit(action);
      if (undo && (action.kind === "remove" || action.kind === "disable")) {
        notifyDeleted(
          action.kind === "remove"
            ? "Custom contrast step"
            : "Custom contrast steps",
          () => {
            try {
              restore(undo);
            } catch (failure) {
              ToastQueue.negative(
                failure instanceof Error ? failure.message : String(failure),
              );
            }
          },
        );
      }
    } catch (failure) {
      ToastQueue.negative(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  }
  return (
    scale && (
      <CustomContrastEditor
        scale={scale}
        rules={rules}
        onAction={run}
        modeLabel={isMode ? `${owner?.name}: ${mode.name}` : undefined}
        disabled={
          readOnly || Object.keys(preview).some((id) => id.startsWith("color."))
        }
        patches={
          isMode ? mode.foundations.color?.scaleContrasts?.[scaleId] : undefined
        }
        effective={
          resolved.scales.find((scale) => scale.id === scaleId)?.customContrasts
            ?.steps
        }
      />
    )
  );
}
