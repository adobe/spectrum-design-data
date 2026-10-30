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
  customContrastEditingContextAtom,
  restoreCustomContrastsAtom,
} from "../../features/color-system/customContrastState";
import { useDeletionToast } from "../../components/deletionToastContext";
import { rulesAtom } from "../../features/logic/library";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { effectiveContrast } from "../../features/color-system/polarity";
import { CustomContrastEditor } from "./CustomContrastEditor";

export function CustomContrastControls({ scaleId }: { scaleId: string }) {
  const base = useAtomValue(colorSystemDocumentAtom);
  const resolved = useAtomValue(resolvedColorSystemDocumentAtom);
  const rules = useAtomValue(rulesAtom);
  const context = useAtomValue(customContrastEditingContextAtom);
  const preview = useAtomValue(previewOverridesAtom);
  const readOnly = useIsReadOnly();
  const edit = useSetAtom(editCustomContrastsAtom);
  const restore = useSetAtom(restoreCustomContrastsAtom);
  const { notifyDeleted } = useDeletionToast();
  const scale = base.scales.find((scale) => scale.id === scaleId);
  const values = context.opposite
    ? Object.fromEntries(
        (scale?.customContrasts?.steps ?? []).map((step) => [
          step.id,
          effectiveContrast(step, context.polarity),
        ]),
      )
    : undefined;
  const patches = context.opposite
    ? Object.fromEntries(
        (scale?.customContrasts?.steps ?? [])
          .filter((step) => step.oppositeValue !== undefined)
          .map((step) => [step.id, effectiveContrast(step, context.polarity)]),
      )
    : context.mode?.foundations.color?.scaleContrasts?.[scaleId];
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
        modeLabel={context.modeLabel}
        values={values}
        inheritanceLabel={context.opposite ? "Polarity adjusted" : "Inherited"}
        disabled={
          readOnly || Object.keys(preview).some((id) => id.startsWith("color."))
        }
        patches={patches}
        effective={
          resolved.scales.find((scale) => scale.id === scaleId)?.customContrasts
            ?.steps
        }
      />
    )
  );
}
