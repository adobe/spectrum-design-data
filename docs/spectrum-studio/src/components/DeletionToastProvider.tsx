// Copyright 2026 Adobe. All rights reserved.
import { ToastContainer, ToastQueue } from "@react-spectrum/s2";
import { type ReactNode, useState } from "react";
import { DeletionToastContext } from "./deletionToastContext";

export function DeletionToastProvider({ children }: { children: ReactNode }) {
  const [isSuppressed, setSuppressed] = useState(false);

  function notifyDeleted(label: string, onUndo: () => void) {
    if (!isSuppressed) {
      ToastQueue.negative(`${label} was deleted`, {
        actionLabel: "Undo",
        onAction: onUndo,
        shouldCloseOnAction: true,
      });
    }
  }

  return (
    <DeletionToastContext.Provider
      value={{
        notifyDeleted,
        // The public S2 toast API has one action slot. This remains available for
        // future settings UI that can suppress deletion messages for this session.
        suppressDeletionToasts: () => setSuppressed(true),
      }}
    >
      {children}
      <ToastContainer placement="bottom" />
    </DeletionToastContext.Provider>
  );
}
