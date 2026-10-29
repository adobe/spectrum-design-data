// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type {
  TokenPanelId,
  TokenPanelViewMode,
} from "../../features/tokens/view/tokenPanelRegistry";

// Independent of the selected SubPanel tab; switching tabs preserves each mode.
export const tokenPanelViewSelectionAtom = atom<
  Partial<Record<TokenPanelId, TokenPanelViewMode>>
>({});
