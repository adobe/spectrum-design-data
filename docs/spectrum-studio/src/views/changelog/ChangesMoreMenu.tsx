// Copyright 2026 Adobe. All rights reserved.
// "More" menu in the Changes panel header. Holds "Remove all deprecations",
// a destructive bulk delete of deprecated working data.
// See docs/rfcs/deletion-and-deprecation.md.
import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  ActionButton,
  AlertDialog,
  DialogContainer,
  Menu,
  MenuItem,
  MenuTrigger,
} from "@react-spectrum/s2";
import More from "@react-spectrum/s2/icons/More";
import { useNotify } from "../../components/notifications/notificationContext";
import {
  deprecatedItemsAtom,
  deprecationRemovalPreviewAtom,
  previewSummary,
  removalSummary,
  removeDeprecationsAtom,
  type DeprecationRemovalResult,
} from "../../features/changelog/removeDeprecations";
import { restoreAuthoringSnapshotAtom } from "../../features/edit-session/state";

/** Rendered only while the confirmation is open, because the preview is costly. */
function RemovalPreview({ count }: { count: number }) {
  const preview = useAtomValue(deprecationRemovalPreviewAtom);
  return (
    <>
      This {previewSummary(preview)} in your working data
      {preview.deleted === count ? "" : ` (${count} deprecated in total)`}.
      Anything that still uses a removed item is moved to its replacement, or
      gets the item's current value written in its place. Removing deprecations
      is a breaking change for anyone who uses the published data, and once
      published it can't easily be undone.
    </>
  );
}

export function ChangesMoreMenu({ isDisabled }: { isDisabled?: boolean }) {
  const notify = useNotify();
  const count = useAtomValue(deprecatedItemsAtom).length;
  const removeDeprecations = useSetAtom(removeDeprecationsAtom);
  const restore = useSetAtom(restoreAuthoringSnapshotAtom);
  const [confirming, setConfirming] = useState(false);
  const [kept, setKept] = useState<DeprecationRemovalResult["kept"]>();
  const remove = () => {
    try {
      const result = notify.quietly(removeDeprecations);
      notify.info(
        removalSummary(result),
        result.removed.length
          ? () => notify.quietly(() => restore(result.undo))
          : undefined,
      );
      if (result.kept.length) setKept(result.kept);
    } catch (failure) {
      notify.error(failure);
    }
  };
  return (
    <>
      <MenuTrigger>
        <ActionButton
          isQuiet
          aria-label="More change actions"
          isDisabled={isDisabled}
        >
          <More />
        </ActionButton>
        <Menu
          aria-label="More change actions"
          disabledKeys={count ? [] : ["remove-deprecations"]}
          onAction={(key) => {
            if (key === "remove-deprecations") setConfirming(true);
          }}
        >
          <MenuItem id="remove-deprecations">Remove all deprecations</MenuItem>
        </Menu>
      </MenuTrigger>
      {/* Separate containers, so closing the confirmation can't clear the result. */}
      <DialogContainer onDismiss={() => setConfirming(false)}>
        {confirming && (
          <AlertDialog
            variant="destructive"
            title="Remove all deprecations"
            primaryActionLabel="Remove"
            cancelLabel="Cancel"
            onPrimaryAction={remove}
          >
            <RemovalPreview count={count} />
          </AlertDialog>
        )}
      </DialogContainer>
      <DialogContainer onDismiss={() => setKept(undefined)}>
        {kept && (
          <AlertDialog
            variant="information"
            title="Some deprecations were kept"
            primaryActionLabel="Close"
          >
            <ul>
              {kept.map((item) => (
                <li key={`${item.kind}:${item.id}`}>
                  <strong>{item.label}</strong>: {item.reason}
                </li>
              ))}
            </ul>
          </AlertDialog>
        )}
      </DialogContainer>
    </>
  );
}
