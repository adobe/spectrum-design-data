// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type { FoundationId } from "../../features/modes/parameters";

export const NEW_MODE_SET_ID = "__new_mode_set__";
export const editingModeSetIdAtom = atom<string | null>(null);
export const pendingModeSetFoundationAtom = atom<FoundationId | null>(null);
