// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export const subPanelTabSelectionAtom = atom<Record<string, string>>({});

// Shared across Foundations and Tokens so the selected section stays in sync between views.
export const SECTIONS_SUBPANEL_TABS_STATE_KEY = "sections-subpanel-tabs";
