// Copyright 2026 Adobe. All rights reserved.
import { lazy, Suspense } from "react";
import { ProgressCircle } from "@react-spectrum/s2";

const AnalysisView = lazy(() => import("../views/analysis/AnalysisView"));

export default function Analysis() {
  return (
    <div className="pageMainContent">
      <Suspense
        fallback={
          <ProgressCircle aria-label="Loading Analysis" isIndeterminate />
        }
      >
        <AnalysisView />
      </Suspense>
    </div>
  );
}
