// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";

import { useAtomValue, useStore } from "jotai";
import { useIsReadOnly } from "../../components/editable";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  resolvedBackgroundAtom,
} from "../../features/color-system/state";
import {
  editCustomContrastsAtom,
  customContrastEditingContextAtom,
  type CustomContrastAction,
} from "../../features/color-system/customContrastState";
import { rulesAtom } from "../../features/logic/library";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { effectiveContrast } from "../../features/color-system/polarity";
import { CustomContrastEditor } from "./CustomContrastEditor";

export function CustomContrastControls({ scaleId }: { scaleId: string }) {
  const notify = useNotify();
  const base = useAtomValue(colorSystemDocumentAtom);
  const resolved = useAtomValue(resolvedColorSystemDocumentAtom);
  const background = useAtomValue(resolvedBackgroundAtom);
  const rules = useAtomValue(rulesAtom);
  const context = useAtomValue(customContrastEditingContextAtom);
  const preview = useAtomValue(previewOverridesAtom);
  const readOnly = useIsReadOnly();
  const store = useStore();
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
  if (readOnly && !scale?.customContrasts) return null;
  function run(action: CustomContrastAction) {
    if (action.kind === "remove" || action.kind === "disable") {
      notify.remove({
        kind: "customContrastStep",
        run: (store) => store.set(editCustomContrastsAtom, action),
      });
      return;
    }
    notify.edit(() => store.set(editCustomContrastsAtom, action));
  }
  return (
    scale && (
      <CustomContrastEditor
        scale={scale}
        rules={rules}
        onAction={run}
        background={background.hex}
        side={resolved.settings.side}
        sharedContrasts={resolved.contrasts}
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
