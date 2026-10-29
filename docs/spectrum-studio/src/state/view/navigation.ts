// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export const activePageAtom = atom("home");
export const sidebarCollapsedAtom = atom(false);
export const changelogCollapsedAtom = atom(false);

export const SUB_PANEL_DEFAULT_WIDTH = 360;
/** Minimum width for the sub panel and for the main content beside it. */
export const SUB_PANEL_MIN_WIDTH = 300;
export const subPanelWidthAtom = atom(SUB_PANEL_DEFAULT_WIDTH);
