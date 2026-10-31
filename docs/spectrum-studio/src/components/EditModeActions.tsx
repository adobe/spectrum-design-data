// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "./notifications/notificationContext";
import {
  ActionButton,
  AlertDialog,
  Button,
  DialogTrigger,
  ProgressCircle,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import History from "@react-spectrum/s2/icons/History";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  cancelEditAtom,
  saveEditAtom,
  submitForReviewAtom,
} from "../features/edit-session/state";
import { asyncComparisonAtom } from "../features/changelog/asyncComparisonState";
import { changelogCollapsedAtom } from "../state/view/navigation";
import { persistenceIssuesAtom } from "../state/persist";
import MagicWand from "@react-spectrum/s2/icons/MagicWand";

const badgeAnchorStyles = style({
  position: "relative",
  display: "inline-flex",
});
// S2 Badge bottoms out at size S, and its control() sizing is not overridable, so the count is hand-built from tokens.
const notificationBadgeStyles = style({
  position: "absolute",
  top: 0,
  insetEnd: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  minWidth: 16,
  height: 16,
  paddingX: 4,
  borderRadius: "full",
  backgroundColor: "accent",
  font: "detail-sm",
  color: "white",
  pointerEvents: "none",
});

export function EditModeActions() {
  const notify = useNotify();
  const cancelEdit = useSetAtom(cancelEditAtom);
  const saveEdit = useSetAtom(saveEditAtom);
  const submitForReview = useSetAtom(submitForReviewAtom);
  const changes = useAtomValue(asyncComparisonAtom);
  const changeCount =
    changes.status === "ready" && changes.value.tokens.status === "ready"
      ? changes.value.groups.reduce((total, group) => total + group.count, 0)
      : null;
  const [isChangelogCollapsed, setChangelogCollapsed] = useAtom(
    changelogCollapsedAtom,
  );
  const persistenceIssues = useAtomValue(persistenceIssuesAtom);
  function perform(action: () => void) {
    try {
      action();
    } catch (failure) {
      notify.error(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  }

  return (
    <>
      <DialogTrigger>
        <Button variant="secondary">Cancel</Button>
        <AlertDialog
          variant="destructive"
          title="Discard all edits"
          primaryActionLabel="Discard"
          cancelLabel="Keep editing"
          onPrimaryAction={() => perform(() => notify.quietly(cancelEdit))}
        >
          Cancelling discards changes since your last save and restores the
          saved data.
        </AlertDialog>
      </DialogTrigger>
      {persistenceIssues.length > 0 && (
        <span role="alert">
          Storage needs attention. Check Registry for details.
        </span>
      )}
      <Button
        variant="primary"
        fillStyle="outline"
        onPress={() => submitForReview()}
      >
        <MagicWand />
        <Text>Create RFC</Text>
      </Button>
      <TooltipTrigger>
        <Button
          variant="accent"
          onPress={() =>
            perform(() => {
              const result = saveEdit();
              if (result.skippedAliases.length)
                notify.info(
                  `Saved. ${result.skippedAliases.length} previous step names now belong to other swatches, so compatibility aliases were not kept for those names.`,
                );
            })
          }
        >
          Save
        </Button>
        <Tooltip>
          Save your changes and the baseline that Cancel restores.
        </Tooltip>
      </TooltipTrigger>
      <span className={badgeAnchorStyles}>
        <TooltipTrigger>
          <ActionButton
            isQuiet
            aria-label={
              changeCount !== null && changeCount > 0
                ? `Change log, ${changeCount} changes`
                : "Change log"
            }
            onPress={() => setChangelogCollapsed(!isChangelogCollapsed)}
          >
            <History />
          </ActionButton>
          <Tooltip>
            {changes.status === "unavailable" ||
            (changes.status === "ready" &&
              changes.value.tokens.status === "unavailable")
              ? "Change counts are unavailable while token output is blocked. Open Changes to recover."
              : "Change log"}
          </Tooltip>
        </TooltipTrigger>
        {changeCount !== null && changeCount > 0 && (
          <span
            data-component="NotificationBadge"
            aria-hidden
            className={notificationBadgeStyles}
          >
            {changeCount > 999 ? "999+" : changeCount}
          </span>
        )}
        {changes.status === "pending" && (
          <span
            className={style({
              position: "absolute",
              top: 0,
              insetEnd: 0,
              pointerEvents: "none",
            })}
          >
            <ProgressCircle
              size="S"
              isIndeterminate
              aria-label="Calculating change counts"
            />
          </span>
        )}
      </span>
    </>
  );
}
