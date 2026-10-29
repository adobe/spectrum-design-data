// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  ActionButtonGroup,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Heading,
  IllustratedMessage,
  Image,
  ListView,
  ListViewItem,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Text,
  ToastQueue,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Close from "@react-spectrum/s2/icons/Close";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useState, type ReactNode } from "react";
import { editModeAtom } from "../../state/view/editMode";
import {
  cloneModeSet,
  createModeSet,
  type ModeSet,
} from "../../features/modes/model";
import { modeSetsAtom } from "../../features/modes/state";
import {
  applyFoundationModeSetAtom,
  detachFoundationModeSetAtom,
  modeSetFoundationsAtom,
} from "../../features/modes/foundationAttachments";
import {
  CUSTOM_MODE_KEY,
  displayedModeIdsAtom,
  resetModeAtom,
} from "../../features/modes/preview";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  FOUNDATIONS,
  type FoundationId,
} from "../../features/modes/parameters";
import modeSetsEmptyIllustration from "../../assets/illustrations/mode-sets-empty.svg";
import { ModeSetEditorDialog } from "../../components/ModeSetEditorDialog";
import { ModeCapabilityChoices } from "../../components/ModeCapabilityChoices";
import { FoundationModePopover } from "./FoundationModePopover";
import { ColorSystemSettings } from "./ColorSystemSettings";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  margin: 0,
  padding: 0,
});
const card = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
  borderRadius: "lg",
  backgroundColor: "layer-1",
  minWidth: 0,
});
const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});
const title = style({ font: "title-sm", margin: 0 });
const emptyImageStyles = style({
  gridArea: "illustration",
  width: 96,
  height: 96,
  backgroundColor: "transparent",
});
const panelStyles = { padding: "0", margin: "0" };

export function FoundationModeSettings({
  foundation,
  before,
  after,
  unclaimedControl,
  defaultExpandedKeys = [],
  expandedKeys,
  onExpandedChange,
}: {
  foundation: FoundationId;
  before?: ReactNode;
  after?: ReactNode;
  unclaimedControl?: ReactNode;
  defaultExpandedKeys?: string[];
  expandedKeys?: Set<string>;
  onExpandedChange?: (keys: Set<string>) => void;
}) {
  const editing = useAtomValue(editModeAtom);
  const sets = useAtomValue(modeSetsAtom);
  const foundations = useAtomValue(modeSetFoundationsAtom);
  const displayed = useAtomValue(displayedModeIdsAtom);
  const apply = useSetAtom(applyFoundationModeSetAtom);
  const detach = useSetAtom(detachFoundationModeSetAtom);
  const reset = useSetAtom(resetModeAtom);
  const [expanded, setExpanded] = useState(
    new Set<string>(defaultExpandedKeys),
  );
  const [newModeSet, setNewModeSet] = useState<ModeSet | null>(null);
  const [setup, setSetup] = useState<{
    modeSet: ModeSet;
    isNew: boolean;
    foundations?: FoundationId[];
    adaptiveIds?: string[];
  } | null>(null);
  const attached = sets.filter((set) =>
    foundations[set.id]?.includes(foundation),
  );
  const unattached = sets.filter(
    (set) => !foundations[set.id]?.includes(foundation),
  );
  const category = FOUNDATIONS.find((item) => item.id === foundation);
  if (!category) throw new Error(`Unknown foundation "${foundation}".`);
  const report = (failure: unknown) =>
    ToastQueue.negative(
      failure instanceof Error ? failure.message : String(failure),
    );
  return (
    <Accordion
      size="M"
      density="spacious"
      allowsMultipleExpanded
      expandedKeys={expandedKeys ?? expanded}
      onExpandedChange={(keys) => {
        const next = new Set(Array.from(keys, String));
        if (onExpandedChange) onExpandedChange(next);
        else setExpanded(next);
      }}
    >
      {before}
      {foundation === "color" && (
        <AccordionItem id="system-settings">
          <AccordionItemTitle>System settings</AccordionItemTitle>
          <AccordionItemPanel UNSAFE_style={panelStyles}>
            <ColorSystemSettings />
          </AccordionItemPanel>
        </AccordionItem>
      )}
      <AccordionItem id="mode-sets">
        <AccordionItemHeader>
          <AccordionItemTitle>Mode sets</AccordionItemTitle>
          {editing && (
            <MenuTrigger>
              <ActionButton
                size="M"
                isQuiet
                aria-label={`Add mode set to ${foundation}`}
              >
                <Add />
              </ActionButton>
              <Menu
                aria-label={`Add mode set to ${foundation}`}
                onAction={(id) => {
                  if (id === "create-new-mode-set") {
                    setNewModeSet(createModeSet());
                    return;
                  }
                  try {
                    const modeSet = sets.find((item) => item.id === id);
                    if (!modeSet)
                      throw new Error("This mode set is no longer available.");
                    setSetup({ modeSet: cloneModeSet(modeSet), isNew: false });
                  } catch (failure) {
                    report(failure);
                  }
                }}
              >
                {unattached.length > 0 && (
                  <MenuSection aria-label="Available mode sets">
                    {unattached.map((set) => (
                      <MenuItem id={set.id} key={set.id}>
                        {set.name}
                      </MenuItem>
                    ))}
                  </MenuSection>
                )}
                <MenuItem id="create-new-mode-set">
                  Create new mode set
                </MenuItem>
              </Menu>
            </MenuTrigger>
          )}
        </AccordionItemHeader>
        <AccordionItemPanel UNSAFE_style={panelStyles}>
          <div className={stack}>
            {unclaimedControl}
            {attached.length > 0 &&
              !AUTHORING_CAPABILITY_OPTIONS.some(
                (option) => option.foundation === foundation,
              ) && (
                <Text slot="description">
                  This foundation has no mode-specific variables yet. Shared
                  mode selection is available.
                </Text>
              )}
            {attached.length === 0 && (
              <IllustratedMessage
                size="S"
                orientation="vertical"
                data-component="FoundationModeEmptyState"
              >
                <Image
                  src={modeSetsEmptyIllustration}
                  alt=""
                  width={96}
                  height={96}
                  styles={emptyImageStyles}
                />
                <Content>
                  {category.label} has no mode sets.{" "}
                  {editing
                    ? "Add one to create options."
                    : "Select Edit to add one."}
                </Content>
              </IllustratedMessage>
            )}
            {attached.map((set) => {
              const selectedId = displayed[set.key];
              return (
                <section
                  key={set.id}
                  className={card}
                  aria-label={`${set.name} mode set`}
                  data-component="FoundationModeSetCard"
                >
                  <div className={header}>
                    <h3 className={title}>{set.name}</h3>
                    {editing && (
                      <TooltipTrigger>
                        {" "}
                        <ActionButton
                          size="S"
                          isQuiet
                          aria-label={`Remove ${set.name} from ${foundation}`}
                          onPress={() => {
                            try {
                              detach({ modeSetId: set.id, foundation });
                            } catch (failure) {
                              report(failure);
                            }
                          }}
                        >
                          <Close />
                        </ActionButton>
                        <Tooltip>
                          Remove {set.name} from {foundation}
                        </Tooltip>
                      </TooltipTrigger>
                    )}
                  </div>
                  {selectedId === CUSTOM_MODE_KEY && (
                    <Text slot="description">Custom preview</Text>
                  )}
                  <ListView
                    aria-label={`${set.name} modes for ${foundation}`}
                    selectionMode="single"
                    selectionStyle="highlight"
                    selectedKeys={
                      selectedId && selectedId !== CUSTOM_MODE_KEY
                        ? [selectedId]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const id =
                        keys === "all" ? undefined : keys.values().next().value;
                      if (id !== undefined)
                        reset({ modeSetKey: set.key, modeId: String(id) });
                    }}
                    UNSAFE_style={{ height: "auto", maxHeight: "fit-content" }}
                  >
                    {set.modes.map((mode) => (
                      <ListViewItem
                        id={mode.id}
                        key={mode.id}
                        textValue={mode.name}
                      >
                        <Text>{mode.name}</Text>
                        {editing &&
                          AUTHORING_CAPABILITY_OPTIONS.some(
                            (option) =>
                              option.foundation === foundation &&
                              set.authoringCapabilities?.includes(option.id),
                          ) && (
                            <ActionButtonGroup>
                              <FoundationModePopover
                                foundation={foundation}
                                modeSet={set}
                                mode={mode}
                              />
                            </ActionButtonGroup>
                          )}
                      </ListViewItem>
                    ))}
                  </ListView>
                </section>
              );
            })}
          </div>
        </AccordionItemPanel>
      </AccordionItem>
      {after}
      <DialogContainer onDismiss={() => setNewModeSet(null)}>
        {editing && newModeSet && (
          <ModeSetEditorDialog
            key={newModeSet.id}
            title="New mode set"
            initialFoundations={[foundation]}
            isStaged
            createDraft={() => newModeSet}
            onSave={(modeSet, settings) => {
              setSetup({ modeSet, isNew: true, ...settings });
              setNewModeSet(null);
            }}
          />
        )}
      </DialogContainer>
      <DialogContainer onDismiss={() => setSetup(null)}>
        {editing && setup && (
          <Dialog size="S">
            {({ close }) => (
              <>
                <Heading slot="title">Select mode-specific variables</Heading>
                <Content>
                  <div className={stack}>
                    <Text>
                      {AUTHORING_CAPABILITY_OPTIONS.some(
                        (option) => option.foundation === foundation,
                      )
                        ? "Select the variables this mode set can edit. If none are selected, you can still switch modes."
                        : "This foundation has no mode-specific variables yet. You can still use this mode set to switch modes."}
                    </Text>
                    <ModeCapabilityChoices
                      draft={setup.modeSet}
                      modeSets={sets}
                      foundations={[foundation]}
                      onChange={(id, selected) =>
                        setSetup(
                          (current) =>
                            current && {
                              ...current,
                              modeSet: {
                                ...current.modeSet,
                                authoringCapabilities: selected
                                  ? [
                                      ...new Set([
                                        ...(current.modeSet
                                          .authoringCapabilities ?? []),
                                        id,
                                      ]),
                                    ]
                                  : current.modeSet.authoringCapabilities?.filter(
                                      (item) => item !== id,
                                    ),
                              },
                            },
                        )
                      }
                    />
                  </div>
                </Content>
                <ButtonGroup>
                  <Button variant="secondary" onPress={close}>
                    Cancel
                  </Button>
                  <Button
                    variant="accent"
                    onPress={() => {
                      try {
                        apply({ ...setup, foundation });
                        setExpanded(
                          (current) => new Set([...current, "mode-sets"]),
                        );
                        close();
                      } catch (failure) {
                        report(failure);
                      }
                    }}
                  >
                    Apply
                  </Button>
                </ButtonGroup>
              </>
            )}
          </Dialog>
        )}
      </DialogContainer>
    </Accordion>
  );
}
