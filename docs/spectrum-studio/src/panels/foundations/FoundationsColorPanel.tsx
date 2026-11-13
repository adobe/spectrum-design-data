// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import {
  ActionButton,
  Badge,
  Button,
  ColorSwatch,
  Divider,
  LabeledValue,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Revert from "@react-spectrum/s2/icons/Revert";
import Sort from "@react-spectrum/s2/icons/Sort";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
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
  contrastTokensAtom,
  sortContrastTokensAtom,
  updateContrastTokenAtom,
  updateContrastIndexAtom,
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
import { ContrastRamp } from "../../views/color-system/ContrastRamp";
import {
  DraftLightnessSlider,
  DraftSlider,
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
import {
  generateSelectedColor,
  opacityStopsEnabled,
} from "../../features/color-system/colorScaleType";
import {
  scaleContrasts,
  contrastStepIndex,
} from "../../features/color-system/contrastSteps";
import { rulesAtom } from "../../features/logic/library";
import { buildScaleData } from "../../features/color-system/scaleGeneration";
import {
  subPanelTabSelectionAtom,
  SECTIONS_SUBPANEL_TABS_STATE_KEY,
} from "../../state/view/subPanelTabs";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import {
  parseScaleIndex,
  swatchIndex,
  swatchIndexOptions,
} from "../../features/scales/swatchIndices";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";

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
const contrastRowStyles = style({ display: "flex", alignItems: "end", gap: 4 });
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
const indexStyles = style({
  font: "ui-sm",
  width: "[9ch]",
  maxWidth: "[9ch]",
  flexShrink: 0,
});
const resolvedColorSwatchButtonStyles = style({
  padding: 0,
  borderStyle: "none",
  backgroundColor: "transparent",
  flexShrink: 0,
});

function asNumber(value: number | number[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function FoundationsColorPanel() {
  const notify = useNotify();
  const [selectedTab, setSelectedTab] = useAtom(colorPanelTabAtom);
  const colorDocument = useAtomValue(resolvedColorSystemDocumentAtom);
  const rules = useAtomValue(rulesAtom);
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
  const updateIndex = useSetAtom(updateContrastIndexAtom);
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const indexCategory = taxonomy.categories.find(
    (category) => category.key === "scaleIndex",
  );
  const registeredIndices = taxonomy.terms.flatMap((term) =>
    term.categoryId === indexCategory?.id && typeof term.value === "number"
      ? [term.value]
      : [],
  );
  const addContrast = useSetAtom(addContrastTokenAtom);
  const sortContrasts = useSetAtom(sortContrastTokensAtom);
  const [focusedContrastId, setFocusedContrastId] = useState<string | null>(
    null,
  );
  const syncOpacity = opacityStopsEnabled(colorDocument.settings);
  const navigateFoundation = useSetAtom(subPanelTabSelectionAtom);
  const [measuredScaleId, setMeasuredScaleId] = useState<string | null>(null);
  const measuredScale =
    colorDocument.scales.find((scale) => scale.id === measuredScaleId) ??
    colorDocument.scales[0];
  const measuredStops =
    syncOpacity && measuredScale
      ? scaleContrasts(colorDocument, measuredScale).map((stop, index) => {
          const color = generateSelectedColor(
            buildScaleData(measuredScale, colorDocument.settings.colorOutput),
            resolvedBackground.linear,
            stop,
            colorDocument.settings,
          );
          return {
            id: stop.id,
            css: color.css,
            label: String(
              contrastStepIndex(
                index,
                measuredScale,
                rules,
                colorDocument.contrasts,
              ),
            ),
            value: `${color.measuredContrast.toFixed(2)}:1`,
            description: `${contrastStepIndex(index, measuredScale, rules, colorDocument.contrasts)}: ${color.measuredContrast.toFixed(2)}:1`,
          };
        })
      : [];
  const contrastOnlyControls =
    !syncOpacity || colorDocument.scales.some((scale) => scale.customContrasts);
  const authoredById = new Map(
    authoredContrasts.map((contrast) => [contrast.id, contrast]),
  );
  const oppositePolarity = polarity.reference === "light" ? "dark" : "light";
  const overrideCount = authoredContrasts.filter(
    (contrast) => contrast.oppositeValue !== undefined,
  ).length;

  return (
    <div className={panelStyles}>
      {colorDocument.colorOutputIssues?.map((issue) => (
        <div key={issue} role="status">
          <Text>{issue}</Text>
        </div>
      ))}
      <div className={generationSettingsStyles}>
        <div className={pickerRowStyles}>
          {!modeOwners["color.backgroundScaleId"] && (
            <ColorScalePicker
              label="Base color scale"
              document={colorDocument}
              selectedKey={colorDocument.backgroundScaleId}
              onSelectionChange={updateBackgroundScale}
            />
          )}
          <Button
            aria-label={`Copy resolved background color ${resolvedBackground.css}`}
            UNSAFE_className={String(resolvedColorSwatchButtonStyles)}
            onPress={async () => {
              await navigator.clipboard.writeText(resolvedBackground.css);
              notify.copied();
            }}
          >
            <ColorSwatch
              color={resolvedBackground.hex}
              aria-label="Resolved background color"
              size="L"
            />
          </Button>
        </div>
        <div className={backgroundColorControlsStyles}>
          {!modeOwners["color.backgroundLightness"] &&
            (isReadOnly ? (
              <LabeledValue
                label="Background lightness"
                value={colorDocument.backgroundLightness}
                formatOptions={{ style: "percent" }}
              />
            ) : (
              <DraftLightnessSlider
                UNSAFE_style={{ width: "100%" }}
                label="Background lightness"
                value={colorDocument.backgroundLightness}
                onChange={updateBackgroundLightness}
              />
            ))}
        </div>
        {contrastOnlyControls &&
          !modeOwners["color.contrastMultiplier"] &&
          (isReadOnly ? (
            <LabeledValue
              label="Overall contrast"
              value={multiplier}
              formatOptions={{ style: "percent" }}
            />
          ) : (
            <DraftSlider
              styles={contrastSliderStyles}
              label="Overall contrast"
              value={multiplier}
              minValue={0}
              maxValue={MAX_CONTRAST_MULTIPLIER}
              step={0.01}
              formatOptions={{ style: "percent" }}
              onChange={updateMultiplier}
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
          {syncOpacity ? (
            <div className={sectionStyles}>
              <ColorScalePicker
                label="Color scale"
                document={colorDocument}
                selectedKey={measuredScale.id}
                onSelectionChange={setMeasuredScaleId}
              />
              <ContrastRamp
                kind="samples"
                label="Measured color contrasts"
                background={resolvedBackground.css}
                samples={measuredStops}
              />
              {measuredStops.map((stop) => (
                <LabeledValue
                  key={stop.id}
                  label={stop.label}
                  value={stop.value}
                />
              ))}
              <Button
                onPress={() =>
                  navigateFoundation((previous) => ({
                    ...previous,
                    [SECTIONS_SUBPANEL_TABS_STATE_KEY]: "opacity",
                  }))
                }
              >
                Edit opacity
              </Button>
            </div>
          ) : (
            <div className={sectionStyles}>
              <EditOnly>
                <div className={contrastActionsStyles}>
                  <ActionButton
                    isDisabled={!canEditContrasts}
                    onPress={() => {
                      try {
                        addContrast();
                      } catch (failure) {
                        notify.error(
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
                      const authored =
                        authoredById.get(contrast.id) ?? contrast;
                      const scaleIndex = swatchIndex(contrast, index);
                      const label = String(scaleIndex);
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
                          onFocusCapture={() =>
                            setFocusedContrastId(contrast.id)
                          }
                          onBlurCapture={() =>
                            setFocusedContrastId((current) =>
                              current === contrast.id ? null : current,
                            )
                          }
                        >
                          <EditableSlider
                            styles={contrastSliderStyles}
                            labelGap="compact"
                            label={
                              <div className={indexStyles} data-swatch-index>
                                {isReadOnly ? (
                                  <Text>{scaleIndex}</Text>
                                ) : (
                                  <TokenComboBox
                                    inline
                                    size="S"
                                    ariaLabel={`Scale index for contrast ${label}`}
                                    options={swatchIndexOptions(
                                      registeredIndices,
                                      contrasts.map(swatchIndex),
                                      scaleIndex,
                                    )}
                                    selectedKey={label}
                                    displayMode="values"
                                    isRequired
                                    isDisabled={!canEditContrasts}
                                    onChange={(key) => {
                                      if (key !== null) {
                                        try {
                                          updateIndex({
                                            id: contrast.id,
                                            scaleIndex: parseScaleIndex(key),
                                          });
                                        } catch (failure) {
                                          notify.error(failure);
                                        }
                                      }
                                    }}
                                    customValue={{
                                      inputType: "number",
                                      isAllowed: (text) =>
                                        !contrasts.some(
                                          (item, position) =>
                                            item.id !== contrast.id &&
                                            swatchIndex(item, position) ===
                                              Number(text),
                                        ),
                                      displayValue: label,
                                      onAccept: (text) =>
                                        updateIndex({
                                          id: contrast.id,
                                          scaleIndex: parseScaleIndex(text),
                                        }),
                                    }}
                                  />
                                )}
                              </div>
                            }
                            aria-label={`Contrast ${label}`}
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
                                notify.remove({
                                  kind: "customContrastStep",
                                  run: (store) =>
                                    store.set(
                                      removeContrastTokenAtom,
                                      contrast.id,
                                    ),
                                });
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
          )}
        </TabPanel>
        {/* <TabPanel styles={tabPanelStyles} id="surfaces">
          <SurfaceEditor />
        </TabPanel> */}
      </Tabs>
    </div>
  );
}
