// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../../components/notifications/notificationContext";
import { termLabel } from "../../../features/taxonomy/termPresentation";
import {
  ActionButton,
  Button,
  ButtonGroup,
  Checkbox,
  Content,
  Dialog as SpectrumDialog,
  DialogContainer,
  DialogTrigger,
  Heading,
  Menu,
  MenuItem,
  MenuTrigger,
  PickerItem,
  Popover,
  Radio,
  RadioGroup,
  Text,
  TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { type ComponentRef, useLayoutEffect, useRef, useState } from "react";
import { Dialog } from "react-aria-components";
import { Picker } from "../../../components/fields/Picker";
import { foundationCardStyles } from "../../../components/foundationCardStyles";
import { useIsReadOnly } from "../../../components/editable";
import { useNarrowScaleEditorViewport } from "../../../components/useNarrowScaleEditorViewport";
import { colorSystemDocumentAtom } from "../../../features/color-system/state";
import { modeSetsAtom } from "../../../features/modes/state";
import { capabilityOwners } from "../../../features/modes/ownership";
import {
  modeSelectionAtom,
  resolveActiveMode,
} from "../../../features/modes/selection";
import {
  CUSTOM_MODE_KEY,
  displayedModeIdsAtom,
} from "../../../features/modes/preview";
import { taxonomyDocumentAtom } from "../../../features/taxonomy/state";
import { dataVisSourceId } from "../../../features/color-system/data-vis/identity";
import { continuousSamples } from "../../../features/color-system/data-vis/continuous";
import { continuousStopBounds } from "../../../features/color-system/data-vis/editor";
import { dataVisBackground } from "../../../features/color-system/data-vis/resolution";
import {
  addContinuousDataVisAtom,
  applyCategoricalDataVisAtom,
  dataVisContextFingerprintAtom,
  dataVisContinuousOutputsAtom,
  dataVisInputDocumentAtom,
  dataVisUiSwatchesAtom,
  editDataVisPointAtom,
  editDataVisStructureAtom,
  pendingDataVisPointEditAtom,
  applyPendingDataVisPointEditAtom,
  removeDataVisScaleAtom,
  restoreDataVisScaleAtom,
  restoreDataVisPointAtom,
  dataVisPrimitiveColorsAtom,
  resolvedCategoricalTokensAtom,
} from "../../../features/color-system/data-vis/state";
import {
  editDataVisStaticColorAtom,
  editDataVisStaticStopsAtom,
  setDataVisStaticAtom,
  undoDataVisStaticAtom,
  type StaticColorsUndo,
} from "../../../features/color-system/data-vis/frozenState";
import { dataVisMemberId } from "../../../features/color-system/data-vis/identity";
import {
  frozenColorValue,
  type CategoricalDataVisScale,
  type ContinuousDataVisScale,
  type DataVisScale,
} from "../../../features/color-system/data-vis/model";
import { GradientStopControl } from "../../../components/color-picker/GradientStopControl";
import { selectedDataVisScaleIdAtom } from "../../../state/view/dataVisView";
import { ScaleColorPreview } from "../../../views/color-system/ScaleColorPreview";
import { SourceNameEditor } from "../../registry/SourceNameEditor";
import {
  DataVisPointControls,
  StaticColorControls,
} from "./DataVisPointControls";
import { CategoricalChooser } from "./CategoricalChooser";
import { useCategoricalChecks } from "../../../views/color-system/data-vis/useCategoricalChecks";
import { popoverDialogStyles } from "../../../components/popoverLayout";

const stack = style({ display: "flex", flexDirection: "column", gap: 12 });
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
});
const groups = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
  minWidth: 0,
});
const groupHeading = style({ font: "title-sm", margin: 0 });
const cardRow = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});
const card = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "start",
  gap: 8,
  width: "full",
  minWidth: 0,
  flexGrow: 1,
  padding: 8,
  textAlign: "start",
  height: "auto",
  minHeight: 48,
});
const cardName = style({ truncate: true, minWidth: 0 });
const deleteButton = style({ flexShrink: 0 });
const dialog = `${popoverDialogStyles} ${style({ display: "flex", flexDirection: "column", gap: 16, padding: 16, color: "neutral" })}`;
// Switching sources must not resize the overlay inside its own resize callback.
const continuousEditorViewport = style({
  height: "[min(640px, calc(100dvh - 24px))]",
  overflow: "auto",
});
const note = style({ font: "body-sm", color: "neutral-subdued", margin: 0 });
const negative = style({ font: "body-sm", color: "negative", margin: 0 });
const kindLabel = (scale: Pick<DataVisScale, "kind">) =>
  scale.kind === "sequential"
    ? "Sequential"
    : scale.kind === "diverging"
      ? "Diverging"
      : "Categorical";
export function DataVisPanel() {
  const notify = useNotify();
  const document = useAtomValue(colorSystemDocumentAtom),
    effective = useAtomValue(dataVisInputDocumentAtom);
  const background = dataVisBackground(effective);
  const swatches = useAtomValue(dataVisUiSwatchesAtom),
    outputs = useAtomValue(dataVisContinuousOutputsAtom);
  const categorical = useAtomValue(resolvedCategoricalTokensAtom);
  const checks = useCategoricalChecks();
  const taxonomy = useAtomValue(taxonomyDocumentAtom),
    fingerprint = useAtomValue(dataVisContextFingerprintAtom);
  const readOnly = useIsReadOnly(),
    narrow = useNarrowScaleEditorViewport();
  const [selectedId, select] = useAtom(selectedDataVisScaleIdAtom);
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
  const [draft, setDraft] = useState<{ id: string; name: string } | null>(null);
  const [freezeChoice, setFreezeChoice] = useState<{
    scaleId: string;
    recipe: string;
    fingerprint: string;
  } | null>(null);
  const [freezeFrom, setFreezeFrom] = useState("current");
  const setStatic = useSetAtom(setDataVisStaticAtom),
    undoStatic = useSetAtom(undoDataVisStaticAtom);
  const apply = useSetAtom(applyCategoricalDataVisAtom);
  const store = useStore();
  const [pending, setPending] = useAtom(pendingDataVisPointEditAtom),
    applyPending = useSetAtom(applyPendingDataVisPointEditAtom);
  const sets = useAtomValue(modeSetsAtom),
    [destination, setDestination] = useState(""),
    [newModeName, setNewModeName] = useState("");
  const pendingOwner = sets.find((axis) => axis.id === pending?.modeSetId);
  const staticUndo = (undo: StaticColorsUndo) =>
    notify.info(
      undo.after ? "Static colors saved." : "Adaptive colors restored.",
      () => undoStatic(undo),
    );
  return (
    <div className={stack} data-component="DataVisPanel">
      {!readOnly && (
        <MenuTrigger>
          <ActionButton>
            <Add />
            <Text>Add data vis scale</Text>
          </ActionButton>
          <Menu
            aria-label="Add data vis scale"
            onAction={(kind) => {
              try {
                if (kind === "sequential" || kind === "diverging") {
                  const id = notify.added("dataVisScale", () =>
                    store.set(addContinuousDataVisAtom, kind),
                  );
                  if (id) {
                    setFocusId(id);
                    setOpeningId(id);
                  }
                  return;
                }
                if (kind !== "categorical")
                  throw new Error("Choose a supported data vis scale type.");
                let index = 1;
                const names = new Set(taxonomy.terms.map((term) => term.value));
                while (names.has(`categorical ${index}`)) index++;
                const id = crypto.randomUUID();
                setDraft({ id, name: `Categorical ${index}` });
                setFocusId(id);
              } catch (failure) {
                notify.error(failure);
              }
            }}
          >
            <MenuItem id="sequential">Sequential</MenuItem>
            <MenuItem id="diverging">Diverging</MenuItem>
            <MenuItem id="categorical">Categorical</MenuItem>
          </Menu>
        </MenuTrigger>
      )}
      {!document.dataVisScales.length && !draft && (
        <Text>No data vis scales yet.</Text>
      )}
      {draft && (
        <DialogTrigger
          defaultOpen
          onOpenChange={(open) => {
            if (!open) {
              setDraft(null);
              setFocusId(null);
            }
          }}
        >
          <Button UNSAFE_className={`${foundationCardStyles} ${card}`}>
            <ScaleColorPreview colors={[]} label="New categorical scale" />
            <Text>{termLabel(draft.name)}</Text>
          </Button>
          <Popover
            placement={narrow ? "bottom start" : "right"}
            size="M"
            padding="none"
          >
            <Dialog aria-label="New categorical scale" className={dialog}>
              <CategoricalChooser
                scaleId={draft.id}
                name={draft.name}
                swatches={swatches}
                background={background}
                focusName={focusId === draft.id}
                onNameFocused={() =>
                  setFocusId((id) => (id === draft.id ? null : id))
                }
                gamut={renderGamutForOutput(effective.settings.colorOutput)}
                fingerprint={fingerprint}
                onApply={async (
                  scale,
                  fingerprint,
                  acknowledgeFailures,
                  signal,
                ) => {
                  await apply({
                    scale,
                    fingerprint,
                    acknowledgeFailures,
                    signal,
                  });
                  notify.added("dataVisScale", () => undefined);
                  setDraft(null);
                }}
                onCancel={() => setDraft(null)}
              />
            </Dialog>
          </Popover>
        </DialogTrigger>
      )}
      <div className={groups}>
        {(["sequential", "diverging", "categorical"] as const).map((kind) => {
          const scales = document.dataVisScales.filter(
            (scale) => scale.kind === kind,
          );
          if (!scales.length) return null;
          const title = kindLabel({ kind });
          return (
            <section key={kind} aria-label={title} className={stack}>
              <Heading level={3} styles={groupHeading}>
                {title}
              </Heading>
              {scales.map((scale) => {
                const check =
                  checks.status === "ready"
                    ? checks.reports[scale.id]
                    : undefined;
                const output = outputs.find((output) =>
                  output.status === "ready"
                    ? output.scale.id === scale.id
                    : output.id === scale.id,
                );
                const samples =
                  output?.status === "ready"
                    ? continuousSamples(output.scale)
                    : [];
                const colors =
                  scale.kind === "categorical"
                    ? scale.members.flatMap((member) => {
                        const token = categorical.find(
                          (token) =>
                            token.id === dataVisMemberId(scale.id, member.id),
                        );
                        return token && typeof token.value === "string"
                          ? [token.value]
                          : [];
                      })
                    : samples.map((sample) => sample.value);
                return (
                  <div key={scale.id} className={stack}>
                    <div className={cardRow}>
                      <DialogTrigger
                        isOpen={openId === scale.id}
                        onOpenChange={(open) => {
                          setOpenId((id) =>
                            open ? scale.id : id === scale.id ? null : id,
                          );
                          if (open) select(scale.id);
                          else
                            setFocusId((id) => (id === scale.id ? null : id));
                        }}
                      >
                        <Button
                          ref={
                            openingId === scale.id ? newScaleTrigger : undefined
                          }
                          UNSAFE_className={`${foundationCardStyles} ${card}`}
                          aria-label={`Open ${termLabel(scale.name)} data vis scale`}
                        >
                          <ScaleColorPreview
                            colors={colors}
                            positions={
                              samples.length
                                ? samples.map((sample) => sample.position)
                                : undefined
                            }
                            interpolation={
                              scale.kind === "sequential" ? "oklch" : undefined
                            }
                            continuous={scale.kind !== "categorical"}
                            label={`${termLabel(scale.name)} colors`}
                            background={background}
                          />
                          <Text styles={cardName}>{termLabel(scale.name)}</Text>
                        </Button>
                        <Popover
                          placement={narrow ? "bottom start" : "right"}
                          size="M"
                          padding="none"
                        >
                          <Dialog
                            aria-label={`Edit ${termLabel(scale.name)} data vis scale`}
                            className={`${dialog} ${scale.kind === "categorical" ? "" : continuousEditorViewport}`}
                          >
                            <SourceNameEditor
                              sourceId={dataVisSourceId(scale.id)}
                              label="Scale name"
                              focusName={focusId === scale.id}
                              onNameFocused={() =>
                                setFocusId((id) =>
                                  id === scale.id ? null : id,
                                )
                              }
                            />
                            <Checkbox
                              isSelected={!!scale.staticColors}
                              isDisabled={readOnly}
                              onChange={(selected) => {
                                try {
                                  if (selected) {
                                    setFreezeFrom("current");
                                    setFreezeChoice({
                                      scaleId: scale.id,
                                      recipe: JSON.stringify(scale),
                                      fingerprint,
                                    });
                                  } else
                                    staticUndo(
                                      setStatic({ scaleId: scale.id }),
                                    );
                                } catch (failure) {
                                  notify.error(failure);
                                }
                              }}
                            >
                              Static
                            </Checkbox>
                            {scale.kind !== "categorical" ? (
                              <ContinuousEditor scale={scale} />
                            ) : scale.staticColors ? (
                              <StaticCategoricalEditor scale={scale} />
                            ) : readOnly ? (
                              <>
                                <h2>{termLabel(scale.name)}</h2>
                                <Text>
                                  Linked categorical colors. Enter edit mode to
                                  change the selection.
                                </Text>
                                <ScaleColorPreview
                                  colors={colors}
                                  continuous={false}
                                  label={`${termLabel(scale.name)} selected colors`}
                                  background={background}
                                />
                                {scale.members.map((member, index) => (
                                  <Text key={member.id}>
                                    Color {index + 1}:{" "}
                                    {swatches.find(
                                      (swatch) =>
                                        swatch.source.scaleId ===
                                          member.source.scaleId &&
                                        swatch.source.contrastId ===
                                          member.source.contrastId,
                                    )?.label ??
                                      "Unavailable source; choose a replacement"}
                                  </Text>
                                ))}
                              </>
                            ) : (
                              <CategoricalChooser
                                scaleId={scale.id}
                                name={scale.name}
                                initial={scale}
                                swatches={swatches}
                                memberOverrides={Object.fromEntries(
                                  scale.members.flatMap((member) => {
                                    const token = categorical.find(
                                      (token) =>
                                        token.id ===
                                        dataVisMemberId(scale.id, member.id),
                                    );
                                    return token?.valueOverridden &&
                                      typeof token.value === "string"
                                      ? [[member.id, token.value]]
                                      : [];
                                  }),
                                )}
                                background={background}
                                gamut={renderGamutForOutput(
                                  effective.settings.colorOutput,
                                )}
                                fingerprint={fingerprint}
                                onApply={async (
                                  scale,
                                  fingerprint,
                                  acknowledgeFailures,
                                  signal,
                                ) => {
                                  await apply({
                                    scale,
                                    fingerprint,
                                    acknowledgeFailures,
                                    signal,
                                  });
                                  setOpenId(null);
                                }}
                                onCancel={() => setOpenId(null)}
                              />
                            )}
                            {!readOnly && <PublishingControl scale={scale} />}
                          </Dialog>
                        </Popover>
                      </DialogTrigger>
                      {!readOnly && (
                        <ActionButton
                          isQuiet
                          styles={deleteButton}
                          aria-label={`Delete data vis scale ${termLabel(scale.name)}`}
                          onPress={() => {
                            notify.remove({
                              kind: "dataVisScale",
                              noun: termLabel(scale.name),
                              run: (store) =>
                                store.set(removeDataVisScaleAtom, scale.id),
                              undo: (removed) =>
                                store.set(restoreDataVisScaleAtom, removed),
                              onDone: () => {
                                if (selectedId === scale.id) select(null);
                              },
                            });
                          }}
                        >
                          <Delete />
                        </ActionButton>
                      )}
                    </div>
                    {output?.status === "error" && (
                      <p role="alert" className={negative}>
                        {output.error}
                      </p>
                    )}
                    {scale.kind === "categorical" &&
                      (checks.status === "error" ? (
                        <p role="alert" className={negative}>
                          {checks.error}
                        </p>
                      ) : checks.status === "loading" ? (
                        <Text>Checking selection targets</Text>
                      ) : check?.status === "error" ? (
                        <p role="alert" className={negative}>
                          {check.error}
                        </p>
                      ) : check?.status === "ready" &&
                        check.report.failureCount > 0 ? (
                        <p role="status" className={negative}>
                          {check.report.failureCount} selection targets are
                          unmet in this mode.
                        </p>
                      ) : null)}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <DialogContainer onDismiss={() => setFreezeChoice(null)}>
        {freezeChoice && (
          <SpectrumDialog aria-label="Use Static colors" size="M">
            <Heading slot="title">Use Static colors</Heading>
            <Content>
              <RadioGroup
                label="Colors to keep"
                value={freezeFrom}
                onChange={setFreezeFrom}
              >
                <Radio value="current">Current colors</Radio>
                <Radio value="default">Default-mode colors</Radio>
              </RadioGroup>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setFreezeChoice(null)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                onPress={() => {
                  try {
                    const current = document.dataVisScales.find(
                      (scale) => scale.id === freezeChoice.scaleId,
                    );
                    if (JSON.stringify(current) !== freezeChoice.recipe)
                      throw new Error(
                        "This scale changed. Reopen the Static choice.",
                      );
                    if (freezeFrom !== "current" && freezeFrom !== "default")
                      throw new Error("Choose the colors to keep.");
                    const undo = setStatic({
                      scaleId: freezeChoice.scaleId,
                      from: freezeFrom,
                      fingerprint: freezeChoice.fingerprint,
                    });
                    setFreezeChoice(null);
                    staticUndo(undo);
                  } catch (failure) {
                    notify.error(failure);
                  }
                }}
              >
                Use Static
              </Button>
            </ButtonGroup>
          </SpectrumDialog>
        )}
      </DialogContainer>
      <DialogContainer onDismiss={() => setPending(null)}>
        {pending && (
          <SpectrumDialog aria-label="Choose mode for data vis edit" size="M">
            <Heading slot="title">Apply data vis edit</Heading>
            <Content>
              <div className={stack}>
                <Text>
                  Choose where to save this change. The adaptive preview is
                  temporary.
                </Text>
                <Picker
                  label="Apply to mode"
                  selectedKey={destination}
                  onSelectionChange={(key) => setDestination(String(key))}
                >
                  <PickerItem id="new">New mode</PickerItem>
                  {pendingOwner?.modes
                    .filter((mode) => mode.id !== pendingOwner.defaultModeId)
                    .map((mode) => (
                      <PickerItem id={mode.id} key={mode.id}>
                        {mode.name}
                      </PickerItem>
                    ))}
                </Picker>
                {destination === "new" && (
                  <TextField
                    label="New mode name"
                    value={newModeName}
                    onChange={setNewModeName}
                  />
                )}
              </div>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                isDisabled={
                  !destination || (destination === "new" && !newModeName.trim())
                }
                onPress={() => {
                  try {
                    applyPending(
                      destination === "new"
                        ? { name: newModeName }
                        : { modeId: destination },
                    );
                    setDestination("");
                    setNewModeName("");
                  } catch (failure) {
                    notify.error(failure);
                  }
                }}
              >
                Apply
              </Button>
            </ButtonGroup>
          </SpectrumDialog>
        )}
      </DialogContainer>
    </div>
  );
}

function PublishingControl({ scale }: { scale: DataVisScale }) {
  const notify = useNotify();
  const edit = useSetAtom(editDataVisStructureAtom);
  return (
    <Checkbox
      isSelected={scale.hideFromPublishing === true}
      onChange={(hideFromPublishing) => {
        try {
          edit({ kind: "publishing", scaleId: scale.id, hideFromPublishing });
        } catch (failure) {
          notify.error(failure);
        }
      }}
    >
      Hide from publishing
    </Checkbox>
  );
}

function ContinuousEditor({ scale }: { scale: ContinuousDataVisScale }) {
  const notify = useNotify();
  const store = useStore();
  const base = useAtomValue(colorSystemDocumentAtom),
    effective = useAtomValue(dataVisInputDocumentAtom);
  const swatches = useAtomValue(dataVisUiSwatchesAtom),
    outputs = useAtomValue(dataVisContinuousOutputsAtom);
  const primitives = useAtomValue(dataVisPrimitiveColorsAtom);
  const readOnly = useIsReadOnly(),
    sets = useAtomValue(modeSetsAtom),
    selection = useAtomValue(modeSelectionAtom);
  const displayedModes = useAtomValue(displayedModeIdsAtom);
  const [editBase, setEditBase] = useState(false),
    [pointId, setPointId] = useState(scale.points[0].id);
  const edit = useSetAtom(editDataVisPointAtom),
    structure = useSetAtom(editDataVisStructureAtom);
  const editStatic = useSetAtom(editDataVisStaticColorAtom),
    staticStops = useSetAtom(editDataVisStaticStopsAtom);
  const owners = capabilityOwners(sets);
  const modeFor = (capability: "color.scales" | "color.contrastMultiplier") => {
    const axis = sets.find((axis) => axis.id === owners[capability]),
      mode = axis && resolveActiveMode(axis, selection);
    return mode && mode.id !== axis?.defaultModeId ? mode : undefined;
  };
  const sourceMode = modeFor("color.scales"),
    contrastMode = modeFor("color.contrastMultiplier");
  const customFor = (
    capability: "color.scales" | "color.contrastMultiplier",
  ) => {
    const axis = sets.find((axis) => axis.id === owners[capability]);
    return !!axis && displayedModes[axis.key] === CUSTOM_MODE_KEY;
  };
  const sourceCustom = customFor("color.scales"),
    contrastCustom = customFor("color.contrastMultiplier");
  const baseScope =
    !!scale.staticColors ||
    editBase ||
    (!sourceMode && !contrastMode && !sourceCustom && !contrastCustom);
  const displayed = baseScope
    ? scale
    : effective.dataVisScales.find((item) => item.id === scale.id);
  if (!displayed || displayed.kind === "categorical")
    return <Text>This scale is unavailable.</Text>;
  const positions = scale.staticColors
    ? scale.staticColors.map((color) => {
        if (color.position === undefined)
          throw new Error("This Static stop has no position.");
        return { id: color.id, position: color.position };
      })
    : displayed.points;
  const selected =
    positions.find((point) => point.id === pointId) ?? positions[0];
  const bounds = continuousStopBounds(positions, selected.id, scale.kind);
  const point = displayed.points.find((point) => point.id === selected.id);
  const frozen = scale.staticColors?.find((color) => color.id === selected.id);
  const output = outputs.find((output) =>
    output.status === "ready"
      ? output.scale.id === scale.id
      : output.id === scale.id,
  );
  const attempt = (callback: () => void) => {
    try {
      callback();
    } catch (failure) {
      notify.error(failure);
    }
  };
  const addStop = (position?: number) =>
    attempt(() => {
      if (scale.staticColors)
        setPointId(
          staticStops({ scaleId: scale.id, kind: "add", position }).selectedId,
        );
      else {
        structure({
          scaleId: scale.id,
          kind: "add-point",
          scope: "base",
          position,
        });
        const next = store
          .get(colorSystemDocumentAtom)
          .dataVisScales.find((candidate) => candidate.id === scale.id);
        if (next?.kind !== "categorical") {
          const added = next?.points.find(
            (point) =>
              !scale.points.some((previous) => previous.id === point.id),
          );
          if (added) setPointId(added.id);
        }
      }
    });
  const moveStop = (id: string, position: number) =>
    attempt(() => {
      if (scale.staticColors)
        editStatic({ scaleId: scale.id, colorId: id, position });
      else edit({ scaleId: scale.id, pointId: id, position, scope: "base" });
    });
  const samples =
    output?.status === "ready" ? continuousSamples(output.scale) : [];
  return (
    <div className={stack}>
      {output?.status === "ready" && (
        <GradientStopControl
          selectedId={selected.id}
          onSelect={setPointId}
          gradient={`linear-gradient(to right${scale.kind === "sequential" ? " in oklch" : ""}, ${samples.map((sample) => `${sample.value} ${sample.position * 100}%`).join(", ")})`}
          isReadOnly={readOnly}
          onAdd={baseScope ? addStop : undefined}
          onMove={baseScope ? moveStop : undefined}
          stops={output.scale.points.map((point) => {
            const bounds = continuousStopBounds(
              positions,
              point.id,
              scale.kind,
            );
            return {
              id: point.id,
              position: point.position,
              color: point.value,
              movable: !bounds.fixed,
              minimum: bounds.minimum,
              maximum: bounds.maximum,
              label: `${
                point.position === 0
                  ? "Start"
                  : point.position === 1
                    ? "End"
                    : scale.kind === "diverging" && point.position === 0.5
                      ? "Center"
                      : "Color"
              } stop, ${Number((point.position * 100).toFixed(6))} percent`,
            };
          })}
        />
      )}
      {!readOnly && (
        <div className={row}>
          <ActionButton
            isQuiet
            aria-label="Add color stop"
            isDisabled={!baseScope}
            onPress={() => addStop()}
          >
            <Add />
          </ActionButton>
          <ActionButton
            isQuiet
            aria-label="Remove selected color stop"
            isDisabled={!baseScope || bounds.fixed}
            onPress={() =>
              attempt(() => {
                if (scale.staticColors) {
                  const result = staticStops({
                    scaleId: scale.id,
                    kind: "remove",
                    colorId: selected.id,
                  });
                  notify.remove({
                    kind: "dataVisColorStop",
                    run: (store) =>
                      store.set(editDataVisStaticStopsAtom, {
                        scaleId: scale.id,
                        kind: "remove",
                        colorId: selected.id,
                      }),
                    undo: (removed) =>
                      store.set(undoDataVisStaticAtom, removed.undo),
                    onDone: () => setPointId(result.selectedId),
                  });
                } else {
                  notify.remove({
                    kind: "dataVisColorStop",
                    run: (store) =>
                      store.set(editDataVisStructureAtom, {
                        scaleId: scale.id,
                        pointId: selected.id,
                        kind: "remove-point",
                        scope: "base",
                      }),
                    undo: (undo) => {
                      if (undo) store.set(restoreDataVisPointAtom, undo);
                    },
                    onDone: () => setPointId(scale.points[0].id),
                  });
                }
              })
            }
          >
            <Delete />
          </ActionButton>
        </div>
      )}
      {frozen ? (
        <StaticColorControls
          color={frozen}
          document={base}
          primitiveColors={primitives}
          readOnly={readOnly}
          fixedPosition={bounds.fixed}
          minimumPosition={bounds.minimum}
          maximumPosition={bounds.maximum}
          onPositionChange={(position) => moveStop(selected.id, position)}
          onValueChange={(value) =>
            attempt(() => {
              editStatic({ scaleId: scale.id, colorId: selected.id, value });
            })
          }
          onTokenChange={(tokenId) =>
            attempt(() => {
              editStatic({ scaleId: scale.id, colorId: selected.id, tokenId });
            })
          }
        />
      ) : (
        point && (
          <DataVisPointControls
            point={point}
            document={base}
            swatches={swatches}
            primitiveColors={primitives}
            baseScope={baseScope}
            readOnly={readOnly}
            fixedPosition={bounds.fixed}
            minimumPosition={bounds.minimum}
            maximumPosition={bounds.maximum}
            onBaseScopeChange={
              sourceMode || contrastMode || sourceCustom || contrastCustom
                ? setEditBase
                : undefined
            }
            sourceModeName={
              sourceCustom ? "Adaptive preview" : sourceMode?.name
            }
            contrastModeName={
              contrastCustom ? "Adaptive preview" : contrastMode?.name
            }
            sourceOverridden={
              !!sourceMode?.foundations.color?.dataVisSources?.[scale.id]?.[
                point.id
              ]
            }
            contrastOverridden={
              contrastMode?.foundations.color?.dataVisContrasts?.[scale.id]?.[
                point.id
              ] !== undefined
            }
            onSourceChange={(source) =>
              attempt(() => {
                edit({
                  scaleId: scale.id,
                  pointId: point.id,
                  source,
                  scope: baseScope ? "base" : "mode",
                });
              })
            }
            onContrastChange={(value, oppositeValue) =>
              attempt(() => {
                edit({
                  scaleId: scale.id,
                  pointId: point.id,
                  contrast: {
                    value,
                    ...(oppositeValue !== undefined && { oppositeValue }),
                  },
                  scope: baseScope ? "base" : "mode",
                });
              })
            }
            onPositionChange={(position) => moveStop(point.id, position)}
            onReset={(reset) =>
              attempt(() => {
                edit({
                  scaleId: scale.id,
                  pointId: point.id,
                  reset,
                  scope: "mode",
                });
              })
            }
            onAllModes={() =>
              attempt(() => {
                edit({
                  scaleId: scale.id,
                  pointId: point.id,
                  source: point.source,
                  scope: "all-modes",
                });
              })
            }
          />
        )
      )}
      {output?.status === "error" ? (
        <p role="alert" className={negative}>
          {output.error}
        </p>
      ) : (
        output?.status === "ready" &&
        output.scale.diagnostics.map((message) => (
          <p key={message} role="status" className={note}>
            {message}
          </p>
        ))
      )}
    </div>
  );
}

function StaticCategoricalEditor({
  scale,
}: {
  scale: CategoricalDataVisScale;
}) {
  const notify = useNotify();
  const document = useAtomValue(colorSystemDocumentAtom),
    primitives = useAtomValue(dataVisPrimitiveColorsAtom);
  const effective = useAtomValue(dataVisInputDocumentAtom),
    readOnly = useIsReadOnly();
  const [memberId, setMemberId] = useState(scale.members[0].id);
  const edit = useSetAtom(editDataVisStaticColorAtom);
  const color =
    scale.staticColors?.find((color) => color.id === memberId) ??
    scale.staticColors?.[0];
  if (!color || !scale.staticColors)
    return <Text>This captured color is unavailable.</Text>;
  const attempt = (callback: () => void) => {
    try {
      callback();
    } catch (failure) {
      notify.error(failure);
    }
  };
  return (
    <div className={stack}>
      <ScaleColorPreview
        colors={scale.members.map((member) => {
          const color = scale.staticColors!.find(
            (color) => color.id === member.id,
          );
          if (!color)
            throw new Error("This member has no captured Static color.");
          return frozenColorValue(color);
        })}
        continuous={false}
        label={`${termLabel(scale.name)} Static colors`}
        background={dataVisBackground(effective)}
      />
      <Picker
        label="Color"
        selectedKey={color.id}
        onSelectionChange={(id) => setMemberId(String(id))}
      >
        {scale.members.map((member, index) => (
          <PickerItem key={member.id} id={member.id}>
            Color {index + 1}
          </PickerItem>
        ))}
      </Picker>
      <StaticColorControls
        color={color}
        document={document}
        primitiveColors={primitives}
        readOnly={readOnly}
        onValueChange={(value) =>
          attempt(() => {
            edit({ scaleId: scale.id, colorId: color.id, value });
          })
        }
        onTokenChange={(tokenId) =>
          attempt(() => {
            edit({ scaleId: scale.id, colorId: color.id, tokenId });
          })
        }
      />
    </div>
  );
}
import { renderGamutForOutput } from "../../../features/color-system/colorMath";
