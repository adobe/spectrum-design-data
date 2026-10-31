// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import {
  ActionButton,
  DialogTrigger,
  Heading,
  Popover,
  Text,
} from "@react-spectrum/s2";
import { Dialog } from "react-aria-components";
import Edit from "@react-spectrum/s2/icons/Edit";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { editModeAtom } from "../../state/view/editMode";
import {
  modeSelectionAtom,
  resolveActiveMode,
} from "../../features/modes/selection";
import { resetModeAtom } from "../../features/modes/preview";
import { modeSetsAtom } from "../../features/modes/state";
import type { Mode, ModeSet } from "../../features/modes/model";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  baseParameterValue,
  foundationParameters,
  type FoundationId,
  type FoundationParameterDefinition,
} from "../../features/modes/parameters";
import { ModeParameterControl } from "../../components/ModeParameterControl";
import {
  resolvedColorSystemDocumentAtom,
  updateBackgroundLightnessAtom,
  updateBackgroundScaleAtom,
  updateContrastMultiplierAtom,
} from "../../features/color-system/state";
import {
  resolvedTypographyDocumentAtom,
  updateTextZoomAtom,
} from "../../features/typography/state";
import { ModeScaleStopControls } from "../color-system/ScaleStopEditor";
import {
  resolvedElevationAtom,
  updateElevationModeParameterAtom,
} from "../../features/elevation/state";

import { popoverDialogStyles } from "../../components/popoverLayout";

const bodyStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
  width: "full",
  boxSizing: "border-box",
  minWidth: 0,
});

function AuthoringParameter({
  parameter,
  focusOnMount,
}: {
  parameter: FoundationParameterDefinition;
  focusOnMount: boolean;
}) {
  const notify = useNotify();
  const color = useAtomValue(resolvedColorSystemDocumentAtom);
  const typography = useAtomValue(resolvedTypographyDocumentAtom);
  const elevation = useAtomValue(resolvedElevationAtom);
  const updateElevation = useSetAtom(updateElevationModeParameterAtom);
  const lightness = useSetAtom(updateBackgroundLightnessAtom);
  const scale = useSetAtom(updateBackgroundScaleAtom);
  const contrast = useSetAtom(updateContrastMultiplierAtom);
  const text = useSetAtom(updateTextZoomAtom);
  const documents = { color, typography, elevation };
  const value = baseParameterValue(documents, parameter.id);
  if (value === undefined)
    throw new Error(`No resolved value is available for ${parameter.label}.`);
  return (
    <ModeParameterControl
      parameter={parameter}
      documents={documents}
      value={value}
      focusOnMount={focusOnMount}
      onChange={(next) => {
        try {
          switch (parameter.control) {
            case "backgroundScale":
              scale(String(next));
              break;
            case "backgroundLightness":
              lightness(Number(next));
              break;
            case "contrastMultiplier":
              contrast(Number(next));
              break;
            case "textZoom":
              text(Number(next));
              break;
            case "shadowDepth":
              updateElevation({
                parameterId: "elevation.depth",
                value: Number(next),
              });
              break;
            case "shadowColor":
              updateElevation({
                parameterId: "elevation.color",
                value: String(next),
              });
              break;
          }
        } catch (failure) {
          notify.error(
            failure instanceof Error ? failure.message : String(failure),
          );
        }
      }}
    />
  );
}

export function FoundationModePopover({
  foundation,
  modeSet,
  mode,
}: {
  foundation: FoundationId;
  modeSet: ModeSet;
  mode: Mode;
}) {
  const [open, setOpen] = useState(false);
  const editing = useAtomValue(editModeAtom);
  const selection = useAtomValue(modeSelectionAtom);
  const sets = useAtomValue(modeSetsAtom);
  const reset = useSetAtom(resetModeAtom);
  const available = AUTHORING_CAPABILITY_OPTIONS.filter(
    (option) => option.foundation === foundation,
  );
  const enabled = available.filter((option) =>
    modeSet.authoringCapabilities?.includes(option.id),
  );
  const parameters = foundationParameters(foundation).filter((parameter) =>
    enabled.some((option) => option.id === parameter.id),
  );
  useEffect(() => {
    if (
      !editing ||
      !sets.some(
        (set) =>
          set.id === modeSet.id &&
          set.modes.some((item) => item.id === mode.id),
      ) ||
      resolveActiveMode(modeSet, selection)?.id !== mode.id
    )
      setOpen(false);
  }, [editing, sets, selection, modeSet, mode.id]);
  if (!editing || !enabled.length) return null;
  return (
    <DialogTrigger
      isOpen={open}
      onOpenChange={(next) => {
        if (next) {
          reset({ modeSetKey: modeSet.key, modeId: mode.id });
        }
        setOpen(next);
      }}
    >
      <ActionButton
        isQuiet
        size="S"
        aria-label={`Edit ${mode.name} for ${foundation}`}
      >
        <Edit />
      </ActionButton>
      <Popover
        placement="end"
        padding="none"
        size={
          enabled.some((option) => option.id === "color.scales") ? "M" : "S"
        }
      >
        <Dialog
          aria-label={`Edit ${mode.name} for ${foundation}`}
          className={`${popoverDialogStyles} ${bodyStyles}`}
        >
          <Heading
            level={4}
            slot="title"
            UNSAFE_className={String(style({ margin: 0 }))}
          >
            {mode.name}
          </Heading>
          {parameters.map((parameter, index) => (
            <AuthoringParameter
              key={parameter.id}
              parameter={parameter}
              focusOnMount={index === 0}
            />
          ))}
          {enabled.some(
            (option) => option.id === "color.contrastMultiplier",
          ) && (
            <Text>
              Edit scale-specific contrast values in the color Scale Editor.
              This mode owns those overrides too.
            </Text>
          )}
          {enabled.some((option) => option.id === "color.scales") && (
            <ModeScaleStopControls focusOnMount={parameters.length === 0} />
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
