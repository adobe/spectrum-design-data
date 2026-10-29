// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type AppColorScheme = "light" | "dark";
export const appColorSchemeAtom = atom<AppColorScheme>("light");
