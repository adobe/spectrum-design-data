// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { SAMPLE_SYSTEM_INSIGHTS } from "./fixtures";

// Sample data until EPIC-11.3 derives insights from live system state.
export const systemInsightsAtom = atom(SAMPLE_SYSTEM_INSIGHTS);
