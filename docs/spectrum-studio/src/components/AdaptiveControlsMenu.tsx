// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  DialogTrigger,
  Popover,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import UserSettings from "@react-spectrum/s2/icons/UserSettings";
import { useAtomValue, useSetAtom } from "jotai";
import { Dialog } from "react-aria-components";
import { resolvedColorSystemDocumentAtom } from "../features/color-system/state";
import { adaptiveParametersAtom } from "../features/modes/adaptiveSelectors";
import {
  previewOverridesAtom,
  clearPreviewParametersAtom,
  setPreviewParameterAtom,
} from "../features/modes/previewState";
import {
  baseParameterValue,
  type FoundationParameterDefinition,
} from "../features/modes/parameters";
import { resolvedTypographyDocumentAtom } from "../features/typography/state";
import { appColorSchemeAtom } from "../features/modes/capabilities";
import { spectrumChromeClassName } from "../utils/spectrumChrome";
import { ModeParameterControl } from "./ModeParameterControl";
import { popoverDialogStyles } from "./popoverLayout";
import { foundationParameterSettingsAtom } from "../features/modes/foundationSettingsState";
import { ADAPTIVE_COLOR_CHANNEL_IDS } from "../features/modes/foundationSettings";
import { ScaleAdjustmentControls } from "../panels/foundations/ScaleAdjustmentControls";

const popoverStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
});
const footerStyles = style({ display: "flex", justifyContent: "end" });

function AdaptiveControl({
  parameter,
}: {
  parameter: FoundationParameterDefinition;
}) {
  const document = useAtomValue(resolvedColorSystemDocumentAtom);
  const preview = useSetAtom(setPreviewParameterAtom);
  const typography = useAtomValue(resolvedTypographyDocumentAtom);
  const documents = { color: document, typography };
  const value = baseParameterValue(documents, parameter.id);
  if (value === undefined)
    throw new Error(`No resolved value is available for ${parameter.label}.`);
  return (
    <ModeParameterControl
      parameter={parameter}
      value={value}
      documents={documents}
      onChange={(next) => preview({ parameterId: parameter.id, value: next })}
    />
  );
}

export function AdaptiveControlsMenu({
  isIconOnly = false,
}: {
  isIconOnly?: boolean;
}) {
  const parameters = useAtomValue(adaptiveParametersAtom);
  const settings = useAtomValue(foundationParameterSettingsAtom);
  const colorAdjustment = settings["color.scaleAdjustment"].adaptive;
  const setPreview = useSetAtom(setPreviewParameterAtom);
  const colorScheme = useAtomValue(appColorSchemeAtom);
  const previewOverrides = useAtomValue(previewOverridesAtom);
  const clearPreview = useSetAtom(clearPreviewParametersAtom);

  if (parameters.length === 0 && !colorAdjustment) return null;

  const parameterIds = [
    ...parameters.map((parameter) => parameter.id),
    ...(colorAdjustment ? ADAPTIVE_COLOR_CHANNEL_IDS : []),
  ];
  const hasOverrides = parameterIds.some((id) => id in previewOverrides);

  return (
    <DialogTrigger>
      <TooltipTrigger>
        <ActionButton aria-label="Adaptive controls">
          <UserSettings />
          {!isIconOnly && <Text>Adaptive controls</Text>}
        </ActionButton>
        <Tooltip>Adaptive controls</Tooltip>
      </TooltipTrigger>
      <Popover placement="bottom" size="S" padding="none">
        <Dialog
          aria-label="Adaptive controls"
          className={`${spectrumChromeClassName(colorScheme)} ${popoverDialogStyles} ${popoverStyles}`}
        >
          {parameters.map((parameter) => (
            <AdaptiveControl key={parameter.id} parameter={parameter} />
          ))}
          {colorAdjustment && (
            <ScaleAdjustmentControls
              relativeOnly
              value={{
                method: "relative",
                hue: Number(previewOverrides["color.hueShift"] ?? 0),
                chroma: Number(previewOverrides["color.saturation"] ?? 100),
              }}
              onChange={(adjustment) => {
                if (adjustment.method !== "relative") return;
                setPreview({
                  parameterId: "color.hueShift",
                  value: adjustment.hue ?? 0,
                });
                setPreview({
                  parameterId: "color.saturation",
                  value: adjustment.chroma ?? 100,
                });
              }}
            />
          )}
          <div className={footerStyles}>
            <Button
              variant="secondary"
              isDisabled={!hasOverrides}
              onPress={() => clearPreview(parameterIds)}
            >
              Reset to mode values
            </Button>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
