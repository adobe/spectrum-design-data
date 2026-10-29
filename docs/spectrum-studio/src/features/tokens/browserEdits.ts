// Copyright 2026 Adobe. All rights reserved.
import { persistedAtom } from "../../state/persist";
import { isBrowserTokenEdits, type BrowserTokenEdits } from "./browserModel";

export const browserTokenEditsAtom = persistedAtom<BrowserTokenEdits>({
  key: "tokens/browser/edits",
  schemaVersion: 1,
  initialize: () => ({}),
  validate: isBrowserTokenEdits,
});
