// Copyright 2026 Adobe. All rights reserved.
import { persistedAtom } from "../../state/persist";
import { ICONS_DEFAULTS } from "./defaults";
import {
  ICONS_SCHEMA_VERSION,
  isIconsDocument,
  type IconsDocument,
} from "./model";

/** Stored Icons settings. Kept apart from `state.ts` so Typography can read it without an import cycle. */
export const iconsDocumentAtom = persistedAtom<IconsDocument>({
  key: "foundations/icons",
  schemaVersion: ICONS_SCHEMA_VERSION,
  initialize: () => ICONS_DEFAULTS,
  validate: isIconsDocument,
});
