// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import type { TypographyDocument } from "./model";

export const TYPOGRAPHY_DEFAULTS: TypographyDocument = structuredClone(
  designSystemDefaults.system.foundations.typography,
);
