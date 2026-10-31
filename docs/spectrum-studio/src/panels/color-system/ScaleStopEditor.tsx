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
import {
  type ComponentRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ColorPickerContents } from "../../components/color-picker/ColorPickerContents";
import { ColorScalePicker } from "../../components/color-picker/ColorScalePicker";
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
import type { ColorSystemDocument } from "../../features/color-system/model";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  applyColorStopToModeAtom,
  addColorScaleAtom,
  addColorStopAtom,
  removeColorScaleAtom,
  removeColorStopAtom,
  restoreColorScaleAtom,
  updateColorScalePublishingAtom,
  updateColorStopAtom,
  resetModeColorStopAtom,
} from "../../features/color-system/state";
import { capabilityOwners } from "../../features/modes/parameters";
import { authoringCapabilityOwnersAtom } from "../../features/modes/capabilities";
import { modeSetsAtom } from "../../features/modes/state";
import {
  modeSelectionAtom,
  resolveActiveMode,
} from "../../features/modes/selection";
import {
  CUSTOM_MODE_KEY,
  displayedModeIdsAtom,
} from "../../features/modes/preview";
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
  const modeSets = useAtomValue(modeSetsAtom);
  const modeOwners = useAtomValue(authoringCapabilityOwnersAtom);
  const selection = useAtomValue(modeSelectionAtom);
  const displayedModes = useAtomValue(displayedModeIdsAtom);
  const owner = modeSets.find((item) => item.id === modeOwners["color.scales"]);
  const selectedMode = owner && resolveActiveMode(owner, selection);
  const isModeEdit = !!selectedMode && selectedMode.id !== owner?.defaultModeId;
  const isCustom = !!owner && displayedModes[owner.key] === CUSTOM_MODE_KEY;
  const [editBase, setEditBase] = useState(false);
  const [pendingStop, setPendingStop] = useState<{
    scaleId: string;
    stopId: string;
    lightness?: number;
    hue?: number;
    chroma?: number;
    paletteColorId?: string | null;
  } | null>(null);
  const [destinationId, setDestinationId] = useState("");
  const [newModeName, setNewModeName] = useState("");
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
  const applyToMode = useSetAtom(applyColorStopToModeAtom);
  const resetStop = useSetAtom(resetModeColorStopAtom);
  const store = useStore();
  const addStop = useSetAtom(addColorStopAtom);
  const removeStop = useSetAtom(removeColorStopAtom);
  const scopeIsBase = editBase || !isModeEdit;
  function editStop(update: {
    scaleId: string;
    stopId: string;
    lightness?: number;
    hue?: number;
    chroma?: number;
    paletteColorId?: string | null;
  }) {
    if (!scopeIsBase && isCustom) {
      setPendingStop(update);
      setDestinationId("");
      return;
    }
    updateStop({ ...update, scope: scopeIsBase ? "base" : "mode" });
  }
  return (
    <div className={keyColorsStyles}>
      <EditOnly>
        <div className={scaleActionsStyles}>
          <ActionButton
            onPress={() =>
              notify.added("colorScale", () => {
                const id = store.set(addColorScaleAtom);
                setEditBase(false);
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
                    setEditBase(false);
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
                      onUpdateStop={editStop}
                      onResetStop={resetStop}
                      baseDocument={baseDocument}
                      document={colorDocument}
                      editBase={editBase}
                      onEditBaseChange={setEditBase}
                      modeName={isModeEdit ? selectedMode?.name : undefined}
                      isCustom={isCustom && !editBase}
                      overriddenStopIds={
                        selectedMode?.foundations.color?.scaleStops?.[
                          scale.id
                        ] ?? {}
                      }
                      allowValues={!owner}
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
      <ModalOverlay
        isOpen={pendingStop !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStop(null);
        }}
      >
        <Modal>
          <Dialog
            aria-label="Choose mode for color stop edit"
            className={popoverEditorStyles}
          >
            <h2>Apply color stop edit</h2>
            <Text>
              This change needs a mode. The adaptive preview remains temporary.
            </Text>
            <Picker
              label="Apply to mode"
              selectedKey={destinationId}
              onSelectionChange={(key) => setDestinationId(String(key))}
            >
              {(owner?.modes ?? [])
                .filter((mode) => mode.id !== owner?.defaultModeId)
                .map((mode) => (
                  <PickerItem id={mode.id} key={mode.id}>
                    {mode.name}
                  </PickerItem>
                ))}
              <PickerItem id="new">New mode</PickerItem>
            </Picker>
            {destinationId === "new" && (
              <TextField
                label="Mode name"
                value={newModeName}
                onChange={setNewModeName}
              />
            )}
            <div className={scaleActionsStyles}>
              <Button variant="secondary" onPress={() => setPendingStop(null)}>
                Dismiss
              </Button>
              <Button
                variant="accent"
                isDisabled={
                  !destinationId ||
                  (destinationId === "new" && !newModeName.trim())
                }
                onPress={() => {
                  if (!pendingStop || !owner) return;
                  applyToMode({
                    modeSetId: owner.id,
                    ...(destinationId === "new"
                      ? { name: newModeName }
                      : { modeId: destinationId }),
                    update: pendingStop,
                  });
                  setPendingStop(null);
                  setEditBase(false);
                }}
              >
                Apply edit
              </Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
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
  onResetStop: (update: { scaleId: string; stopId: string }) => void;
  baseDocument: ColorSystemDocument;
  document: ColorSystemDocument;
  editBase: boolean;
  onEditBaseChange: (value: boolean) => void;
  modeName?: string;
  isCustom: boolean;
  overriddenStopIds: Record<string, unknown>;
  allowStructure?: boolean;
  allowValues?: boolean;
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
  onResetStop,
  baseDocument,
  document,
  editBase,
  onEditBaseChange,
  modeName,
  isCustom,
  overriddenStopIds,
  allowStructure = true,
  allowValues = true,
}: ScaleControlsProps) {
  const notify = useNotify();
  const isReadOnly = useIsReadOnly();
  const updatePublishing = useSetAtom(updateColorScalePublishingAtom);
  const colorDocument =
    editBase && !isReadOnly ? resolvePaletteLinks(baseDocument) : document;
  const scale = colorDocument.scales.find(
    (candidate) => candidate.id === scaleId,
  )!;
  const selectedStop =
    scale.stops.find((stop) => stop.id === selectedStopId) ?? scale.stops[0];

  return (
    <div className={popoverEditorStyles}>
      {allowValues && (
        <div className={scaleActionsStyles}>
          <Text>
            {isCustom
              ? "Custom preview"
              : editBase || !modeName
                ? "All modes"
                : `Editing ${modeName}`}
          </Text>
          {modeName && allowStructure && (
            <ActionButton onPress={() => onEditBaseChange(!editBase)}>
              {editBase ? `Edit ${modeName}` : "Edit base"}
            </ActionButton>
          )}
        </div>
      )}
      {modeName && allowStructure && (
        <Text>
          Scale names and stop additions or removals apply to all modes.
        </Text>
      )}
      {allowStructure && (
        <SourceNameEditor
          sourceId={taxonomyColorSourceId(scale.id)}
          label="Color scale name"
          focusName={focusName}
          onNameFocused={onNameFocus}
        />
      )}
      {allowStructure && (
        <Checkbox
          isSelected={
            baseDocument.scales.find((candidate) => candidate.id === scale.id)
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
      )}
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
                  onAdd={
                    allowStructure
                      ? (lightness) =>
                          onAddStop({ scaleId: scale.id, lightness })
                      : undefined
                  }
                  onMove={
                    allowValues
                      ? (stopId, lightness) =>
                          onUpdateStop({ scaleId: scale.id, stopId, lightness })
                      : undefined
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
                    : !allowValues
                      ? "Select a stop to remove. Edit stop values in Mode sets."
                      : allowStructure
                        ? "Double click ramp to add a stop"
                        : "Select a stop to edit or drag to move it."}
                </Text>
              </div>
              {isReadOnly && allowValues && (
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
                {allowStructure && (
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
                          scale.stops.find(
                            (stop) => stop.id !== selectedStop.id,
                          )?.id ?? null,
                        );
                      }}
                    >
                      <Delete />
                      <Text>Remove stop</Text>
                    </ActionButton>
                  </div>
                )}
                {allowValues && (
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
                )}
                {allowValues && (
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
                )}
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
              <EditOnly>
                {allowValues &&
                  modeName &&
                  !editBase &&
                  !isCustom &&
                  !!overriddenStopIds[selectedStop.id] && (
                    <ActionButton
                      onPress={() =>
                        onResetStop({ scaleId, stopId: selectedStop.id })
                      }
                    >
                      Remove stop override
                    </ActionButton>
                  )}
              </EditOnly>
            </div>
          </AccordionItemPanel>
        </AccordionItem>
        {allowStructure && <CustomContrastControls scaleId={scale.id} />}
      </NestedPanelAccordion>
    </div>
  );
}

export function ModeScaleStopControls({
  focusOnMount = false,
}: {
  focusOnMount?: boolean;
}) {
  const base = useAtomValue(colorSystemDocumentAtom);
  const document = useAtomValue(resolvedColorSystemDocumentAtom);
  const sets = useAtomValue(modeSetsAtom);
  const selection = useAtomValue(modeSelectionAtom);
  const [scaleId, setScaleId] = useState(base.scales[0]?.id ?? "");
  const [stopId, setStopId] = useState<string | null>(null);
  const pickerRef = useRef<ComponentRef<typeof Picker>>(null);
  useEffect(() => {
    if (focusOnMount) pickerRef.current?.focus();
  }, [focusOnMount]);
  const update = useSetAtom(updateColorStopAtom);
  const reset = useSetAtom(resetModeColorStopAtom);
  const add = useSetAtom(addColorStopAtom);
  const remove = useSetAtom(removeColorStopAtom);
  const owner = sets.find(
    (set) => set.id === capabilityOwners(sets)["color.scales"],
  );
  const mode = owner && resolveActiveMode(owner, selection);
  const scale =
    document.scales.find((item) => item.id === scaleId) ?? document.scales[0];
  if (!scale) return <Text>No color scales available.</Text>;
  return (
    <div className={editorStyles}>
      <ColorScalePicker
        ref={pickerRef}
        label="Color scale"
        document={document}
        selectedKey={scale.id}
        onSelectionChange={(id) => {
          setScaleId(id);
          setStopId(null);
        }}
      />
      <ScaleControls
        scaleId={scale.id}
        selectedStopId={stopId}
        onSelectedStopChange={setStopId}
        baseDocument={base}
        document={document}
        editBase={mode?.id === owner?.defaultModeId}
        onEditBaseChange={() => {
          throw new Error("Use the foundation panel to edit base structure.");
        }}
        modeName={mode?.name}
        isCustom={false}
        overriddenStopIds={
          mode?.foundations.color?.scaleStops?.[scale.id] ?? {}
        }
        allowStructure={false}
        onAddStop={add}
        onRemoveStop={remove}
        onResetStop={reset}
        onUpdateStop={(input) =>
          update({
            ...input,
            scope: mode?.id === owner?.defaultModeId ? "base" : "mode",
          })
        }
      />
    </div>
  );
}
