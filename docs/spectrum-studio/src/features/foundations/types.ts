// Copyright 2026 Adobe. All rights reserved.
/** Token types that the Foundations and Tokens pages are organized around. Only "color" has data today. */
export type FoundationTokenType =
  | "color"
  | "typography"
  | "spacing"
  | "size"
  | "radius"
  | "elevation"
  | "motion";

export interface FoundationDocument {
  schemaVersion: number;
}

export interface FoundationPublishingMetadata {
  hideFromPublishing?: boolean;
}

export function isFoundationPublished(
  foundation: FoundationPublishingMetadata,
): boolean {
  return foundation.hideFromPublishing !== true;
}

export function isFoundationPublishingMetadata(value: {
  hideFromPublishing?: unknown;
}): boolean {
  return (
    value.hideFromPublishing === undefined ||
    typeof value.hideFromPublishing === "boolean"
  );
}
