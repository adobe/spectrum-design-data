// Copyright 2026 Adobe. All rights reserved.
import { persistedAtom } from "../../state/persist";
import { designSystemDefaults } from "../../data/defaults";
import {
  isPlatformList,
  PLATFORMS_SCHEMA_VERSION,
  type Platform,
} from "./model";
export {
  isPlatformList,
  PLATFORMS_SCHEMA_VERSION,
  resolvePlatforms,
} from "./model";
export type { Platform } from "./model";

export const PLATFORM_DEFAULTS: readonly Platform[] = structuredClone(
  designSystemDefaults.system.platforms,
);

// Owned here so the Platforms page can become the editing surface without changing consumers.
export const platformsAtom = persistedAtom<Platform[]>({
  key: "platforms",
  schemaVersion: PLATFORMS_SCHEMA_VERSION,
  initialize: () => PLATFORM_DEFAULTS.map((platform) => ({ ...platform })),
  validate: isPlatformList,
});
