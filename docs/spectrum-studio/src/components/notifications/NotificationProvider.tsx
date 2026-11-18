// Copyright 2026 Adobe. All rights reserved.
// The only module that may use ToastQueue, ToastContainer, the shared
// delete confirmation dialog, or the lifecycle dialog. See
// .agents/rules/notifications.mdc.
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
  type LifecycleChoice,
} from "../../features/notifications/center";
import { LifecycleDialog } from "./LifecycleDialog";
import { NotificationContext } from "./notificationContext";

const TOAST_TIMEOUT = 5000;

type OpenDialog =
  | ({ type: "confirm" } & DeleteDialog)
  | { type: "choose"; choice: LifecycleChoice };

export function NotificationProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [dialog, setDialog] = useState<OpenDialog>();
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
      confirm: (next) =>
        setDialog((current) => current ?? { type: "confirm", ...next }),
      choose: (choice) =>
        setDialog((current) => current ?? { type: "choose", choice }),
    }),
  );
  useEffect(() => center.start(), [center]);
  return (
    <NotificationContext.Provider value={center}>
      {children}
      <ToastContainer placement="bottom" />
      <DialogContainer onDismiss={() => setDialog(undefined)}>
        {dialog?.type === "choose" && (
          <LifecycleDialog choice={dialog.choice} />
        )}
        {dialog?.type === "confirm" && (
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
