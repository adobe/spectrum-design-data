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
export interface ComparisonProgressMessage {
  authored: AuthoringComparison;
  groups: ChangeGroup[];
  aliases: EditSessionSnapshot["aliases"];
}
export function comparisonProgressMessage(
  progress: ComparisonProgress,
): ComparisonProgressMessage {
  return {
    authored: progress.authored,
    groups: progress.groups,
    aliases: progress.working.aliases,
  };
}
export function restoreComparisonProgress(
  input: ComparisonRequest,
  progress: ComparisonProgressMessage,
): ComparisonProgress {
  return {
    working:
      progress.aliases === input.working.aliases
        ? input.working
        : { ...input.working, aliases: progress.aliases },
    authored: progress.authored,
    groups: progress.groups,
  };
}
export type ComparisonOutput = ComparisonProgress & {
  tokens:
    | { status: "ready"; comparison: TokenComparison }
    | { status: "unavailable"; error: string };
  componentImpact: ComponentImpactResult;
};
