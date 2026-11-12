// Copyright 2026 Adobe. All rights reserved.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadReferenceInput } from "./design-data-loader";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import { modeAxes } from "../src/features/design-data/colorOpacityAssessment";
import {
  reconstructPackagedReference,
  type PackagedReference,
} from "../src/features/design-data/packagedReference";

export async function packagedAnalysisReference(root: string) {
  const input = await loadReferenceInput(root);
  if (input.inventoryStatus !== "complete")
    throw new Error(
      `Packaged reference inventory is incomplete: ${input.errors.join("; ")}`,
    );
  const wasmBytes = await readFile(
    fileURLToPath(import.meta.resolve("@adobe/design-data-wasm/module.wasm")),
  );
  const wasmHash = createHash("sha256").update(wasmBytes).digest("hex");
  const { Dataset } = await import("@adobe/design-data-wasm");
  const dataset = Dataset.embedded();
  try {
    const tokens = dataset.query("");
    const recordsHash = createHash("sha256")
      .update(canonicalJson(input.records))
      .digest("hex");
    const { records, architecture: _architecture, ...metadata } = input;
    const snapshot: PackagedReference = {
      schemaVersion: 1,
      wasmHash,
      recordsHash,
      modeKeys: modeAxes(input),
      input: {
        ...metadata,
        source: {
          ...input.source,
          root: "Packaged reference snapshot",
          referenceOrigin: "packaged",
        },
        limitations: [
          ...input.limitations,
          "Packaged reference snapshot from this build, not a live checkout. Architectural checkout evidence is unavailable.",
        ],
      },
      records: records.map((record) => {
        if (record.category !== "tokens") return record;
        if (!record.identity)
          throw new Error(`Packaged token has no identity: ${record.id}`);
        return {
          embeddedToken: record.identity,
          source: record.source,
          pointer: record.pointer,
        };
      }),
    };
    const reconstructed = reconstructPackagedReference(
      snapshot,
      tokens,
      wasmHash,
    );
    if (canonicalJson(reconstructed.records) !== canonicalJson(records))
      throw new Error(
        "Embedded WASM tokens differ from the build checkout. Rebuild sdk-wasm before building Studio.",
      );
    // Error diagnostics must not publish the build machine's absolute checkout path.
    return JSON.stringify(snapshot).split(root).join("<build-checkout>");
  } finally {
    dataset.free();
  }
}
