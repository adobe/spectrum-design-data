// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  loadReferenceInput,
  referenceRoot,
} from "../scripts/design-data-loader";
import { resolveColorOpacityValues } from "../scripts/color-opacity-resolution";
import { attachReferenceAssessment } from "../scripts/design-data-assessment";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { projectSnapshot } from "../src/features/design-data/authoringProjection";
import {
  canonicalJson,
  compareDesignData,
} from "../src/features/design-data/comparison";
import { createValueResolutionService } from "../src/features/design-data/wasmResolution";

const stages: { stage: string; milliseconds: number }[] = [];
async function measure<T>(stage: string, operation: () => T | Promise<T>) {
  const start = performance.now();
  const value = await operation();
  const timing = { stage, milliseconds: Math.round(performance.now() - start) };
  stages.push(timing);
  console.log(JSON.stringify(timing));
  return value;
}

if (process.argv.includes("--wasm")) {
  const { ValueResolver } = await import("@adobe/design-data-wasm");
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(
    new URL(
      "../../../sdk/wasm/pkg/web/design_data_wasm_bg.wasm",
      import.meta.url,
    ),
  );
  const engine = `wasm:sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  const service = createValueResolutionService(async () => ({
    engine,
    create: (input) => new ValueResolver(input),
  }));
  try {
    const root = referenceRoot();
    const reference = await measure(
      "reference-load-and-native-validation",
      () => loadReferenceInput(root),
    );
    const resolvedReference = await measure("reference-wasm-resolution", () =>
      service.resolve(reference),
    );
    const snapshot = await measure("default-snapshot", () =>
      createDefaultSnapshot(),
    );
    const projected = await measure("working-projection", () =>
      projectSnapshot(snapshot, "working"),
    );
    const hash = await measure("working-fingerprint", () =>
      createHash("sha256")
        .update(canonicalJson(projected.records))
        .digest("hex"),
    );
    const app = { ...projected, source: { ...projected.source, hash } };
    const resolvedApp = await measure("working-wasm-resolution", () =>
      service.resolve(app, resolvedReference),
    );
    const report = await measure("indexed-comparison", () =>
      compareDesignData(resolvedApp, resolvedReference),
    );
    const reused = await measure("working-wasm-resolution-reuse", () =>
      service.resolve(app, resolvedReference),
    );
    assert.equal(reused.resolvedValues, resolvedApp.resolvedValues);
    assert.equal(report.inputs.app.hash, app.source.hash);
    console.log(
      JSON.stringify({
        source: "wasm-analysis",
        node: process.version,
        appHash: app.source.hash,
        referenceHash: reference.source.hash,
        appRecords: app.records.length,
        referenceRecords: reference.records.length,
        resolvedQueries: resolvedApp.resolvedValues?.length,
        engine,
        stages,
      }),
    );
  } finally {
    service.dispose();
  }
} else if (process.argv.includes("--reference")) {
  const root = referenceRoot();
  let reference = await measure("reference-load-and-native-validation", () =>
    loadReferenceInput(root),
  );
  assert(
    reference.records.length > 0,
    "The reference inventory must be present.",
  );
  reference = await measure("reference-native-resolution", () =>
    resolveColorOpacityValues(reference, root),
  );
  reference = await measure("reference-architecture", () =>
    attachReferenceAssessment(reference, root),
  );
  console.log(
    JSON.stringify({
      source: "reference-baseline",
      node: process.version,
      hash: reference.source.hash,
      records: reference.records.length,
      errors: reference.errors,
      resolverIssue: reference.valueResolution?.error,
      stages,
    }),
  );
} else {
  const snapshot = await measure("default-snapshot", () =>
    createDefaultSnapshot(),
  );
  const app = await measure("working-projection", () =>
    projectSnapshot(snapshot, "working"),
  );
  assert(app.records.length > 0, "The authored inventory must be present.");
  const hash = await measure("working-fingerprint", () =>
    createHash("sha256").update(canonicalJson(app.records)).digest("hex"),
  );
  console.log(
    JSON.stringify({
      source: "projection-baseline",
      node: process.version,
      hash,
      records: app.records.length,
      tokenRecords: app.records.filter((row) => row.category === "tokens")
        .length,
      errors: app.errors,
      stages,
    }),
  );
}
