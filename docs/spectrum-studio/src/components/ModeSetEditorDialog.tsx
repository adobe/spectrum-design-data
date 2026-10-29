// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  ButtonGroup,
  Checkbox,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  Picker,
  PickerItem,
  Tag,
  TagGroup,
  Text,
  TextArea,
  TextField,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, type ReactElement } from "react";
import { MODE_ICON_OPTIONS, type ModeIconId } from "../features/modes/icons";
import {
  createMode,
  type AuthoringCapability,
  type Mode,
  type ModeSet,
} from "../features/modes/model";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  FOUNDATIONS,
  capabilityFoundations,
  parametersForFoundations,
  setParameterValue,
  type FoundationId,
} from "../features/modes/parameters";
import {
  adaptiveClaimsAtom,
  claimsForModeSet,
  commitModeSetClaimsAtom,
} from "../features/modes/adaptive";
import { effectiveParameterOwnersAtom } from "../features/modes/adaptiveSelectors";
import { modeSetsAtom } from "../features/modes/state";
import { platformsAtom, resolvePlatforms } from "../features/platforms/state";
import { ModeOverridesTable } from "./ModeOverridesTable";
import { ModeCapabilityChoices } from "./ModeCapabilityChoices";
import { foundationModeAttachmentsAtom } from "../state/view/foundationModeAttachments";
import {
  foundationRemovalIssue,
  modeSetFoundationsAtom,
} from "../features/modes/foundationAttachments";

const formStyles = style({ display: "flex", flexDirection: "column", gap: 16 });
const identityRowStyles = style({
  display: "flex",
  alignItems: "end",
  gap: 16,
});
const nameFieldStyles = style({ flexGrow: 1, minWidth: 0 });
const sectionHeaderStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginTop: 8,
});
const sectionTitleStyles = style({ font: "title", margin: 0 });
const adaptiveSectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 8,
});
const modeRowStyles = style({
  display: "flex",
  alignItems: "start",
  gap: 16,
  padding: 16,
  borderRadius: "default",
  backgroundColor: "layer-1",
});
const modeFieldsStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1.5fr)",
  alignItems: "start",
  gap: 16,
  flexGrow: 1,
  minWidth: 0,
});
const modeIdentityStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});
const platformFieldStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
});

interface ModeSetEditorDialogProps {
  /** Omit when the editor is opened by an S2 DialogContainer. */
  trigger?: ReactElement;
  title: string;
  /** Re-seeded every time the dialog opens so edits stay uncommitted until save. */
  createDraft: () => ModeSet;
  onSave: (
    modeSet: ModeSet,
    settings: { foundations: FoundationId[]; adaptiveIds: string[] },
  ) => void;
  isStaged?: boolean;
  onDelete?: () => void;
  initialFoundations?: FoundationId[];
}

export function ModeSetEditorDialog({
  trigger,
  title,
  createDraft,
  onSave,
  onDelete,
  initialFoundations,
  isStaged = false,
}: ModeSetEditorDialogProps) {
  const platforms = useAtomValue(platformsAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const adaptiveClaims = useAtomValue(adaptiveClaimsAtom);
  const parameterOwners = useAtomValue(effectiveParameterOwnersAtom);
  const commitClaims = useSetAtom(commitModeSetClaimsAtom);
  const [draft, setDraft] = useState<ModeSet>(createDraft);
  const memberships = useAtomValue(modeSetFoundationsAtom);
  const [adaptiveIds, setAdaptiveIds] = useState<string[]>(() =>
    Object.keys(claimsForModeSet(adaptiveClaims, draft.id)),
  );
  const [foundations, setFoundations] = useState<FoundationId[]>(() => {
    const owned =
      initialFoundations ??
      memberships[draft.id] ??
      capabilityFoundations(draft.authoringCapabilities ?? []);
    return owned.length ? owned : ["color"];
  });
  const setAttachments = useSetAtom(foundationModeAttachmentsAtom);
  const hasModeSetIcon = (draft.iconId ?? "none") !== "none";

  function updateMode(id: string, patch: Partial<Mode>) {
    setDraft((current) => ({
      ...current,
      modes: current.modes.map((mode) =>
        mode.id === id ? { ...mode, ...patch } : mode,
      ),
    }));
  }

  function clearOverride(modeId: string, parameterId: string) {
    setDraft((current) => ({
      ...current,
      modes: current.modes.map((mode) =>
        mode.id === modeId
          ? setParameterValue(mode, parameterId, undefined)
          : mode,
      ),
    }));
  }

  const dialog = (
    <Dialog size="XL">
      {({ close }) => (
        <>
          <Heading slot="title">{title}</Heading>
          <Content>
            <div className={formStyles}>
              <div className={identityRowStyles}>
                <TextField
                  label="Mode set name"
                  isRequired
                  value={draft.name}
                  onChange={(name) =>
                    setDraft((current) => ({ ...current, name }))
                  }
                  styles={nameFieldStyles}
                />
                <Picker
                  label="Mode set icon"
                  selectedKey={draft.iconId ?? "none"}
                  onSelectionChange={(key) =>
                    setDraft((current) => ({
                      ...current,
                      iconId: key as ModeIconId,
                    }))
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
                value={draft.description}
                onChange={(description) =>
                  setDraft((current) => ({ ...current, description }))
                }
              />
              <Picker
                label="Foundations"
                selectionMode="multiple"
                value={foundations}
                onChange={(keys) =>
                  setFoundations(keys.map((key) => String(key) as FoundationId))
                }
                renderValue={(selected) => (
                  <Text>{selected.map((item) => item.label).join(", ")}</Text>
                )}
                items={FOUNDATIONS}
              >
                {(item) => (
                  <PickerItem id={item.id} textValue={item.label}>
                    {item.label}
                  </PickerItem>
                )}
              </Picker>
              {AUTHORING_CAPABILITY_OPTIONS.some((option) =>
                foundations.includes(option.foundation),
              ) && (
                <div className={adaptiveSectionStyles}>
                  <h3 className={sectionTitleStyles}>Mode-specific editing</h3>
                  <Text slot="description">
                    Only selected controls can vary between modes. Other edits
                    apply to all modes.
                  </Text>
                  <ModeCapabilityChoices
                    draft={draft}
                    modeSets={modeSets}
                    foundations={foundations}
                    onChange={(capability, selected) => {
                      setDraft((current) => ({
                        ...current,
                        authoringCapabilities: selected
                          ? [
                              ...(current.authoringCapabilities ?? []),
                              capability,
                            ]
                          : (current.authoringCapabilities ?? []).filter(
                              (id) => id !== capability,
                            ),
                      }));
                      if (!selected)
                        setAdaptiveIds((current) =>
                          current.filter((id) => id !== capability),
                        );
                    }}
                  />
                </div>
              )}
              <div className={adaptiveSectionStyles}>
                <h3 className={sectionTitleStyles}>
                  User-adjustable parameters
                </h3>
                <Text slot="description">
                  Exposed in Adaptive controls for temporary previews, including
                  while editing.
                </Text>
                {parametersForFoundations(foundations).map((parameter) => {
                  const owner = parameterOwners[parameter.id];
                  const ownedElsewhere =
                    owner !== undefined && owner !== draft.id;
                  const ownerName = modeSets.find(
                    (modeSet) => modeSet.id === owner,
                  )?.name;
                  return (
                    <Checkbox
                      key={parameter.id}
                      isDisabled={ownedElsewhere}
                      isSelected={adaptiveIds.includes(parameter.id)}
                      onChange={(isSelected) => {
                        setAdaptiveIds((current) =>
                          isSelected
                            ? [...current, parameter.id]
                            : current.filter((id) => id !== parameter.id),
                        );
                        if (isSelected)
                          setDraft((current) => ({
                            ...current,
                            authoringCapabilities:
                              current.authoringCapabilities?.includes(
                                parameter.id as AuthoringCapability,
                              )
                                ? current.authoringCapabilities
                                : [
                                    ...(current.authoringCapabilities ?? []),
                                    parameter.id as AuthoringCapability,
                                  ],
                          }));
                      }}
                    >
                      {ownedElsewhere && ownerName
                        ? `${parameter.label} — managed by ${ownerName}`
                        : parameter.label}
                    </Checkbox>
                  );
                })}
              </div>
              <div className={sectionHeaderStyles}>
                <h3 className={sectionTitleStyles}>Modes</h3>
                <Picker
                  label="Default mode"
                  labelPosition="side"
                  selectedKey={draft.defaultModeId}
                  onSelectionChange={(key) =>
                    setDraft((current) => ({
                      ...current,
                      defaultModeId: String(key),
                    }))
                  }
                >
                  {draft.modes.map((mode) => (
                    <PickerItem key={mode.id} id={mode.id}>
                      {mode.name}
                    </PickerItem>
                  ))}
                </Picker>
                <ActionButton
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      modes: [...current.modes, createMode()],
                    }))
                  }
                >
                  <Add />
                  <Text>Add mode</Text>
                </ActionButton>
              </div>
              {draft.modes.map((mode) => {
                const selected = resolvePlatforms(platforms, mode.platformIds);
                const available = platforms.filter(
                  (platform) => !mode.platformIds.includes(platform.id),
                );
                return (
                  <div key={mode.id} className={modeRowStyles}>
                    <div className={modeFieldsStyles}>
                      <div className={modeIdentityStyles}>
                        <TextField
                          label="Name"
                          isRequired
                          value={mode.name}
                          onChange={(name) => updateMode(mode.id, { name })}
                        />
                        <TextArea
                          label="Description"
                          value={mode.description}
                          onChange={(description) =>
                            updateMode(mode.id, { description })
                          }
                        />
                      </div>
                      <Picker
                        label="Icon"
                        isDisabled={hasModeSetIcon}
                        description={
                          hasModeSetIcon ? "Using the mode set icon" : undefined
                        }
                        selectedKey={mode.iconId}
                        onSelectionChange={(key) =>
                          updateMode(mode.id, { iconId: key as ModeIconId })
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
                      <div className={platformFieldStyles}>
                        <TagGroup
                          label="Platform usage"
                          items={selected}
                          onRemove={(keys) =>
                            updateMode(mode.id, {
                              platformIds: mode.platformIds.filter(
                                (id) => !keys.has(id),
                              ),
                            })
                          }
                          renderEmptyState={() => <Text>No platforms yet</Text>}
                        >
                          {(platform) => (
                            <Tag id={platform.id}>{platform.name}</Tag>
                          )}
                        </TagGroup>
                        {available.length > 0 && (
                          <Picker
                            label="Add platform"
                            selectedKey={null}
                            onSelectionChange={(key) =>
                              updateMode(mode.id, {
                                platformIds: [...mode.platformIds, String(key)],
                              })
                            }
                          >
                            {available.map((platform) => (
                              <PickerItem key={platform.id} id={platform.id}>
                                {platform.name}
                              </PickerItem>
                            ))}
                          </Picker>
                        )}
                        <ModeOverridesTable
                          mode={mode}
                          foundations={foundations}
                          onClear={(parameterId) =>
                            clearOverride(mode.id, parameterId)
                          }
                        />
                      </div>
                    </div>
                    <ActionButton
                      isQuiet
                      aria-label={`Delete mode ${mode.name}`}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          modes: current.modes.filter(
                            (item) => item.id !== mode.id,
                          ),
                        }))
                      }
                    >
                      <Delete />
                    </ActionButton>
                  </div>
                );
              })}
            </div>
          </Content>
          <ButtonGroup>
            {onDelete && (
              <Button
                variant="negative"
                onPress={() => {
                  onDelete();
                  close();
                }}
              >
                Delete mode set
              </Button>
            )}
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onPress={() => {
                try {
                  const claims = Object.fromEntries(
                    adaptiveIds.map((id) => [id, draft.id]),
                  );
                  for (const foundation of memberships[draft.id] ?? []) {
                    if (!foundations.includes(foundation)) {
                      const issue = foundationRemovalIssue(
                        draft,
                        foundation,
                        claims,
                      );
                      if (issue) throw new Error(issue);
                    }
                  }
                  const allowed = AUTHORING_CAPABILITY_OPTIONS.filter(
                    (option) => foundations.includes(option.foundation),
                  ).map((option) => option.id);
                  const selectedAdaptiveIds = adaptiveIds.filter((id) =>
                    allowed.some((capability) => capability === id),
                  );
                  onSave(
                    {
                      ...draft,
                      authoringCapabilities:
                        draft.authoringCapabilities?.filter((id) =>
                          allowed.includes(id),
                        ),
                    },
                    { foundations, adaptiveIds: selectedAdaptiveIds },
                  );
                  if (!isStaged) {
                    commitClaims({
                      modeSetId: draft.id,
                      parameterIds: selectedAdaptiveIds,
                    });
                    setAttachments((current) => ({
                      ...current,
                      [draft.id]: foundations,
                    }));
                  }
                  close();
                } catch (failure) {
                  ToastQueue.negative(
                    failure instanceof Error
                      ? failure.message
                      : String(failure),
                  );
                }
              }}
            >
              Save
            </Button>
          </ButtonGroup>
        </>
      )}
    </Dialog>
  );
  if (!trigger) return dialog;
  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        if (!isOpen) return;
        const next = createDraft();
        setDraft(next);
        setAdaptiveIds(Object.keys(claimsForModeSet(adaptiveClaims, next.id)));
        const owned =
          initialFoundations ??
          memberships[next.id] ??
          capabilityFoundations(next.authoringCapabilities ?? []);
        setFoundations(owned.length > 0 ? owned : ["color"]);
      }}
    >
      {trigger}
      {dialog}
    </DialogTrigger>
  );
}
