// Copyright 2026 Adobe. All rights reserved.
import {
  buildDimensionArtifacts,
  captureDimensionSource,
  dimensionSourceHash,
  type DimensionAuthoringSource,
  type DimensionArtifactBundle,
} from "./dimensionArtifacts";

export interface DimensionWorkRequest {
  working: DimensionAuthoringSource;
  saved: DimensionAuthoringSource;
}
export interface DimensionWorkOutput {
  bundle: DimensionArtifactBundle;
  savedSourceHash?: string;
  issues: string[];
}
export async function computeDimensionWork({
  working,
  saved,
}: DimensionWorkRequest): Promise<DimensionWorkOutput> {
  const bundle = await buildDimensionArtifacts(captureDimensionSource(working));
  try {
    const savedSourceHash =
      working === saved
        ? bundle.sourceHash
        : await dimensionSourceHash(captureDimensionSource(saved));
    return { bundle, savedSourceHash, issues: [] };
  } catch (failure) {
    return {
      bundle,
      issues: [
        `Saved artifact baseline unavailable: ${failure instanceof Error ? failure.message : String(failure)}`,
      ],
    };
  }
}
