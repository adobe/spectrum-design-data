// Copyright 2026 Adobe. All rights reserved.
// Disposable cache of finished Analysis comparisons. Entries are derived data:
// any failure falls back to recomputing, and a code or reference change makes
// old entries unreachable (and a code change clears them).
import { canonicalJson } from "./canonicalJson";
import type { AnalysisInput } from "./comparison";
import type {
  AnalysisComparisonRequest,
  AnalysisComparisonResult,
} from "./analysisWork";

export interface AnalysisCacheStore {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

const INDEX = "__index";
export const ANALYSIS_CACHE_LIMIT = 3;
type Index = { version: string; keys: string[] };

async function sha256(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Undefined when the inputs must not be cached (degraded reference). */
export async function analysisCacheKey(
  request: AnalysisComparisonRequest,
  reference: AnalysisInput | undefined,
): Promise<string | undefined> {
  if (!reference || reference.valueResolution?.error) return undefined;
  return sha256(
    canonicalJson({
      source: request.source,
      resolveValues: Boolean(request.resolveValues),
      reference: reference.source.hash,
      engine: reference.valueResolution?.engine ?? null,
    }),
  );
}

export function createAnalysisCache(
  open: () => Promise<AnalysisCacheStore>,
  version: string,
  limit = ANALYSIS_CACHE_LIMIT,
) {
  let ready: Promise<AnalysisCacheStore | undefined> | undefined;
  const store = () =>
    (ready ??= (async () => {
      try {
        const opened = await open();
        const index = (await opened.get(INDEX)) as Index | undefined;
        if (index?.version !== version) {
          for (const key of await opened.keys()) await opened.delete(key);
          await opened.put(INDEX, { version, keys: [] } satisfies Index);
        }
        return opened;
      } catch {
        return undefined;
      }
    })());
  const readIndex = async (opened: AnalysisCacheStore): Promise<Index> =>
    ((await opened.get(INDEX)) as Index | undefined) ?? { version, keys: [] };
  return {
    async get(key: string) {
      try {
        const opened = await store();
        if (!opened) return undefined;
        return (await opened.get(key)) as AnalysisComparisonResult | undefined;
      } catch {
        return undefined;
      }
    },
    async put(key: string, result: AnalysisComparisonResult) {
      if (result.app.valueResolution?.error) return;
      try {
        const opened = await store();
        if (!opened) return;
        const index = await readIndex(opened);
        const keys = [...index.keys.filter((entry) => entry !== key), key];
        while (keys.length > limit) await opened.delete(keys.shift()!);
        await opened.put(key, result);
        await opened.put(INDEX, { version, keys } satisfies Index);
      } catch {
        /* Quota or storage failures only cost a recompute next time. */
      }
    },
  };
}

export function indexedDbAnalysisStore(
  name = "spectrum-studio-analysis",
): Promise<AnalysisCacheStore> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("results");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const run = <T>(
        mode: IDBTransactionMode,
        action: (store: IDBObjectStore) => IDBRequest<T>,
      ) =>
        new Promise<T>((done, fail) => {
          const transaction = db.transaction("results", mode);
          const operation = action(transaction.objectStore("results"));
          transaction.oncomplete = () => done(operation.result);
          transaction.onerror = () => fail(transaction.error);
          transaction.onabort = () => fail(transaction.error);
        });
      resolve({
        get: (key) => run("readonly", (store) => store.get(key)),
        put: async (key, value) => {
          await run("readwrite", (store) => store.put(value, key));
        },
        delete: async (key) => {
          await run("readwrite", (store) => store.delete(key));
        },
        keys: async () =>
          (await run("readonly", (store) => store.getAllKeys())).map(String),
      });
    };
  });
}
