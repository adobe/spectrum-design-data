// Copyright 2026 Adobe. All rights reserved.
export function formatAnalyzeNumber(value: number) {
  return Number.isFinite(value)
    ? String(Math.round(value * 10000) / 10000)
    : "invalid";
}
