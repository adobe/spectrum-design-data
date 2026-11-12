// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisInput, AnalysisRecord } from "./comparison";
import { referenceRecords } from "./referenceRecords";

export interface PackagedReference {
  schemaVersion: 1;
  wasmHash: string;
  recordsHash: string;
  modeKeys: string[];
  input: Omit<AnalysisInput, "records">;
  records: (
    | AnalysisRecord
    | {
        embeddedToken: string;
        source: string;
        pointer: string;
      }
  )[];
}

export function reconstructPackagedReference(
  snapshot: PackagedReference,
  tokens: { uuid?: string; raw: unknown }[],
  wasmHash: string,
): AnalysisInput {
  if (snapshot.schemaVersion !== 1 || snapshot.wasmHash !== wasmHash)
    throw new Error("Packaged reference and WASM belong to different builds.");
  const byId = new Map<string, unknown>();
  for (const token of tokens) {
    if (!token.uuid || byId.has(token.uuid))
      throw new Error(
        "Embedded token inventory has a missing or duplicate identity.",
      );
    byId.set(token.uuid, token.raw);
  }
  const used = new Set<string>();
  const records = snapshot.records.map((record): AnalysisRecord => {
    if (!("embeddedToken" in record)) return record;
    const raw = byId.get(record.embeddedToken);
    if (!raw || used.has(record.embeddedToken))
      throw new Error(
        `Packaged token is missing or duplicated: ${record.embeddedToken}`,
      );
    used.add(record.embeddedToken);
    const projected = referenceRecords(record.source, raw, snapshot.modeKeys);
    if (projected.length !== 1)
      throw new Error(`Invalid embedded token: ${record.embeddedToken}`);
    return { ...projected[0], pointer: record.pointer };
  });
  if (used.size !== byId.size)
    throw new Error(
      "Packaged reference does not cover the complete embedded token inventory.",
    );
  return { ...snapshot.input, records };
}
