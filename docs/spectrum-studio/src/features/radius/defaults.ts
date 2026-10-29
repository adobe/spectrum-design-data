// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import type { RadiusDocument } from "./model";

export const RADIUS_DEFAULTS: RadiusDocument = structuredClone(
  designSystemDefaults.system.foundations.radius,
);
