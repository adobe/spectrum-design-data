// Copyright 2026 Adobe. All rights reserved.
import { persistedAtom } from "../../state/persist";
import {
  cloneModeSet,
  isModeSetList,
  migrateModeSets,
  MODE_SET_DEFAULTS,
  MODE_SETS_SCHEMA_VERSION,
  type ModeSet,
} from "./model";

export const modeSetsAtom = persistedAtom<ModeSet[]>({
  key: "modes/mode-sets",
  schemaVersion: MODE_SETS_SCHEMA_VERSION,
  initialize: () => MODE_SET_DEFAULTS.map(cloneModeSet),
  validate: isModeSetList,
  migrate: migrateModeSets,
});
