// Copyright 2026 Adobe. All rights reserved.
import LZString from "lz-string";

const ENCODING = "lz-string-utf16-v1";
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function encodeAuthoringStorage<
  T extends { working: unknown; saved: unknown },
>(value: T): string {
  const { working, saved, ...metadata } = value;
  return JSON.stringify({
    ...metadata,
    encoding: ENCODING,
    snapshots: LZString.compressToUTF16(JSON.stringify([working, saved])),
  });
}

/**
 * Whether `serialized` already stores `value`, checked without compressing it
 * again. Malformed or differently encoded text never matches.
 */
export function storesAuthoringValue<
  T extends { working: unknown; saved: unknown },
>(serialized: string, value: T): boolean {
  try {
    const stored: unknown = JSON.parse(serialized);
    if (
      !record(stored) ||
      stored.encoding !== ENCODING ||
      typeof stored.snapshots !== "string"
    )
      return false;
    const { working, saved, ...metadata } = value;
    return (
      JSON.stringify({
        ...metadata,
        encoding: ENCODING,
        snapshots: stored.snapshots,
      }) === serialized &&
      LZString.decompressFromUTF16(stored.snapshots) ===
        JSON.stringify([working, saved])
    );
  } catch {
    return false;
  }
}

export function decodeAuthoringStorage(serialized: string): string {
  const value: unknown = JSON.parse(serialized);
  if (!record(value) || !("encoding" in value)) return serialized;
  if (value.encoding !== ENCODING || typeof value.snapshots !== "string")
    throw new Error("Stored authoring data has an unsupported encoding.");
  const decoded = LZString.decompressFromUTF16(value.snapshots);
  if (!decoded) throw new Error("Stored authoring data could not be decoded.");
  const snapshots: unknown = JSON.parse(decoded);
  if (!Array.isArray(snapshots) || snapshots.length !== 2)
    throw new Error("Stored authoring snapshots have an unsupported format.");
  const result: Record<string, unknown> = {
    ...value,
    working: snapshots[0],
    saved: snapshots[1],
  };
  delete result.encoding;
  delete result.snapshots;
  return JSON.stringify(result);
}
