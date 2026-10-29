// Copyright 2026 Adobe. All rights reserved.
import { createContext, useContext } from "react";

export interface DeletionToastContextValue {
  notifyDeleted: (label: string, onUndo: () => void) => void;
  suppressDeletionToasts: () => void;
}

export const DeletionToastContext =
  createContext<DeletionToastContextValue | null>(null);

export function useDeletionToast() {
  const context = useContext(DeletionToastContext);
  if (!context) {
    throw new Error(
      "useDeletionToast must be used within DeletionToastProvider.",
    );
  }
  return context;
}
