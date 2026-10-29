// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type DesignSection = "concepts" | "elements" | "structures";
export type DesignView = "design" | "permutations" | "preview";
export const designSectionAtom = atom<DesignSection>("structures");
export const designViewAtom = atom<DesignView>("design");
