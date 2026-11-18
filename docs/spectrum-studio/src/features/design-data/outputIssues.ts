// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisInput } from "./comparison";

const issueIndexes = new WeakMap<object, Map<string, string[]>>();

/** Row-level output issues recorded against one record. */
export function recordOutputIssues(
  input: AnalysisInput,
  recordId: string,
): string[] {
  if (!input.outputIssues?.length) return [];
  let index = issueIndexes.get(input.outputIssues);
  if (!index) {
    index = new Map();
    for (const issue of input.outputIssues)
      for (const id of new Set(issue.recordIds ?? []))
        index.set(id, [...(index.get(id) ?? []), issue.message]);
    issueIndexes.set(input.outputIssues, index);
  }
  return [...(index.get(recordId) ?? [])];
}
