// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { FOUNDATION_IMPACT_SOURCES, TOKEN_IMPACT_SOURCES } from "./sources";
import { summarizeFoundationImpact, summarizeTokenImpact } from "./summaries";

// Sources read saved data across all modes, so previews and the selected mode never change impact.
export const tokenImpactSummaryAtom = atom((get) =>
  summarizeTokenImpact(
    TOKEN_IMPACT_SOURCES.flatMap((source) => get(source.recordsAtom)),
  ),
);

export const foundationImpactSummaryAtom = atom((get) =>
  summarizeFoundationImpact(
    FOUNDATION_IMPACT_SOURCES.flatMap((source) => get(source.recordsAtom)),
  ),
);
