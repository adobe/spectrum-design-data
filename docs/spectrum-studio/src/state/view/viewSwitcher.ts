// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type ViewSwitcherView = "elements" | "preview" | "analyze" | "code";

// Shared across Foundations and Tokens so the selected view survives page switches; null defers to each switcher's default.
export const viewSwitcherSelectionAtom = atom<ViewSwitcherView | null>(null);
