// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type { ScaleTypeKind } from "../../features/scales/scaleType";
import type { RULE_SECTIONS } from "../../features/logic/rulePresentation";

/** Scale type open in the focused editor on the Formulas page; null shows the library. */
export const editingScaleTypeIdAtom = atom<string | null>(null);

/** Sentinel for the focused editor when creating a scale type that is not in the library yet. */
export const NEW_SCALE_TYPE_ID = "__new__";

/** Formula type chosen from the Add formula menu, used when the focused editor opens a new formula. */
export const newScaleTypeKindAtom = atom<ScaleTypeKind>("geometric");

export type FormulasTab = "progressions" | "interpolations";
export type RulesTab = (typeof RULE_SECTIONS)[number]["type"];

export const formulasTabAtom = atom<FormulasTab>("progressions");
export const rulesTabAtom = atom<RulesTab>("rounding");
