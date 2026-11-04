// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  AlertDialog,
  Button,
  ButtonGroup,
  DialogContainer,
  Menu,
  MenuItem,
  MenuTrigger,
  PickerItem,
  Switch,
  Text,
  TextArea,
  TextField,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import ChevronLeft from "@react-spectrum/s2/icons/ChevronLeft";
import Delete from "@react-spectrum/s2/icons/Delete";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useState } from "react";
import { useNotify } from "../../components/notifications/notificationContext";
import { CategoryIcon } from "../../components/CategoryIcon";
import { ModeParameterControl } from "../../components/ModeParameterControl";
import { EditableSlider } from "../../components/editable";
import { NumberField } from "../../components/fields/NumberField";
import { ScaleAdjustmentControls } from "../../panels/foundations/ScaleAdjustmentControls";
import { normalizedAdjustment } from "../../features/color-system/scaleAdjustment";
import { Picker } from "../../components/fields/Picker";
import { useIsReadOnly } from "../../components/editable";
import { MODE_ICON_OPTIONS } from "../../features/modes/icons";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  BINDABLE_PARAMETER_RANGES,
  capabilityOwners,
  effectiveParameterValue,
  FOUNDATION_PARAMETERS,
  FOUNDATIONS,
  type FoundationId,
  type FoundationDocuments,
} from "../../features/modes/parameters";
import {
  createMode,
  createModeSet,
  ensureModeSetKeys,
  type AuthoringCapability,
  type Mode,
  type ModeSet,
} from "../../features/modes/model";
import {
  addModeSetAtom,
  modeSetsAtom,
  removeModeSetAtom,
  replaceModeSetAtom,
  restoreModeSetAtom,
} from "../../features/modes/state";
import {
  adaptiveClaimsAtom,
  claimsForModeSet,
  commitModeSetClaimsAtom,
} from "../../features/modes/adaptive";
import { foundationDocumentsAtom } from "../../features/modes/foundationDocuments";
import {
  editingModeSetIdAtom,
  NEW_MODE_SET_ID,
  pendingModeSetFoundationAtom,
} from "../../state/view/modesView";
import { setParameterValue } from "../../features/modes/parameters";
import {
  colorSystemDocumentAtom,
  updateColorSystemSettingsAtom,
} from "../../features/color-system/state";
import { ModeSetPreview } from "../../components/ModeSetPreview";
import {
  modeSetDraftHasChanges,
  modeSetFoundationSelection,
} from "../../features/modes/presentation";
import { FOUNDATION_MODE_ATTACHMENT_DEFAULTS } from "../../state/view/foundationModeAttachments";
import { foundationModeAttachmentsAtom as attachmentsAtom } from "../../state/view/foundationModeAttachments";

const pageStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  height: "full",
  minHeight: 0,
  overflow: "auto",
  padding: 24,
});
const headerStyles = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
});
const titleStyles = style({ font: "heading-lg", margin: 0, flexGrow: 1 });
const columnsStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(300px, 0.8fr) minmax(0, 1.5fr)",
  alignItems: "start",
  gap: 24,
});
const leftStyles = style({ display: "flex", flexDirection: "column", gap: 16 });
const panelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
  borderRadius: "xl",
  backgroundColor: "layer-1",
  minWidth: 0,
});
const panelHeaderStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});
const sectionHeadingStyles = style({ font: "title-sm", margin: 0 });
const modesHeadingStyles = style({ font: "title-lg", margin: 0 });
const foundationCardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  borderRadius: "lg",
  backgroundColor: "layer-2",
});
const foundationHeadingStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});
const tableStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 64px 72px",
  alignItems: "center",
});
const tableHeaderStyles = style({
  font: "detail",
  color: "neutral-subdued",
  paddingBlock: 8,
});
const tableRowStyles = style({
  display: "contents",
});
const parameterLabelStyles = style({
  borderBlockStartWidth: 1,
  borderBlockStartStyle: "solid",
  borderBlockStartColor: "border",
  paddingBlock: 8,
  minWidth: 0,
});
const switchCellStyles = style({
  display: "flex",
  justifyContent: "center",
  borderBlockStartWidth: 1,
  borderBlockStartStyle: "solid",
  borderBlockStartColor: "border",
  paddingBlock: 8,
});
const modeCardStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(180px, 0.8fr) minmax(0, 1fr) 36px",
  alignItems: "start",
  gap: 12,
  padding: 12,
  borderRadius: "lg",
  backgroundColor: "layer-2",
});
const modeMetadataStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});
const modeParametersStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});
const previewColumnStyles = style({
  display: "flex",
  justifyContent: "center",
  gridColumn: "1 / -1",
});
const polarityStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 72px",
  gap: 8,
  alignItems: "end",
});

function clearCapabilityOverrides(
  mode: Mode,
  capability: AuthoringCapability,
): Mode {
  if (capability === "color.scaleAdjustment") {
    const color = { ...mode.foundations.color };
    delete color.scaleAdjustment;
    const foundations = { ...mode.foundations };
    if (Object.keys(color).length) foundations.color = color;
    else delete foundations.color;
    return {
      ...mode,
      foundations,
    };
  }
  const parameter = FOUNDATION_PARAMETERS.find(
    (candidate) => candidate.id === capability,
  );
  return parameter ? setParameterValue(mode, parameter.id, undefined) : mode;
}

function modeParameterDocuments(documents: FoundationDocuments) {
  return documents;
}

export function ModeSetEditorLayout({ modeSetId }: { modeSetId: string }) {
  const notify = useNotify();
  const store = useStore();
  const readOnly = useIsReadOnly();
  const editingId = useSetAtom(editingModeSetIdAtom);
  const pendingFoundation = useAtomValue(pendingModeSetFoundationAtom);
  const setPendingFoundation = useSetAtom(pendingModeSetFoundationAtom);
  const sets = useAtomValue(modeSetsAtom);
  const stored = sets.find((set) => set.id === modeSetId);
  const isNew = modeSetId === NEW_MODE_SET_ID;
  const initial = isNew ? createModeSet() : stored;
  const [draft, setDraft] = useState<ModeSet | null>(() =>
    initial ? structuredClone(initial) : null,
  );
  const [foundations, setFoundations] = useState<FoundationId[]>(() =>
    modeSetFoundationSelection(
      initial,
      isNew
        ? []
        : (store.get(attachmentsAtom)[modeSetId] ??
            FOUNDATION_MODE_ATTACHMENT_DEFAULTS[modeSetId] ??
            []),
      pendingFoundation,
    ),
  );
  const [adaptiveIds, setAdaptiveIds] = useState<string[]>(() =>
    Object.keys(claimsForModeSet(store.get(adaptiveClaimsAtom), modeSetId)),
  );
  const documents = useAtomValue(foundationDocumentsAtom);
  const colorSystem = useAtomValue(colorSystemDocumentAtom);
  const updateColorSettings = useSetAtom(updateColorSystemSettingsAtom);
  const [polarityCompensation, setPolarityCompensation] = useState(
    colorSystem.settings.polarityCompensation ?? 0,
  );
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const addSet = useSetAtom(addModeSetAtom);
  const replaceSet = useSetAtom(replaceModeSetAtom);
  const commitClaims = useSetAtom(commitModeSetClaimsAtom);
  const setAttachments = useSetAtom(attachmentsAtom);
  const owners = capabilityOwners(sets);

  if (!draft)
    return (
      <div className="pageMainContent" data-component="ModeSetEditorLayout">
        <div className={pageStyles}>
          <Button variant="secondary" onPress={() => editingId(null)}>
            Back to Modes
          </Button>
          <Text>This mode set no longer exists.</Text>
        </div>
      </div>
    );

  const isReadOnly = readOnly;
  const close = () => {
    editingId(null);
    setPendingFoundation(null);
  };
  const originalDraft = {
    modeSet: stored,
    foundations: modeSetFoundationSelection(
      stored,
      store.get(attachmentsAtom)[modeSetId] ??
        FOUNDATION_MODE_ATTACHMENT_DEFAULTS[modeSetId] ??
        [],
    ),
    adaptiveParameterIds: Object.keys(
      claimsForModeSet(store.get(adaptiveClaimsAtom), modeSetId),
    ),
    polarityCompensation: colorSystem.settings.polarityCompensation ?? 0,
  };
  const isDirty = modeSetDraftHasChanges(originalDraft, {
    modeSet: draft,
    foundations,
    adaptiveParameterIds: adaptiveIds,
    polarityCompensation,
  });
  const requestClose = () => {
    if (isDirty) setDiscardPromptOpen(true);
    else close();
  };
  const updateMode = (modeId: string, patch: Partial<Mode>) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            modes: current.modes.map((mode) =>
              mode.id === modeId ? { ...mode, ...patch } : mode,
            ),
          }
        : current,
    );
  const setCapability = (capability: AuthoringCapability, selected: boolean) =>
    setDraft((current) => {
      if (!current) return current;
      const currentCaps = current.authoringCapabilities ?? [];
      return {
        ...current,
        authoringCapabilities: selected
          ? [...new Set([...currentCaps, capability])]
          : currentCaps.filter((item) => item !== capability),
        modes: selected
          ? current.modes
          : current.modes.map((mode) =>
              clearCapabilityOverrides(mode, capability),
            ),
      };
    });
  const save = () => {
    if (!draft) return;
    const next = ensureModeSetKeys(draft);
    try {
      if (isNew) {
        const added = notify.added("modeSet", () => {
          addSet(next);
          return true;
        });
        if (!added) return;
      } else replaceSet(next);
      commitClaims({ modeSetId: next.id, parameterIds: adaptiveIds });
      setAttachments({
        ...store.get(attachmentsAtom),
        [next.id]: foundations,
      });
      if (foundations.includes("color") || foundations.includes("opacity"))
        updateColorSettings({ polarityCompensation });
      close();
    } catch (failure) {
      notify.error(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };

  const remove = () => {
    if (isNew) return close();
    try {
      const modeSet = stored ?? draft;
      const index = sets.findIndex((set) => set.id === modeSetId);
      const claims = claimsForModeSet(store.get(adaptiveClaimsAtom), modeSetId);
      const attachments = store.get(attachmentsAtom)[modeSetId];
      notify.remove({
        kind: "modeSet",
        noun: modeSet.name,
        run: (currentStore) => ({
          tokenValues: currentStore.set(removeModeSetAtom, modeSetId),
          modeSet,
          index,
          claims,
          attachments,
        }),
        undo: (removed) =>
          store.set(restoreModeSetAtom, {
            modeSet: removed.modeSet,
            index: removed.index,
            claims: removed.claims,
            attachments: removed.attachments,
            tokenValues: removed.tokenValues,
          }),
      });
      close();
    } catch (failure) {
      notify.error(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };
  const availableFoundations = FOUNDATIONS.filter(
    (foundation) => !foundations.includes(foundation.id),
  );
  const modeControls = (mode: Mode) =>
    FOUNDATION_PARAMETERS.filter(
      (parameter) =>
        draft.authoringCapabilities?.includes(
          parameter.id as AuthoringCapability,
        ) && foundations.includes(parameter.foundation),
    ).map((parameter) => ({
      parameter,
      value: effectiveParameterValue(mode, parameter.id, documents),
    }));

  return (
    <div className="pageMainContent" data-component="ModeSetEditorLayout">
      <div className={pageStyles}>
        <header className={headerStyles}>
          <ActionButton onPress={requestClose}>
            <ChevronLeft />
            <Text>Back to Modes</Text>
          </ActionButton>
          <h2 className={titleStyles}>{draft.name || "New mode set"}</h2>
          {!isReadOnly && (
            <ButtonGroup>
              <Button variant="secondary" onPress={requestClose}>
                Cancel
              </Button>
              <Button variant="accent" onPress={save}>
                {isNew ? "Add mode set" : "Save changes"}
              </Button>
              {!isNew && (
                <Button variant="negative" onPress={remove}>
                  Delete mode set
                </Button>
              )}
            </ButtonGroup>
          )}
        </header>
        <div className={columnsStyles}>
          <div className={leftStyles}>
            <section className={panelStyles} aria-label="Mode set details">
              <div className={headerStyles}>
                <TextField
                  label="Name"
                  isRequired
                  isReadOnly={isReadOnly}
                  value={draft.name}
                  onChange={(name) => setDraft({ ...draft, name })}
                />
                <Picker
                  label="Mode set icon"
                  isDisabled={isReadOnly}
                  selectedKey={draft.iconId ?? "none"}
                  onSelectionChange={(key) =>
                    setDraft({
                      ...draft,
                      iconId: String(key) as ModeSet["iconId"],
                    })
                  }
                >
                  {MODE_ICON_OPTIONS.map((option) => (
                    <PickerItem
                      key={option.id}
                      id={option.id}
                      textValue={option.label}
                    >
                      {option.icon}
                      <Text>{option.label}</Text>
                    </PickerItem>
                  ))}
                </Picker>
              </div>
              <TextArea
                label="Description"
                isReadOnly={isReadOnly}
                value={draft.description}
                onChange={(description) => setDraft({ ...draft, description })}
              />
            </section>
            <section
              className={panelStyles}
              aria-label="Foundation support settings"
            >
              <div className={panelHeaderStyles}>
                <h3 className={sectionHeadingStyles}>
                  Foundation support settings
                </h3>
                {!isReadOnly && availableFoundations.length > 0 && (
                  <MenuTrigger>
                    <ActionButton aria-label="Add foundation">
                      <Add />
                      <Text>Add</Text>
                    </ActionButton>
                    <Menu
                      aria-label="Add foundation"
                      onAction={(key) =>
                        setFoundations((current) => [
                          ...current,
                          String(key) as FoundationId,
                        ])
                      }
                    >
                      {availableFoundations.map((foundation) => (
                        <MenuItem key={foundation.id} id={foundation.id}>
                          {foundation.label}
                        </MenuItem>
                      ))}
                    </Menu>
                  </MenuTrigger>
                )}
              </div>
              {foundations.map((foundation) => {
                const options = AUTHORING_CAPABILITY_OPTIONS.filter(
                  (option) => option.foundation === foundation,
                );
                return (
                  <section key={foundation} className={foundationCardStyles}>
                    <div className={panelHeaderStyles}>
                      <div className={foundationHeadingStyles}>
                        <CategoryIcon category={foundation} />
                        <h4 className={sectionHeadingStyles}>
                          {
                            FOUNDATIONS.find((item) => item.id === foundation)
                              ?.label
                          }
                        </h4>
                      </div>
                      {!isReadOnly && (
                        <ActionButton
                          aria-label={`Remove ${foundation} foundation`}
                          onPress={() => {
                            setFoundations((current) =>
                              current.filter((item) => item !== foundation),
                            );
                            for (const option of options)
                              setCapability(option.id, false);
                            setAdaptiveIds((current) =>
                              current.filter(
                                (id) =>
                                  !options.some((option) => option.id === id),
                              ),
                            );
                          }}
                        >
                          <Delete />
                        </ActionButton>
                      )}
                    </div>
                    {foundation === "opacity" && (
                      <p>
                        Opacity values follow the selected Color background.
                      </p>
                    )}
                    {foundation !== "opacity" && (
                      <div className={tableStyles} role="table">
                        <span className={tableHeaderStyles} role="columnheader">
                          Parameter
                        </span>
                        <span className={tableHeaderStyles} role="columnheader">
                          Modal
                        </span>
                        <span className={tableHeaderStyles} role="columnheader">
                          Adaptive
                        </span>
                        {options.map((option) => {
                          const owner = owners[option.id];
                          const locked =
                            owner !== undefined && owner !== draft.id;
                          const adaptiveOwner =
                            store.get(adaptiveClaimsAtom)[option.id];
                          const adaptiveLocked =
                            adaptiveOwner !== undefined &&
                            adaptiveOwner !== draft.id;
                          const adaptiveAllowed =
                            option.id !== "color.scaleAdjustment" &&
                            option.id in BINDABLE_PARAMETER_RANGES;
                          const ownerName = sets.find(
                            (set) => set.id === owner,
                          )?.name;
                          return (
                            <div key={option.id} className={tableRowStyles}>
                              <span className={parameterLabelStyles}>
                                {locked
                                  ? `${option.label} (managed by ${ownerName})`
                                  : option.label}
                              </span>
                              <span className={switchCellStyles}>
                                <Switch
                                  aria-label={`Modal ${option.label}`}
                                  size="S"
                                  isSelected={draft.authoringCapabilities?.includes(
                                    option.id,
                                  )}
                                  isDisabled={isReadOnly || locked}
                                  onChange={(selected) => {
                                    setCapability(option.id, selected);
                                    if (!selected)
                                      setAdaptiveIds((current) =>
                                        current.filter(
                                          (id) => id !== option.id,
                                        ),
                                      );
                                  }}
                                />
                              </span>
                              <span className={switchCellStyles}>
                                {adaptiveAllowed ? (
                                  <Switch
                                    aria-label={`Adaptive ${option.label}`}
                                    size="S"
                                    isSelected={adaptiveIds.includes(option.id)}
                                    isDisabled={
                                      isReadOnly || locked || adaptiveLocked
                                    }
                                    onChange={(selected) => {
                                      if (selected)
                                        setCapability(option.id, true);
                                      setAdaptiveIds((current) =>
                                        selected
                                          ? [
                                              ...new Set([
                                                ...current,
                                                option.id,
                                              ]),
                                            ]
                                          : current.filter(
                                              (id) => id !== option.id,
                                            ),
                                      );
                                    }}
                                  />
                                ) : (
                                  <TooltipTrigger>
                                    <span>
                                      <Switch
                                        aria-label={`Adaptive ${option.label} not available`}
                                        size="S"
                                        isDisabled
                                      />
                                    </span>
                                    <Tooltip>Not available</Tooltip>
                                  </TooltipTrigger>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {(foundation === "color" || foundation === "opacity") && (
                      <>
                        <div className={polarityStyles}>
                          <EditableSlider
                            label="Polarity compensation (dark modes)"
                            value={polarityCompensation}
                            minValue={0}
                            maxValue={1}
                            step={0.01}
                            formatOptions={{ style: "percent" }}
                            isReadOnly={isReadOnly}
                            onChange={(value) =>
                              setPolarityCompensation(
                                Array.isArray(value) ? value[0] : value,
                              )
                            }
                          />
                          <NumberField
                            aria-label="Polarity compensation percent"
                            value={polarityCompensation}
                            minValue={0}
                            maxValue={1}
                            step={0.01}
                            formatOptions={{ style: "percent" }}
                            isReadOnly={isReadOnly}
                            onChange={setPolarityCompensation}
                          />
                        </div>
                        <p>
                          Adjusts color contrast as the background gets darker.
                        </p>
                      </>
                    )}
                  </section>
                );
              })}
            </section>
          </div>
          <section className={panelStyles} aria-label="Modes">
            <div className={panelHeaderStyles}>
              <h3 className={modesHeadingStyles}>Modes</h3>
              {!isReadOnly && (
                <ActionButton
                  aria-label="Add mode"
                  onPress={() =>
                    setDraft({
                      ...draft,
                      modes: [...draft.modes, createMode()],
                    })
                  }
                >
                  <Add />
                  <Text>Add mode</Text>
                </ActionButton>
              )}
            </div>
            {draft.modes.map((mode) => {
              const isDefault = mode.id === draft.defaultModeId;
              return (
                <section key={mode.id} className={modeCardStyles}>
                  <div className={modeMetadataStyles}>
                    <TextField
                      label="Name"
                      isRequired
                      isReadOnly={isReadOnly}
                      value={mode.name}
                      onChange={(name) => updateMode(mode.id, { name })}
                    />
                    <TextArea
                      label="Description"
                      isReadOnly={isReadOnly}
                      value={mode.description}
                      onChange={(description) =>
                        updateMode(mode.id, { description })
                      }
                    />
                    <Picker
                      label="Mode icon"
                      isDisabled={
                        isReadOnly || (draft.iconId ?? "none") !== "none"
                      }
                      selectedKey={mode.iconId}
                      onSelectionChange={(key) =>
                        updateMode(mode.id, {
                          iconId: String(key) as Mode["iconId"],
                        })
                      }
                    >
                      {MODE_ICON_OPTIONS.map((option) => (
                        <PickerItem
                          key={option.id}
                          id={option.id}
                          textValue={option.label}
                        >
                          {option.icon}
                          <Text>{option.label}</Text>
                        </PickerItem>
                      ))}
                    </Picker>
                    <Switch
                      isSelected={isDefault}
                      isDisabled={isReadOnly || isDefault}
                      onChange={() =>
                        setDraft({
                          ...draft,
                          defaultModeId: mode.id,
                          modes: draft.modes.map((item) =>
                            item.id === mode.id
                              ? { ...item, foundations: {} }
                              : item,
                          ),
                        })
                      }
                    >
                      Default mode
                    </Switch>
                  </div>
                  <div className={modeParametersStyles}>
                    <h4 className={sectionHeadingStyles}>Mode parameters</h4>
                    {isDefault ? (
                      <Text>Uses foundation values</Text>
                    ) : (
                      modeControls(mode).map(({ parameter, value }) =>
                        value === undefined ? null : (
                          <ModeParameterControl
                            key={parameter.id}
                            parameter={parameter}
                            documents={modeParameterDocuments(documents)}
                            value={value}
                            onChange={(next) => {
                              const nextMode = setParameterValue(
                                mode,
                                parameter.id,
                                next,
                              );
                              updateMode(mode.id, {
                                foundations: nextMode.foundations,
                              });
                            }}
                          />
                        ),
                      )
                    )}
                    {!isDefault &&
                      draft.authoringCapabilities?.includes(
                        "color.scaleAdjustment",
                      ) &&
                      foundations.includes("color") && (
                        <ScaleAdjustmentControls
                          value={mode.foundations.color?.scaleAdjustment}
                          onChange={(adjustment) =>
                            updateMode(mode.id, {
                              foundations: {
                                ...mode.foundations,
                                color: {
                                  ...mode.foundations.color,
                                  scaleAdjustment:
                                    normalizedAdjustment(adjustment),
                                },
                              },
                            })
                          }
                        />
                      )}
                  </div>
                  <ActionButton
                    isQuiet
                    aria-label={`Delete mode ${mode.name}`}
                    isDisabled={isReadOnly || draft.modes.length <= 1}
                    onPress={() =>
                      setDraft({
                        ...draft,
                        modes: draft.modes.filter(
                          (item) => item.id !== mode.id,
                        ),
                      })
                    }
                  >
                    <Delete />
                  </ActionButton>
                  <div className={previewColumnStyles}>
                    <ModeSetPreview
                      modeSet={{ ...draft, modes: [mode] }}
                      foundations={foundations}
                    />
                  </div>
                </section>
              );
            })}
          </section>
        </div>
      </div>
      <DialogContainer onDismiss={() => setDiscardPromptOpen(false)}>
        {discardPromptOpen && (
          <AlertDialog
            variant="destructive"
            title="Discard changes"
            primaryActionLabel="Discard"
            cancelLabel="Keep editing"
            onPrimaryAction={() => {
              setDiscardPromptOpen(false);
              close();
            }}
          >
            Your unsaved changes will be lost.
          </AlertDialog>
        )}
      </DialogContainer>
    </div>
  );
}
