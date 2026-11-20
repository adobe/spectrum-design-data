// Copyright 2026 Adobe. All rights reserved.
import type { PracticeCopySummary } from "./comparison";

const REFRESH =
  "Run `pnpm data:snapshot` in docs/spectrum-studio to refresh it.";

/**
 * Plain-English freshness of Studio's practice copy of design-data. This is
 * information only: a stale copy never blocks or changes the comparison.
 */
export function practiceCopyMessage(
  summary: PracticeCopySummary | undefined,
  packaged = false,
): string | undefined {
  if (!summary) return undefined;
  const when = packaged ? "When this build was made, the" : "The";
  const commit = summary.recordedCommit
    ? ` (copied from commit ${summary.recordedCommit.slice(0, 7)})`
    : "";
  switch (summary.status) {
    case "current":
      return `${when} practice copy in data/design-data matches the design-data package${commit}.`;
    case "refresh-available":
      return `${when} practice copy in data/design-data is behind: ${summary.changedFiles} design-data ${summary.changedFiles === 1 ? "file has" : "files have"} changed since it was copied${commit}. ${REFRESH}`;
    case "missing":
      return `${when} practice copy in data/design-data was not found. ${REFRESH}`;
    case "unavailable":
      return `The practice copy's freshness could not be checked${summary.error ? `: ${summary.error}` : "."}`;
  }
}
