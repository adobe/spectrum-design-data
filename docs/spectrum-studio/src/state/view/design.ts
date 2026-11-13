// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type DesignSection = "concepts" | "elements" | "structures";
export type DesignView = "design" | "permutations" | "apps";
export const designSectionAtom = atom<DesignSection>("concepts");
export const designViewAtom = atom<DesignView>("design");
