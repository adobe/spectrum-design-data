// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  AlertDialog,
  Badge,
  Button,
  Card,
  DialogContainer,
  DialogTrigger,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "./CategoryIcon";
import Revert from "@react-spectrum/s2/icons/Revert";
import { atom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useState } from "react";
import { resetAllChangeDataAtom } from "../features/changelog/state";
import {
  asyncComparisonAtom,
  retryComparisonAtom,
} from "../features/changelog/asyncComparisonState";
import {
  staleTokenCountAtom,
  resetStaleTokenOverridesAtom,
} from "../features/tokens/state";
import type {
  ChangeField,
  ChangeGroup,
  ChangeItem,
} from "../features/changelog/changes";
import {
  applyChangeResetPlanAtom,
  generatedResetOptions,
  hasManualTokenEdits,
  itemResetAddresses,
  itemResetPlan,
  manualTokenResetPlan,
  resetSnapshotAtom,
  sourceForResetContext,
  sourceResetPlan,
  topicResetPlan,
  type ResetChoice,
} from "../features/changelog/resetPlans";
import {
  ChangeResetDialog,
  type ChangeResetDialogProps,
} from "../views/changelog/ChangeResetDialog";
import { ChangeFields } from "../views/changelog/ChangeFields";
import { changeBadgeLabel } from "../views/changelog/logPresentation";
import { ImpactOverview } from "../views/changelog/ImpactOverview";
import {
  persistenceIssuesAtom,
  PERSISTENCE_ISSUE_PREFIXES,
} from "../state/persist";
import { editModeAtom } from "../state/view/editMode";
import "./ChangelogPanel.css";
import { DerivedContentBoundary } from "./DerivedContentBoundary";
import { LoadingIndicator } from "./LoadingIndicator";
import SpeedFast from "@react-spectrum/s2/icons/SpeedFast";
import ChartPie from "@react-spectrum/s2/icons/ChartPie";
import ViewList from "@react-spectrum/s2/icons/ViewList";

const panelStyles = style({
  display: "flex",
  flexDirection: "column",
  width: "full",
  height: "full",
  boxSizing: "border-box",
  overflow: "hidden",
});
const headerStyles = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexShrink: 0,
  padding: 12,
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "gray-200",
});
const topicHeaderStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  paddingEnd: 12,
});
const topicTitleStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});
const cardsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
});
const cardHeaderStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "full",
  minWidth: 0,
});
const cardTitleStyles = style({
  flexGrow: 1,
  minWidth: 0,
  font: "title-sm",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
const footerStyles = style({ padding: 12 });
const tabsStyles = style({ flexGrow: 1, minHeight: 0 });
const tabPanelStyles = style({ flexGrow: 1, minHeight: 0 });

const BATCH_SIZE = 12;
const staleCountResultAtom = atom((get) => {
  try {
    return { count: get(staleTokenCountAtom) };
  } catch (error) {
    return {
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});
const inactiveStaleCountAtom = atom({
  count: 0,
  error: undefined as string | undefined,
});

export function ChangelogPanel({ isCollapsed }: { isCollapsed: boolean }) {
  return <ReadyChangelogPanel isCollapsed={isCollapsed} />;
}

function ReadyChangelogPanel({ isCollapsed }: { isCollapsed: boolean }) {
  const comparison = useAtomValue(asyncComparisonAtom);
  const value =
    comparison.status === "ready"
      ? comparison.value
      : comparison.status === "pending"
        ? comparison.partial
        : undefined;
  const groups = value?.groups ?? [];
  const tokenComparison =
    comparison.status === "ready"
      ? comparison.value.tokens
      : comparison.status === "unavailable"
        ? { status: "unavailable" as const, error: comparison.error }
        : { status: "pending" as const };
  const canEdit = useAtomValue(editModeAtom);
  const editing = canEdit && comparison.status === "ready";
  const [selectedTab, setSelectedTab] = useState("impact");
  const stale = useAtomValue(
    isCollapsed || selectedTab !== "log"
      ? inactiveStaleCountAtom
      : staleCountResultAtom,
  );
  const staleCount = stale.count;
  const store = useStore();
  const snapshot = () => store.get(resetSnapshotAtom);
  const retry = useSetAtom(retryComparisonAtom);
  const applyReset = useSetAtom(applyChangeResetPlanAtom);
  const resetAll = useSetAtom(resetAllChangeDataAtom);
  const discardStale = useSetAtom(resetStaleTokenOverridesAtom);
  const [visible, setVisible] = useState<Record<string, number>>({});
  const [expandedKeys, setExpandedKeys] = useState(
    new Set([
      "tokens",
      "foundations",
      "modes",
      "logic",
      "structures",
      "platforms",
      "registry",
      "components",
    ]),
  );
  const [resetDialog, setResetDialog] = useState<Omit<
    ChangeResetDialogProps,
    "onApply"
  > | null>(null);
  const hasChanges = groups.length > 0;
  const needsStorageReset = useAtomValue(persistenceIssuesAtom).some((issue) =>
    issue.startsWith(PERSISTENCE_ISSUE_PREFIXES.authoring),
  );
  const report = (action: () => void) => {
    try {
      action();
    } catch (failure) {
      ToastQueue.negative(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };
  const generatedChoices = (
    item: ChangeItem,
    field: ChangeField,
  ): ResetChoice[] => {
    try {
      const current = snapshot();
      const source = field.tokenValue
        ? sourceForResetContext(
            current,
            field.tokenValue.modeKey,
            field.tokenValue.tokenId,
          )
        : undefined;
      return generatedResetOptions(item, field, source, current);
    } catch (failure) {
      return generatedResetOptions(item, field, undefined, snapshot()).map(
        (choice) =>
          choice.id === "override"
            ? {
                ...choice,
                plan: undefined,
                disabledReason: `Value editing is unavailable: ${failure instanceof Error ? failure.message : String(failure)}`,
              }
            : choice,
      );
    }
  };
  const resetField = (item: ChangeItem, field: ChangeField) =>
    report(() => {
      if (field.address)
        applyReset(
          sourceResetPlan(`${item.title}: ${field.key}`, [field.address]),
        );
      else
        setResetDialog({
          title: `Reset ${field.key.toLowerCase()}?`,
          explanation: `This is automated output${field.context ? ` for ${field.context.label}` : ""}. Clearing a manual edit reveals current generation, not necessarily shipped output. Choose a supported shipped-value override or an actual changed source.`,
          choices: generatedChoices(item, field),
        });
    });
  const resetItem = (item: ChangeItem) =>
    report(() => {
      const addresses = itemResetAddresses(item);
      if (addresses.length)
        setResetDialog({
          title: `Reset ${item.title}?`,
          explanation:
            "Restore this card's registered authored changes to shipped values. Dependent outputs may change. Unrelated edits and manual overrides elsewhere are retained.",
          choices: [
            {
              id: "card",
              label: "Restore this card's authored changes",
              description:
                "Reset only the registered object or changed fields.",
              plan: itemResetPlan(item),
            },
            ...(item.upstream ?? []).map((upstream, index) => ({
              id: `source-${index}`,
              label: `Restore ${upstream.title}`,
              description:
                "Restore this changed upstream field; dependent outputs may change.",
              plan: sourceResetPlan(upstream.title, [upstream.address]),
            })),
          ],
        });
      else
        setResetDialog({
          title: `Reset ${item.title}?`,
          explanation:
            "This card is generated. Select a specific context override or a changed upstream source; restoring a source may affect other outputs.",
          choices: item.fields
            .filter((field) => field.generated)
            .flatMap((field, index) =>
              generatedChoices(item, field).map((choice) => ({
                ...choice,
                id: `${index}:${choice.id}`,
                label: `${field.key}${field.context ? ` — ${field.context.label}` : ""}: ${choice.label}`,
              })),
            ),
        });
    });
  const resetTopic = (group: ChangeGroup) =>
    report(() => {
      const current = snapshot();
      const choices: ResetChoice[] =
        group.id === "tokens"
          ? [
              {
                id: "manual",
                label: "Clear manual token edits",
                description:
                  "Clear browser metadata/value edits, legacy overrides and shared Static overrides. Dormant Static mode values and compatibility aliases are retained. Current generated differences remain.",
                ...(hasManualTokenEdits(current)
                  ? { plan: manualTokenResetPlan(current) }
                  : {
                      disabledReason:
                        "There are no active manual token edits to clear.",
                    }),
              },
              ...[
                ...new Map(
                  group.items
                    .flatMap((item) => item.upstream ?? [])
                    .map((source) => [
                      JSON.stringify(source.address.path),
                      source,
                    ]),
                ).values(),
              ].map((source, index) => ({
                id: `source-${index}`,
                label: `Restore ${source.title}`,
                description:
                  "Restore only this changed source. Its dependent outputs may change.",
                plan: sourceResetPlan(source.title, [source.address]),
              })),
            ]
          : [
              {
                id: "topic",
                label: `Restore registered ${group.label.toLowerCase()} changes`,
                description:
                  "Reset only the registered authored changes in this topic.",
                plan: topicResetPlan(group),
              },
            ];
      setResetDialog({
        title: `Reset ${group.label.toLowerCase()} changes?`,
        explanation:
          group.id === "tokens"
            ? "Clear manual edits or explicitly select a changed upstream source. No foundation document is reset automatically."
            : "Restore the registered changes in this topic to shipped values. This may affect downstream output; other topics' authored edits are retained.",
        choices,
      });
    });

  return (
    <aside
      data-component="ChangelogPanel"
      className={panelStyles}
      aria-label="Change log"
    >
      <div className={headerStyles}>
        {!isCollapsed && (
          <h4 className={style({ font: "heading-xs", marginBottom: 0 })}>
            Changes
          </h4>
        )}
        {!isCollapsed && (
          <DialogTrigger>
            <Button
              variant="negative"
              isDisabled={!hasChanges && !needsStorageReset}
            >
              Reset all
            </Button>
            <AlertDialog
              variant="destructive"
              title="Reset all changes?"
              primaryActionLabel="Reset all"
              onPrimaryAction={() => {
                try {
                  resetAll();
                } catch (failure) {
                  ToastQueue.negative(
                    failure instanceof Error
                      ? failure.message
                      : String(failure),
                  );
                }
              }}
            >
              Restore shipped defaults for all authored data and replace your
              saved baseline. This also replaces any invalid stored authoring
              data.
            </AlertDialog>
          </DialogTrigger>
        )}
      </div>
      {!isCollapsed && tokenComparison.status === "unavailable" && (
        <div role="alert" className="changesUnavailable">
          <p>
            Token output unavailable. Authored changes are retained below, but
            token change counts and impact cannot be fully assessed.
          </p>
          <p>{tokenComparison.error}</p>
        </div>
      )}
      {!isCollapsed && (
        <DerivedContentBoundary
          state={value ? "ready" : comparison.status}
          label="Calculating changes"
          error={
            comparison.status === "unavailable" ? comparison.error : undefined
          }
          onRetry={() => retry()}
        >
          <Tabs
            density="compact"
            aria-label="Changes views"
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(String(key))}
            styles={tabsStyles}
            UNSAFE_className="changesTabs"
          >
            <TabList UNSAFE_className="changesTabList">
              <Tab id="impact">
                <ChartPie />
                <Text>Impact</Text>
              </Tab>
              <Tab id="systemHealth">
                <SpeedFast />
                <Text>System health</Text>
              </Tab>
              <Tab id="log">
                <ViewList />
                <Text>Log</Text>
              </Tab>
            </TabList>
            <TabPanel
              id="impact"
              styles={tabPanelStyles}
              UNSAFE_className="changesOverviewPanel"
            >
              {!hasChanges && tokenComparison.status === "ready" && (
                <Text>No changes from the default data.</Text>
              )}
              {value ? (
                <ImpactOverview
                  value={value}
                  tokens={
                    comparison.status === "ready"
                      ? comparison.value.tokens
                      : undefined
                  }
                  componentImpact={
                    comparison.status === "ready"
                      ? comparison.value.componentImpact
                      : undefined
                  }
                />
              ) : (
                comparison.status === "pending" && (
                  <LoadingIndicator aria-label="Calculating authored changes" />
                )
              )}
            </TabPanel>
            <TabPanel
              id="systemHealth"
              styles={tabPanelStyles}
              UNSAFE_className="changesSystemHealthPanel"
            >
              <Text>System Health content goes here.</Text>
            </TabPanel>
            <TabPanel
              id="log"
              styles={tabPanelStyles}
              UNSAFE_className="changesLogPanel"
            >
              {hasChanges ? (
                <Accordion
                  allowsMultipleExpanded
                  expandedKeys={expandedKeys}
                  onExpandedChange={(keys) =>
                    setExpandedKeys(new Set(Array.from(keys, String)))
                  }
                >
                  {groups.map((group) => (
                    <AccordionItem id={group.id} key={group.id}>
                      <AccordionItemHeader UNSAFE_className="changelogTopicHeader">
                        <AccordionItemTitle>
                          <span className={topicTitleStyles}>
                            <CategoryIcon
                              category={group.id}
                              aria-hidden="true"
                            />
                            {group.label}
                          </span>
                        </AccordionItemTitle>
                        <span className={topicHeaderStyles}>
                          <Badge
                            size="S"
                            variant="informative"
                            fillStyle="subtle"
                            aria-label={`${group.count} changed fields`}
                          >
                            {group.count}
                          </Badge>
                          <span
                            title={
                              !editing
                                ? "Enter edit mode to reset changes."
                                : undefined
                            }
                          >
                            <ActionButton
                              isQuiet
                              isDisabled={
                                !editing ||
                                (group.id !== "tokens" &&
                                  !group.items.some(
                                    (item) => itemResetAddresses(item).length,
                                  ))
                              }
                              aria-label={`Reset ${group.label.toLowerCase()} changes`}
                              onPress={() => resetTopic(group)}
                            >
                              <Revert />
                            </ActionButton>
                          </span>
                        </span>
                      </AccordionItemHeader>
                      <AccordionItemPanel>
                        <div className={cardsStyles}>
                          {group.items
                            .slice(0, visible[group.id] ?? BATCH_SIZE)
                            .map((item) => (
                              <Card
                                key={item.id}
                                data-change-id={item.id}
                                size="S"
                                UNSAFE_style={{
                                  fontSize: "0.75em",
                                  width: "100%",
                                }}
                                variant="primary"
                                aria-label={`${item.title}, ${item.kind}`}
                              >
                                <div className={cardHeaderStyles}>
                                  <Badge
                                    size="S"
                                    variant="neutral"
                                    fillStyle="subtle"
                                    aria-label={`${item.sourceKind} change`}
                                  >
                                    <CategoryIcon
                                      category={`source.${item.sourceKind}`}
                                    />
                                  </Badge>
                                  <span
                                    className={cardTitleStyles}
                                    title={item.title}
                                  >
                                    {item.title}
                                  </span>
                                  <Badge
                                    size="S"
                                    variant={
                                      item.kind === "new"
                                        ? "positive"
                                        : item.kind === "removed"
                                          ? "negative"
                                          : "notice"
                                    }
                                    fillStyle={
                                      item.kind === "removed"
                                        ? "bold"
                                        : "subtle"
                                    }
                                  >
                                    {changeBadgeLabel(item.kind)}
                                  </Badge>
                                  <span
                                    title={
                                      !editing
                                        ? "Enter edit mode to reset changes."
                                        : !itemResetAddresses(item).length &&
                                            !item.fields.some(
                                              (field) => field.generated,
                                            )
                                          ? "No registered reset is available. Edit its source."
                                          : undefined
                                    }
                                  >
                                    <ActionButton
                                      isQuiet
                                      isDisabled={
                                        !editing ||
                                        (!itemResetAddresses(item).length &&
                                          !item.fields.some(
                                            (field) => field.generated,
                                          ))
                                      }
                                      aria-label={`Reset ${item.title}`}
                                      onPress={() => resetItem(item)}
                                    >
                                      <Revert />
                                    </ActionButton>
                                  </span>
                                </div>
                                <ChangeFields
                                  item={item}
                                  editing={editing}
                                  onReset={(field) => resetField(item, field)}
                                />
                              </Card>
                            ))}
                          {group.items.length >
                            (visible[group.id] ?? BATCH_SIZE) && (
                            <Button
                              variant="secondary"
                              onPress={() =>
                                setVisible((current) => ({
                                  ...current,
                                  [group.id]:
                                    (current[group.id] ?? BATCH_SIZE) +
                                    BATCH_SIZE,
                                }))
                              }
                            >
                              <Text>Show more {group.label.toLowerCase()}</Text>
                            </Button>
                          )}
                        </div>
                      </AccordionItemPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className={footerStyles}>
                  {tokenComparison.status === "pending" ? (
                    <LoadingIndicator aria-label="Calculating change log" />
                  ) : tokenComparison.status === "unavailable" ? (
                    "No authored source changes. Generated token differences remain unavailable."
                  ) : (
                    "No changes from the default data."
                  )}
                </div>
              )}
              {staleCount > 0 && (
                <div className={footerStyles}>
                  <ActionButton
                    isDisabled={!editing}
                    onPress={() => report(() => discardStale())}
                  >
                    <Revert />
                    <Text>Discard stale overrides ({staleCount})</Text>
                  </ActionButton>
                </div>
              )}
              {stale.error && (
                <div role="status" className={footerStyles}>
                  Stale override assessment unavailable: {stale.error}
                </div>
              )}
              <DialogContainer onDismiss={() => setResetDialog(null)}>
                {resetDialog && (
                  <ChangeResetDialog
                    {...resetDialog}
                    onApply={(plan) => {
                      if (store.get(asyncComparisonAtom).status !== "ready")
                        throw new Error(
                          "These Changes are not current. Reopen the reset dialog when the current results are available.",
                        );
                      applyReset(plan);
                    }}
                  />
                )}
              </DialogContainer>
            </TabPanel>
          </Tabs>
        </DerivedContentBoundary>
      )}
    </aside>
  );
}
