// Copyright 2026 Adobe. All rights reserved.
import {
  dataVisComparisonPage,
  dataVisMetricPoints,
  type DataVisMetric,
  type DataVisObservation,
  type DataVisReference,
} from "./analysis";
import { MeasurementCache } from "./measurements";
import type { VisionProfile } from "./model";
import type { RgbGamut } from "../colorMath";

export interface DataVisAnalysisInput {
  observations: DataVisObservation[];
  background: string;
  gamut: RgbGamut;
  metric: DataVisMetric;
  profile: VisionProfile;
  reference: DataVisReference;
  page: number;
  target?: number;
}
export function computeDataVisAnalysis(
  input: DataVisAnalysisInput,
  cache = new MeasurementCache(),
) {
  return {
    points: dataVisMetricPoints(
      input.observations,
      input.background,
      input.gamut,
      input.metric,
      cache,
    ),
    ...dataVisComparisonPage(
      input.observations,
      input.background,
      input.gamut,
      input.profile,
      input.reference,
      input.page,
      50,
      cache,
    ),
  };
}
export type DataVisAnalysisOutput = ReturnType<typeof computeDataVisAnalysis>;
