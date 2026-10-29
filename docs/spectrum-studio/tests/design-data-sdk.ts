// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import {
  referenceRoot,
  resolutionConformance,
} from "../scripts/design-data-loader";

const root = resolve(process.env.DESIGN_DATA_PATH ?? referenceRoot());
const sdk =
  process.env.DESIGN_DATA_SDK ?? join(root, "sdk/target/debug/design-data");
const report = await resolutionConformance(root, sdk);
console.log(JSON.stringify(report, null, 2));
assert.equal(report.error, undefined, "Resolution fixtures must be available.");
assert.ok(report.checks.length, "Resolution fixtures must not be empty.");
assert.ok(
  report.checks.every((check) => check.status === "passed"),
  "Full SDK resolution conformance is not established; see failed/unsupported fixture diagnostics. Resolved-value comparison remains disabled.",
);
