// Copyright 2026 Adobe. All rights reserved.
import type { ReactNode } from "react";
import { useIsReadOnly } from "./useIsReadOnly";

/** Unmounts authoring affordances outside edit mode so they cannot be triggered at all. */
export function EditOnly({ children }: { children: ReactNode }) {
  return useIsReadOnly() ? null : <>{children}</>;
}
