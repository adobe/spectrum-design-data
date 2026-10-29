// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { modeSetsAtom } from "./state";
import { modeSelectionAtom, resolveActiveMode } from "./selection";
import { COLOR_SCHEME_MODE_SET_KEY } from "./model";
import { capabilityOwners } from "./parameters";

export const authoringCapabilityOwnersAtom = atom((get) =>
  capabilityOwners(get(modeSetsAtom)),
);

/**
 * These design-system mode sets also select the sample application's appearance.
 * The authoring application's appearance is a separate interface preference.
 */
export const PREVIEW_CAPABILITY_MODE_SET_KEYS = [
  COLOR_SCHEME_MODE_SET_KEY,
] as const;

export {
  appColorSchemeAtom,
  type AppColorScheme,
} from "../../state/view/appAppearance";
import type { AppColorScheme } from "../../state/view/appAppearance";

export const previewColorSchemeAtom = atom<AppColorScheme>((get) => {
  const modeSet = get(modeSetsAtom).find(
    (item) => item.key === COLOR_SCHEME_MODE_SET_KEY,
  );
  if (!modeSet) return "light";
  const mode = resolveActiveMode(modeSet, get(modeSelectionAtom));
  return mode?.key === "dark" ? "dark" : "light";
});
