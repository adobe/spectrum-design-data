// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Badge,
  Button,
  ColorSlider,
  ColorSwatch,
  Divider,
  LabeledValue,
  Slider,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Revert from "@react-spectrum/s2/icons/Revert";
import Sort from "@react-spectrum/s2/icons/Sort";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { parseColor } from "react-aria-components";
import { useState } from "react";
import {
  resolvedColorSystemDocumentAtom,
  addContrastTokenAtom,
  authoredContrastsAtom,
  collapsedContrastIdsAtom,
  polarityContextAtom,
  removeContrastOverridesAtom,
  removeContrastTokenAtom,
  resetOppositeContrastAtom,
  restoreContrastTokenAtom,
  contrastTokensAtom,
  sortContrastTokensAtom,
  updateContrastTokenAtom,
  resolvedBackgroundAtom,
  updateBackgroundLightnessAtom,
  updateBackgroundScaleAtom,
  canEditContrastStepsAtom,
  contrastMultiplierAtom,
  updateContrastMultiplierAtom,
} from "../../features/color-system/state";
import {
  effectiveContrast,
  MAX_CONTRAST_MULTIPLIER,
  multiplyContrast,
} from "../../features/color-system/polarity";
import { useDeletionToast } from "../../components/deletionToastContext";
import { ContrastRamp } from "../../views/color-system/ContrastRamp";
import {
  EditableSlider,
  EditOnly,
  useIsReadOnly,
} from "../../components/editable";
import { ColorScalePicker } from "../../components/color-picker/ColorScalePicker";
import { ScaleStopEditor } from "../color-system/ScaleStopEditor";
import { PaletteEditor } from "../color-system/PaletteEditor";
import { authoringCapabilityOwnersAtom } from "../../features/modes/capabilities";
import "./FoundationsColorPanel.css";
import { colorPanelTabAtom } from "../../state/view/dataVisView";
import { DataVisPanel } from "../color-system/data-vis/DataVisPanel";

const panelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "auto",
  padding: 16,
});

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const tabPanelStyles = style({
  marginTop: 16,
});

const tokenListStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});
const contrastRowStyles = style({ display: "flex", alignItems: "end", gap: 8 });
const contrastActionsStyles = style({ display: "flex", gap: 8 });
const contrastEditorStyles = style({
  display: "flex",
  alignItems: "start",
  gap: 16,
});
const contrastControlsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flexGrow: 1,
  minWidth: 0,
});
const generationSettingsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const pickerRowStyles = style({
  display: "flex",
  gap: 12,
  width: "full",
  alignItems: "center",
});
const backgroundColorControlsStyles = style({
  display: "flex",
  alignItems: "end",
  gap: 16,
  width: "full",
});
const contrastSliderStyles = style({ flexGrow: 1, minWidth: 0 });
const resolvedColorSwatchButtonStyles = style({
  padding: 0,
  borderStyle: "none",
  backgroundColor: "transparent",
  flexShrink: 0,
});

function asNumber(value: number | number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function backgroundLightnessColor(value: number) {
  return parseColor(`hsl(0, 0%, ${value * 100}%)`);
}

export function FoundationsColorPanel() {
  const [selectedTab, setSelectedTab] = useAtom(colorPanelTabAtom);
  const colorDocument = useAtomValue(resolvedColorSystemDocumentAtom);
  const modeOwners = useAtomValue(authoringCapabilityOwnersAtom);
  const isReadOnly = useIsReadOnly();
  const multiplier = useAtomValue(contrastMultiplierAtom);
  const updateMultiplier = useSetAtom(updateContrastMultiplierAtom);
  const resolvedBackground = useAtomValue(resolvedBackgroundAtom);
  const contrasts = useAtomValue(contrastTokensAtom);
  const authoredContrasts = useAtomValue(authoredContrastsAtom);
  const collapsedIds = useAtomValue(collapsedContrastIdsAtom);
  const polarity = useAtomValue(polarityContextAtom);
  const resetOpposite = useSetAtom(resetOppositeContrastAtom);
  const removeOverrides = useSetAtom(removeContrastOverridesAtom);
  const updateBackgroundScale = useSetAtom(updateBackgroundScaleAtom);
  const updateBackgroundLightness = useSetAtom(updateBackgroundLightnessAtom);
  const canEditContrasts = useAtomValue(canEditContrastStepsAtom);
  const updateContrast = useSetAtom(updateContrastTokenAtom);
  const addContrast = useSetAtom(addContrastTokenAtom);
  const removeContrast = useSetAtom(removeContrastTokenAtom);
  const restoreContrast = useSetAtom(restoreContrastTokenAtom);
  const sortContrasts = useSetAtom(sortContrastTokensAtom);
  const { notifyDeleted } = useDeletionToast();
  const [focusedContrastId, setFocusedContrastId] = useState<string | null>(
    null,
  );
  const authoredById = new Map(
    authoredContrasts.map((contrast) => [contrast.id, contrast]),
  );
  const oppositePolarity = polarity.reference === "light" ? "dark" : "light";
  const overrideCount = authoredContrasts.filter(
    (contrast) => contrast.oppositeValue !== undefined,
  ).length;

  return (
    <div className={panelStyles}>
      <div className={generationSettingsStyles}>
        {!modeOwners["color.backgroundScaleId"] && (
          <div className={pickerRowStyles}>
            <ColorScalePicker
              label="Base color scale"
              document={colorDocument}
              selectedKey={colorDocument.backgroundScaleId}
              onSelectionChange={updateBackgroundScale}
            />
          </div>
        )}
        <div className={backgroundColorControlsStyles}>
          {!modeOwners["color.backgroundLightness"] &&
            (isReadOnly ? (
              <LabeledValue
                label="Background lightness"
                value={colorDocument.backgroundLightness}
                formatOptions={{ style: "percent" }}
              />
            ) : (
              <ColorSlider
                UNSAFE_style={{ width: "100%" }}
                label="Background lightness"
                channel="lightness"
                value={backgroundLightnessColor(
                  colorDocument.backgroundLightness,
                )}
                onChange={(color) =>
                  updateBackgroundLightness(
                    (color?.getChannelValue("lightness") ?? 0) / 100,
                  )
                }
              />
            ))}
          <Button
            aria-label={`Copy resolved background color ${resolvedBackground.css}`}
            UNSAFE_className={String(resolvedColorSwatchButtonStyles)}
            onPress={async () => {
              await navigator.clipboard.writeText(resolvedBackground.css);
              ToastQueue.neutral(
                `${resolvedBackground.css} copied to clipboard`,
              );
            }}
          >
            <ColorSwatch
              color={resolvedBackground.hex}
              aria-label="Resolved background color"
              size="L"
            />
          </Button>
        </div>
        {!modeOwners["color.contrastMultiplier"] &&
          (isReadOnly ? (
            <LabeledValue
              label="Overall contrast"
              value={multiplier}
              formatOptions={{ style: "percent" }}
            />
          ) : (
            <Slider
              styles={contrastSliderStyles}
              label="Overall contrast"
              value={multiplier}
              minValue={0}
              maxValue={MAX_CONTRAST_MULTIPLIER}
              step={0.01}
              formatOptions={{ style: "percent" }}
              onChange={(value) => updateMultiplier(asNumber(value))}
            />
          ))}
      </div>
      <Divider />
      <Tabs
        density="compact"
        aria-label="Color system controls"
        selectedKey={selectedTab}
        onSelectionChange={(key) => {
          if (
            key === "palette" ||
            key === "scales" ||
            key === "data-vis" ||
            key === "contrasts" ||
            key === "surfaces"
          )
            setSelectedTab(key);
        }}
      >
        <TabList>
          <Tab id="palette">Palette</Tab>
          <Tab id="scales">Color scales</Tab>
          <Tab id="contrasts">Contrasts</Tab>
          <Tab id="data-vis">Data vis</Tab>
          {/* <Tab id="surfaces">Surfaces</Tab> */}
        </TabList>
        <TabPanel styles={tabPanelStyles} id="palette">
          <PaletteEditor />
        </TabPanel>
        <TabPanel styles={tabPanelStyles} id="scales">
          <ScaleStopEditor />
        </TabPanel>
        <TabPanel styles={tabPanelStyles} id="data-vis">
          <DataVisPanel />
        </TabPanel>
        <TabPanel styles={tabPanelStyles} id="contrasts">
          <div className={sectionStyles}>
            <EditOnly>
              <div className={contrastActionsStyles}>
                <ActionButton
                  isDisabled={!canEditContrasts}
                  onPress={() => {
                    try {
                      addContrast();
                    } catch (failure) {
                      ToastQueue.negative(
                        failure instanceof Error
                          ? failure.message
                          : String(failure),
                      );
                    }
                  }}
                >
                  <Add />
                  <Text>Add contrast</Text>
                </ActionButton>
                <ActionButton
                  isDisabled={!canEditContrasts}
                  onPress={sortContrasts}
                >
                  <Sort />
                  <Text>Sort</Text>
                </ActionButton>
                {overrideCount > 0 && (
                  <ActionButton
                    isDisabled={!canEditContrasts}
                    onPress={removeOverrides}
                  >
                    <Revert />
                    <Text>Remove overrides</Text>
                  </ActionButton>
                )}
              </div>
            </EditOnly>
            {multiplier === 0 && (
              <Text>
                Overall contrast is 0%, so every contrast is 1:1. Raise it to
                edit contrasts.
              </Text>
            )}
            <div className={contrastEditorStyles}>
              <ContrastRamp
                background={resolvedBackground.hex}
                contrasts={contrasts}
                side={colorDocument.settings.side}
                focusedContrastId={focusedContrastId}
              />
              <div className={contrastControlsStyles}>
                <div className={tokenListStyles}>
                  {contrasts.map((contrast, index) => {
                    const authored = authoredById.get(contrast.id) ?? contrast;
                    const label = `${(index + 1) * 100}`;
                    const isOverridden =
                      authored.oppositeValue !== undefined &&
                      polarity.weight > 0;
                    // S2 fills from the minimum by default; a fill offset at the value renders no fill.
                    const fillOffset = isOverridden
                      ? multiplyContrast(
                          effectiveContrast(
                            { value: authored.value },
                            polarity,
                          ),
                          multiplier,
                        )
                      : contrast.value;
                    return (
                      <div
                        key={contrast.id}
                        data-contrast-id={contrast.id}
                        className={contrastRowStyles}
                        onFocusCapture={() => setFocusedContrastId(contrast.id)}
                        onBlurCapture={() =>
                          setFocusedContrastId((current) =>
                            current === contrast.id ? null : current,
                          )
                        }
                      >
                        <EditableSlider
                          styles={contrastSliderStyles}
                          label={label}
                          labelPosition="side"
                          value={contrast.value}
                          fillOffset={fillOffset}
                          minValue={1}
                          maxValue={21}
                          step={0.01}
                          isDisabled={multiplier === 0 || !canEditContrasts}
                          onChange={(value) =>
                            updateContrast({
                              id: contrast.id,
                              value: asNumber(value),
                            })
                          }
                        />
                        {collapsedIds.has(contrast.id) && (
                          <Badge variant="notice" size="S">
                            Merged
                          </Badge>
                        )}
                        <EditOnly>
                          {authored.oppositeValue !== undefined && (
                            <ActionButton
                              isQuiet
                              isDisabled={!canEditContrasts}
                              aria-label={`Reset ${oppositePolarity} override for contrast ${label}`}
                              onPress={() => resetOpposite(contrast.id)}
                            >
                              <Revert />
                            </ActionButton>
                          )}
                          <ActionButton
                            isQuiet
                            isDisabled={!canEditContrasts}
                            aria-label={`Remove contrast ${authored.value}`}
                            onPress={() => {
                              const documentIndex = authoredContrasts.findIndex(
                                (item) => item.id === contrast.id,
                              );
                              try {
                                removeContrast(contrast.id);
                              } catch (failure) {
                                ToastQueue.negative(
                                  failure instanceof Error
                                    ? failure.message
                                    : String(failure),
                                );
                                return;
                              }
                              notifyDeleted(`Contrast ${authored.value}`, () =>
                                restoreContrast({
                                  contrast: authored,
                                  index: documentIndex,
                                }),
                              );
                            }}
                          >
                            <Delete />
                          </ActionButton>
                        </EditOnly>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </TabPanel>
        {/* <TabPanel styles={tabPanelStyles} id="surfaces">
          <SurfaceEditor />
        </TabPanel> */}
      </Tabs>
    </div>
  );
}
