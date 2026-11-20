// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisSource } from "../../features/design-data/comparison";
import { practiceCopyMessage } from "../../features/design-data/practiceCopy";

/** Information-only note on whether the practice copy of design-data is current. */
export function PracticeCopyNote({ source }: { source: AnalysisSource }) {
  const message = practiceCopyMessage(
    source.practiceCopy,
    source.referenceOrigin === "packaged",
  );
  if (!message) return null;
  return (
    <p
      className="analysisProvenance"
      data-testid="practice-copy-status"
      data-status={source.practiceCopy?.status}
    >
      {message}
    </p>
  );
}
