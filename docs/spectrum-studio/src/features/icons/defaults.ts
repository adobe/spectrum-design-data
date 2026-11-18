// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import type { IconsDocument } from "./model";

export const ICONS_DEFAULTS: IconsDocument = structuredClone(
  designSystemDefaults.system.foundations.icons,
);
