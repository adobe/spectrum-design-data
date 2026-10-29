// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import type { SizeDocument } from "./model";

export const SIZE_DEFAULTS: SizeDocument = structuredClone(
  designSystemDefaults.system.foundations.size,
);
