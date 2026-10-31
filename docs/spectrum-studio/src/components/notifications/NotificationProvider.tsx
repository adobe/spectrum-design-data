// Copyright 2026 Adobe. All rights reserved.
// The only module that may use ToastQueue, ToastContainer, or the shared
// delete confirmation dialog. See .agents/rules/notifications.mdc.
import {
  AlertDialog,
  DialogContainer,
  ToastContainer,
  ToastQueue,
} from "@react-spectrum/s2";
import { useStore } from "jotai";
import { type ReactNode, useEffect, useState } from "react";
import {
  createNotificationCenter,
  type DeleteDialog,
} from "../../features/notifications/center";
import { NotificationContext } from "./notificationContext";

const TOAST_TIMEOUT = 5000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [dialog, setDialog] = useState<DeleteDialog>();
  const [center] = useState(() =>
    createNotificationCenter({
      store,
      show: (notice, onClose) =>
        ToastQueue[notice.variant](notice.message, {
          onClose,
          ...(notice.undo
            ? {
                actionLabel: "Undo",
                onAction: notice.undo,
                shouldCloseOnAction: true,
              }
            : { timeout: TOAST_TIMEOUT }),
        }),
      // Spectrum: never stack alert dialogs; keep the first one open.
      confirm: (next) => setDialog((current) => current ?? next),
    }),
  );
  useEffect(() => center.start(), [center]);
  return (
    <NotificationContext.Provider value={center}>
      {children}
      <ToastContainer placement="bottom" />
      <DialogContainer onDismiss={() => setDialog(undefined)}>
        {dialog && (
          <AlertDialog
            title={dialog.title}
            variant="destructive"
            primaryActionLabel="Delete"
            cancelLabel="Cancel"
            onPrimaryAction={() => {
              setDialog(undefined);
              dialog.onConfirm();
            }}
          >
            {dialog.description}
          </AlertDialog>
        )}
      </DialogContainer>
    </NotificationContext.Provider>
  );
}
