// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import type { SpacingDocument } from "./model";

export const SPACING_DEFAULTS: SpacingDocument = structuredClone(
  designSystemDefaults.system.foundations.spacing,
);
