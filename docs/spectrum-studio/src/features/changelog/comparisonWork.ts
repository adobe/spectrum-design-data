// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import type { FoundationModeAttachments } from "../../state/view/foundationModeAttachments";
import type { AuthoringComparison } from "./registry";
import type { TokenComparison } from "./tokenComparison";
import type { ChangeGroup } from "./changes";
import type { ComponentImpactResult } from "../impact/componentImpact";

export interface ComparisonRequest {
  working: EditSessionSnapshot;
  shipped: EditSessionSnapshot;
  attachments: FoundationModeAttachments;
}
export interface ComparisonProgress {
  working: EditSessionSnapshot;
  authored: AuthoringComparison;
  groups: ChangeGroup[];
}
export type ComparisonOutput = ComparisonProgress & {
  tokens:
    | { status: "ready"; comparison: TokenComparison }
    | { status: "unavailable"; error: string };
  componentImpact: ComponentImpactResult;
};
