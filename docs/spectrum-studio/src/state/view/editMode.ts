// Copyright 2026 Adobe. All rights reserved.
import { persistedAtom } from "../persist";

/** Placeholder until edit sessions are backed by real branches. */
export const BRANCH_NAME = "TBD Branch Name";
export const VERSION = "1.0.0";

export const editModeAtom = persistedAtom<boolean>({
  key: "view/edit-mode",
  schemaVersion: 1,
  initialize: () => false,
  validate: (data): data is boolean => typeof data === "boolean",
});
