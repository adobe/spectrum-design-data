// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type ViewSwitcherView =
  | "elements"
  | "apps"
  | "analyze"
  | "code"
  | "skills";

// Shared across Foundations and Tokens so the selected view survives page switches; null defers to each switcher's default.
export const viewSwitcherSelectionAtom = atom<ViewSwitcherView | null>(null);

/** Skills is only offered by pages that supply it; elsewhere the shared choice shows Elements. */
export function availableSwitcherView(
  view: ViewSwitcherView,
  hasSkills: boolean,
): ViewSwitcherView {
  return view === "skills" && !hasSkills ? "elements" : view;
}
