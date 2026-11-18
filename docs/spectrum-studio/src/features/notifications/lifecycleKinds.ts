// Copyright 2026 Adobe. All rights reserved.
// Which delete flow each notification kind follows.
// See .agents/rules/deletion-and-deprecation.mdc.
import type { NotificationKindId } from "./policy";

/**
 * - `lifecycle`: reaches design-data output. Deleting a shipped item opens
 *   the rename/deprecate dialog; `notify.remove` calls must pass `lifecycle`.
 * - `planned`: reaches output but is not migrated yet (phase 2).
 * - `exempt`: Studio-only or a small part; keeps the normal delete flow.
 */
export type LifecyclePolicy =
  | "lifecycle"
  | { planned: string }
  | { exempt: string };

const STUDIO_ONLY = { exempt: "Studio-only authoring data" };
const PART = { exempt: "Small part of an item; the item owns the lifecycle" };

export const LIFECYCLE_KINDS: Record<NotificationKindId, LifecyclePolicy> = {
  term: "lifecycle",
  taxonomyCategory: "lifecycle",
  colorScale: "lifecycle",
  alias: "lifecycle",
  token: {
    planned: "Studio has no token delete yet; tokens use the token dialog",
  },
  component: { planned: "Phase 2" },
  paletteColor: { planned: "Phase 2" },
  surface: { planned: "Phase 2" },
  contrast: { planned: "Phase 2" },
  dataVisScale: { planned: "Phase 2" },
  dimensionScale: { planned: "Phase 2" },
  opacityLevel: { planned: "Phase 2" },
  lineHeight: { planned: "Phase 2" },
  font: { planned: "Phase 2" },
  modeSet: { planned: "Phase 2" },
  colorRole: { planned: "Phase 2" },
  style: STUDIO_ONLY,
  structure: STUDIO_ONLY,
  formula: STUDIO_ONLY,
  rule: STUDIO_ONLY,
  interpolation: STUDIO_ONLY,
  styleProperty: PART,
  styleOption: PART,
  structureLayer: PART,
  structureElement: PART,
  structureProperty: PART,
  booleanBinding: PART,
  customContrastStep: PART,
  dataVisColorStop: PART,
  shadowLayer: PART,
};
