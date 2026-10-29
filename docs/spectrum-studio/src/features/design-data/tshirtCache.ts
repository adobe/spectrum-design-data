// Copyright 2026 Adobe. All rights reserved.
import { canonicalJson } from "./canonicalJson";
import { TSHIRT_PROFILE } from "./tshirtProfile";
import type { TshirtAuthoringSource } from "./tshirtArtifacts";
import type { TshirtArtifactBundle } from "./tshirtTypes";

export const TSHIRT_CACHE_KEY = "leonardo:artifacts:tshirt:v1";
export interface ArtifactStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface TshirtCacheRecord {
  version: 1;
  sourceHash: string;
  resultHash: string;
  bundle: TshirtArtifactBundle;
}
export type TshirtCacheStatus =
  | { status: "pending" | "ready" }
  | { status: "error"; error: string };
export type HashText = (text: string) => Promise<string>;
export const hashArtifactText: HashText = async (text) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};
export function tshirtCacheSource(source: TshirtAuthoringSource) {
  return {
    version: 2,
    profile: TSHIRT_PROFILE,
    namingProfile: "leonardo-structure-naming-v2",
    color: source.colorSystem,
    typography: source.typography,
    spacing: source.spacing,
    size: source.size,
    radius: source.radius,
    elevation: source.elevation,
    taxonomy: source.taxonomy,
    structures: source.structures,
    rules: source.rules,
    formulas: source.scaleTypes,
    modeSets: source.modeSets,
    edits: source.browserTokenEdits ?? {},
  };
}

/** Cached output is checked against reconstruction, never used as authoring authority. */
export function createTshirtCacheWriter(
  storage: ArtifactStorage,
  hash: HashText = hashArtifactText,
) {
  let revision = 0;
  return {
    invalidate() {
      revision++;
    },
    async update(
      source: TshirtAuthoringSource,
      bundle: TshirtArtifactBundle,
    ): Promise<
      { status: "ready"; repaired?: string } | { status: "superseded" }
    > {
      const current = ++revision;
      const captured = structuredClone(bundle);
      const sourceText = canonicalJson(tshirtCacheSource(source)),
        resultText = canonicalJson(captured);
      if (new TextEncoder().encode(resultText).byteLength > 5_000_000)
        throw new Error(
          "Generated token cache exceeds its 5 MB limit. Authoring data remains separate.",
        );
      let sourceHash: string, resultHash: string;
      try {
        [sourceHash, resultHash] = await Promise.all([
          hash(sourceText),
          hash(resultText),
        ]);
      } catch (failure) {
        if (current !== revision) return { status: "superseded" };
        throw failure;
      }
      if (current !== revision) return { status: "superseded" };
      const record: TshirtCacheRecord = {
        version: 1,
        sourceHash,
        resultHash,
        bundle: captured,
      };
      const raw = storage.getItem(TSHIRT_CACHE_KEY);
      let repaired: string | undefined;
      if (raw !== null) {
        let previous: unknown;
        try {
          previous = JSON.parse(raw);
        } catch {
          repaired =
            "The generated token cache was malformed and has been rebuilt from authoring data.";
        }
        if (!repaired) {
          if (
            !previous ||
            typeof previous !== "object" ||
            Array.isArray(previous) ||
            !("version" in previous) ||
            previous.version !== 1 ||
            !("sourceHash" in previous) ||
            typeof previous.sourceHash !== "string" ||
            !("resultHash" in previous) ||
            typeof previous.resultHash !== "string" ||
            !("bundle" in previous)
          ) {
            repaired =
              "The generated token cache had an unsupported format and has been rebuilt.";
          } else if (
            previous.sourceHash === sourceHash &&
            (previous.resultHash !== resultHash ||
              canonicalJson(previous.bundle) !== resultText)
          ) {
            repaired =
              "The generated token cache did not match its sources and has been rebuilt.";
          }
        }
      }
      const serialized = JSON.stringify(record);
      if (raw !== serialized) storage.setItem(TSHIRT_CACHE_KEY, serialized);
      return { status: "ready", ...(repaired && { repaired }) };
    },
  };
}
