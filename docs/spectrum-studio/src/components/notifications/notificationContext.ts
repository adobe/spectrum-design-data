// Copyright 2026 Adobe. All rights reserved.
import { createContext, useContext } from "react";
import type { Notify } from "../../features/notifications/center";

export type {
  Notify,
  RemoveRequest,
} from "../../features/notifications/center";

export const NotificationContext = createContext<Notify | null>(null);

/** The only way UI code shows toasts or delete confirmations. */
export function useNotify() {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error("useNotify must be used within NotificationProvider.");
  return context;
}
