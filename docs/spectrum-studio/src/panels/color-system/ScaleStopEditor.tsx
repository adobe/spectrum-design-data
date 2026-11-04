// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  ActionButton,
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  Button,
  Checkbox,
  DialogTrigger,
  PickerItem,
  Popover,
  Text,
  TextField,
} from "@react-spectrum/s2";
import { Picker } from "../../components/fields/Picker";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { type ComponentRef, useLayoutEffect, useRef, useState } from "react";
import { Dialog } from "react-aria-components";
import { ColorPickerContents } from "../../components/color-picker/ColorPickerContents";
import { GradientStopControl } from "../../components/color-picker/GradientStopControl";
import { foundationCardStyles } from "../../components/foundationCardStyles";
import { PaletteSwatchPicker } from "../../components/palette/PaletteSwatchPicker";
import { resolvePaletteLinks } from "../../features/color-system/paletteReferences";
import { paletteColorCss } from "../../features/color-system/paletteValue";
import { EditOnly, useIsReadOnly } from "../../components/editable";
import {
  gamutClamp,
  outputColorCss,
  renderGamutForOutput,
} from "../../features/color-system/colorMath";
import { buildScaleData } from "../../features/color-system/scaleGeneration";
import {
  scaleInterpolation,
  type ColorScaleInterpolation,
  type ColorSystemDocument,
} from "../../features/color-system/model";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  addColorScaleAtom,
  addColorStopAtom,
  removeColorScaleAtom,
  removeColorStopAtom,
  restoreColorScaleAtom,
  updateColorScaleInterpolationAtom,
  updateColorScalePublishingAtom,
  updateColorStopAtom,
} from "../../features/color-system/state";
import {
  selectedColorScaleIdAtom,
  selectedColorStopIdAtom,
} from "../../state/view/colorSystemView";
import { SourceNameEditor } from "../registry/SourceNameEditor";
import { taxonomyColorSourceId } from "../../features/taxonomy/model";
import { CustomContrastControls } from "./CustomContrastControls";
import { useNarrowScaleEditorViewport } from "../../components/useNarrowScaleEditorViewport";
import { ScaleColorPreview } from "../../views/color-system/ScaleColorPreview";
import { popoverDialogStyles } from "../../components/popoverLayout";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";

const editorStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});
const scaleActionsStyles = style({ display: "flex", flexWrap: "wrap", gap: 8 });
const scaleRowStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  width: "full",
});
const popoverEditorStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
  color: "neutral",
});
const fieldRowStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 8,
});
const scaleSettingsStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 8,
});
const scaleTriggerStyles = style({
  display: "flex",
  alignItems: "start",
  justifyContent: "start",
  columnGap: 8,
  width: "full",
  minHeight: 44,
  padding: 4,
  cursor: "default",
  textAlign: "start",
});
const scaleNameStyles = style({ truncate: true, color: "neutral" });
const rampEditorStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});
const rampHintStyles = style({ font: "detail", color: "detail" });
const keyColorsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});

export function ScaleStopEditor() {
  const notify = useNotify();
  const isNarrow = useNarrowScaleEditorViewport();
  const colorDocument = useAtomValue(resolvedColorSystemDocumentAtom);
  const baseDocument = useAtomValue(colorSystemDocumentAtom);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const newScaleTrigger = useRef<ComponentRef<typeof Button>>(null);
  useLayoutEffect(() => {
    if (!openingId || !newScaleTrigger.current) return;
    newScaleTrigger.current.focus();
    setOpenId(openingId);
    setOpeningId(null);
  }, [openingId]);
  const [selectedScaleId, setSelectedScaleId] = useAtom(
    selectedColorScaleIdAtom,
  );
  const [selectedStopId, setSelectedStopId] = useAtom(selectedColorStopIdAtom);
  const updateStop = useSetAtom(updateColorStopAtom);
  const store = useStore();
  const addStop = useSetAtom(addColorStopAtom);
  const removeStop = useSetAtom(removeColorStopAtom);
  return (
    <div className={keyColorsStyles}>
      <EditOnly>
        <div className={scaleActionsStyles}>
          <ActionButton
            onPress={() =>
              notify.added("colorScale", () => {
                const id = store.set(addColorScaleAtom);
                setFocusId(id);
                setOpeningId(id);
                return id;
              })
            }
          >
            <Add />
            <Text>Add color scale</Text>
          </ActionButton>
        </div>
      </EditOnly>
      {colorDocument.scales.map((scale) => {
        const rampColors = buildScaleData(
          scale,
          colorDocument.settings.colorOutput,
        ).ramp.map((color) => color.css);
        return (
          <div key={scale.id} className={editorStyles}>
            <div className={scaleRowStyles}>
              <DialogTrigger
                isOpen={openId === scale.id}
                onOpenChange={(open) => {
                  setOpenId((id) =>
                    open ? scale.id : id === scale.id ? null : id,
                  );
                  if (!open) setFocusId((id) => (id === scale.id ? null : id));
                }}
              >
                <Button
                  ref={openingId === scale.id ? newScaleTrigger : undefined}
                  aria-label={termLabel(scale.name)}
                  UNSAFE_className={`${foundationCardStyles} ${scaleTriggerStyles}`}
                  onPress={() => {
                    setSelectedScaleId(scale.id);
                    setSelectedStopId(scale.stops[0]?.id ?? null);
                  }}
                >
                  <ScaleColorPreview
                    colors={rampColors}
                    label={`${termLabel(scale.name)} colors`}
                  />
                  <Text UNSAFE_className={String(scaleNameStyles)}>
                    {termLabel(scale.name)}
                  </Text>
                </Button>
                <Popover
                  size="M"
                  padding="none"
                  placement={isNarrow ? "bottom start" : "right"}
                >
                  <Dialog
                    aria-label={`Edit ${termLabel(scale.name)} scale`}
                    className={popoverDialogStyles}
                  >
                    <ScaleControls
                      scaleId={scale.id}
                      focusName={focusId === scale.id}
                      onNameFocus={() =>
                        setFocusId((id) => (id === scale.id ? null : id))
                      }
                      selectedStopId={
                        scale.id === selectedScaleId
                          ? selectedStopId
                          : (scale.stops[0]?.id ?? null)
                      }
                      onSelectedStopChange={setSelectedStopId}
                      onAddStop={addStop}
                      onRemoveStop={removeStop}
                      onUpdateStop={updateStop}
                      document={baseDocument}
                    />
                  </Dialog>
                </Popover>
              </DialogTrigger>
              <EditOnly>
                <ActionButton
                  isQuiet
                  aria-label={`Delete scale ${termLabel(scale.name)}`}
                  isDisabled={colorDocument.scales.length <= 1}
                  onPress={() => {
                    const currentIndex = colorDocument.scales.findIndex(
                      (candidate) => candidate.id === scale.id,
                    );
                    const fallback =
                      colorDocument.scales[currentIndex + 1] ??
                      colorDocument.scales[currentIndex - 1];
                    notify.remove({
                      kind: "colorScale",
                      noun: termLabel(scale.name),
                      run: (store) => store.set(removeColorScaleAtom, scale.id),
                      undo: (result) => {
                        if (result.ok)
                          store.set(
                            restoreColorScaleAtom,
                            result.removedScale ?? {
                              scale,
                              index: currentIndex,
                            },
                          );
                      },
                      onDone: () => {
                        if (scale.id === selectedScaleId) {
                          setSelectedScaleId(fallback.id);
                          setSelectedStopId(fallback.stops[0]?.id ?? null);
                        }
                      },
                    });
                  }}
                >
                  <Delete />
                </ActionButton>
              </EditOnly>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ScaleControlsProps {
  scaleId: string;
  focusName?: boolean;
  onNameFocus?: () => void;
  selectedStopId: string | null;
  onSelectedStopChange: (id: string | null) => void;
  onAddStop: (input: string | { scaleId: string; lightness?: number }) => void;
  onRemoveStop: (update: { scaleId: string; stopId: string }) => void;
  onUpdateStop: (update: {
    scaleId: string;
    stopId: string;
    lightness?: number;
    hue?: number;
    chroma?: number;
    paletteColorId?: string | null;
  }) => void;
  document: ColorSystemDocument;
}

function ScaleControls({
  scaleId,
  focusName,
  onNameFocus,
  selectedStopId,
  onSelectedStopChange,
  onAddStop,
  onRemoveStop,
  onUpdateStop,
  document,
}: ScaleControlsProps) {
  const notify = useNotify();
  const isReadOnly = useIsReadOnly();
  const updatePublishing = useSetAtom(updateColorScalePublishingAtom);
  const updateInterpolation = useSetAtom(updateColorScaleInterpolationAtom);
  const colorDocument = !isReadOnly ? resolvePaletteLinks(document) : document;
  const scale = colorDocument.scales.find(
    (candidate) => candidate.id === scaleId,
  )!;
  const selectedStop =
    scale.stops.find((stop) => stop.id === selectedStopId) ?? scale.stops[0];

  return (
    <div className={popoverEditorStyles}>
      <SourceNameEditor
        sourceId={taxonomyColorSourceId(scale.id)}
        label="Color scale name"
        focusName={focusName}
        onNameFocused={onNameFocus}
      />
      <div className={scaleSettingsStyles}>
        <Checkbox
          isSelected={
            document.scales.find((candidate) => candidate.id === scale.id)
              ?.hideFromPublishing ?? false
          }
          isDisabled={isReadOnly}
          onChange={(hideFromPublishing) => {
            try {
              updatePublishing({ scaleId: scale.id, hideFromPublishing });
            } catch (failure) {
              notify.error(
                failure instanceof Error ? failure.message : String(failure),
              );
            }
          }}
        >
          Hide from publishing
        </Checkbox>
        <Picker
          isQuiet
          label="Interpolation"
          labelPosition="side"
          isDisabled={isReadOnly}
          selectedKey={scaleInterpolation(
            document.scales.find((candidate) => candidate.id === scale.id) ??
              scale,
          )}
          onSelectionChange={(key) =>
            updateInterpolation({
              scaleId: scale.id,
              interpolation: key as ColorScaleInterpolation,
            })
          }
        >
          <PickerItem id="oklch">OKLCh</PickerItem>
          <PickerItem id="rgb">RGB</PickerItem>
        </Picker>
      </div>
      <NestedPanelAccordion
        allowsMultipleExpanded={false}
        defaultExpandedKeys={["key-colors"]}
      >
        <AccordionItem id="key-colors">
          <AccordionItemTitle>Key colors</AccordionItemTitle>
          <AccordionItemPanel>
            <div className={editorStyles}>
              <div className={rampEditorStyles}>
                <GradientStopControl
                  selectedId={selectedStop.id}
                  onSelect={onSelectedStopChange}
                  isReadOnly={isReadOnly}
                  gradient={`linear-gradient(to right, ${buildScaleData(
                    scale,
                    colorDocument.settings.colorOutput,
                  )
                    .ramp.map((color) => color.css)
                    .join(", ")})`}
                  onAdd={(lightness) =>
                    onAddStop({ scaleId: scale.id, lightness })
                  }
                  onMove={(stopId, lightness) =>
                    onUpdateStop({ scaleId: scale.id, stopId, lightness })
                  }
                  stops={scale.stops.map((stop, index) => ({
                    id: stop.id,
                    position: stop.lightness,
                    movable: !stop.paletteColorId,
                    label: `Stop ${index + 1}, lightness ${Math.round(stop.lightness * 100)} percent`,
                    color: outputColorCss(
                      gamutClamp(
                        stop.lightness,
                        (stop.chroma / 100) * 0.4,
                        stop.hue,
                        renderGamutForOutput(
                          colorDocument.settings.colorOutput,
                        ),
                      ),
                      colorDocument.settings.colorOutput,
                    ),
                  }))}
                />
                <Text UNSAFE_className={String(rampHintStyles)}>
                  {isReadOnly
                    ? "Select a stop to view its color."
                    : "Double click ramp to add a stop"}
                </Text>
              </div>
              {isReadOnly && (
                <PaletteSwatchPicker
                  isReadOnly
                  palette={colorDocument.palette}
                  outputGamut={colorDocument.settings.colorOutput}
                  linkedId={selectedStop.paletteColorId}
                  onLink={() => undefined}
                  onUnlink={() => undefined}
                />
              )}
              <EditOnly>
                <div className={fieldRowStyles}>
                  <ActionButton onPress={() => onAddStop(scale.id)}>
                    <Add />
                    <Text>Add stop</Text>
                  </ActionButton>
                  <ActionButton
                    aria-label="Remove selected stop"
                    isDisabled={scale.stops.length <= 1}
                    onPress={() => {
                      onRemoveStop({ scaleId, stopId: selectedStop.id });
                      onSelectedStopChange(
                        scale.stops.find((stop) => stop.id !== selectedStop.id)
                          ?.id ?? null,
                      );
                    }}
                  >
                    <Delete />
                    <Text>Remove stop</Text>
                  </ActionButton>
                </div>
                <PaletteSwatchPicker
                  presentation="swatches"
                  palette={colorDocument.palette}
                  outputGamut={colorDocument.settings.colorOutput}
                  linkedId={selectedStop.paletteColorId}
                  onLink={(paletteColorId) =>
                    onUpdateStop({
                      scaleId: scale.id,
                      stopId: selectedStop.id,
                      paletteColorId,
                    })
                  }
                  onUnlink={() =>
                    onUpdateStop({
                      scaleId: scale.id,
                      stopId: selectedStop.id,
                      paletteColorId: null,
                    })
                  }
                />
                <ColorPickerContents
                  color={`oklch(${selectedStop.lightness} ${(selectedStop.chroma / 100) * 0.4} ${selectedStop.hue})`}
                  colorSpace="OKlch"
                  onChange={(_, parsedColor) => {
                    const [lightness, chroma, hue] = parsedColor
                      .to("oklch")
                      .coords.map(Number);
                    onUpdateStop({
                      scaleId: scale.id,
                      stopId: selectedStop.id,
                      lightness,
                      chroma: (chroma / 0.4) * 100,
                      hue: Number.isFinite(hue) ? hue : selectedStop.hue,
                    });
                  }}
                />
              </EditOnly>
              {isReadOnly && (
                <TextField
                  label="Color value"
                  isReadOnly
                  value={paletteColorCss(
                    selectedStop,
                    colorDocument.settings.colorOutput,
                  )}
                  styles={style({ width: "full", minWidth: 0 })}
                />
              )}
            </div>
          </AccordionItemPanel>
        </AccordionItem>
        <CustomContrastControls scaleId={scale.id} />
      </NestedPanelAccordion>
    </div>
  );
}
