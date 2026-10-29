// Copyright 2026 Adobe. All rights reserved.
import {
  FOUNDATIONS,
  type FoundationId,
} from "../../features/modes/parameters";
import { PLATFORM_DEFAULTS } from "../../features/platforms/state";

export function foundationLabel(id: FoundationId) {
  return FOUNDATIONS.find((foundation) => foundation.id === id)?.label ?? id;
}

export function platformName(id: string) {
  return PLATFORM_DEFAULTS.find((platform) => platform.id === id)?.name ?? id;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
