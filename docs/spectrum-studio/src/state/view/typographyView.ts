// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type TypographyPanelTab = "fonts" | "font-sizes" | "line-heights";
export const typographyPanelTabAtom = atom<TypographyPanelTab>("fonts");
