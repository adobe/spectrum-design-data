// Copyright 2026 Adobe. All rights reserved.
import type * as Wasm from "@adobe/design-data-wasm/web";
import type { AnalysisInput } from "./comparison";
import {
  resolutionDataset,
  resolutionQueries,
  VALUE_CONTEXT_POLICY,
} from "./colorOpacityAssessment";

export interface ResolutionRuntime {
  engine: string;
  create: (
    input: Wasm.ValueResolutionInput,
  ) => Pick<Wasm.ValueResolver, "resolveValues" | "free">;
}

export function unavailableValueResolution(
  input: AnalysisInput,
  failure: unknown,
  reference?: AnalysisInput,
): AnalysisInput {
  const error = `Token resolution unavailable: ${failure instanceof Error ? failure.message : String(failure)}`;
  return {
    ...input,
    resolvedValues: undefined,
    valueResolution: {
      datasetHash: input.source.hash,
      ...(reference && { referenceHash: reference.source.hash }),
      contextPolicy: VALUE_CONTEXT_POLICY,
      engine: "wasm:unavailable",
      error,
    },
    limitations: [
      ...input.limitations.filter(
        (message) => !message.startsWith("Token resolution unavailable:"),
      ),
      error,
    ],
  };
}

export function createValueResolutionService(
  initialize: () => Promise<ResolutionRuntime>,
) {
  let runtime: Promise<ResolutionRuntime> | undefined;
  const slots = new Map<
    string,
    {
      key: string;
      resolver: ReturnType<ResolutionRuntime["create"]>;
      result?: AnalysisInput;
    }
  >();
  return {
    async resolve(input: AnalysisInput, reference?: AnalysisInput) {
      runtime ??= initialize().catch((error: unknown) => {
        runtime = undefined;
        throw error;
      });
      const { engine, create } = await runtime;
      const slot = input.source.kind === "reference" ? "reference" : "app";
      const key = `${input.source.kind}:${input.source.hash}:${engine}`;
      let prepared = slots.get(slot);
      if (!prepared || prepared.key !== key) {
        prepared?.resolver.free();
        slots.delete(slot);
        prepared = { key, resolver: create(resolutionDataset(input)) };
        slots.set(slot, prepared);
      }
      const cached = prepared.result;
      if (
        cached?.valueResolution?.referenceHash === reference?.source.hash &&
        cached?.valueResolution?.contextPolicy === VALUE_CONTEXT_POLICY
      )
        return {
          ...input,
          limitations: input.limitations.filter(
            (message) => !message.startsWith("Token resolution unavailable:"),
          ),
          resolvedValues: cached.resolvedValues,
          valueResolution: cached.valueResolution,
        };
      const resolvedValues: NonNullable<AnalysisInput["resolvedValues"]> = [];
      let batch: Wasm.ValueResolutionQuery[] = [];
      const resolver = prepared.resolver;
      const resolveBatch = () => {
        const rows = resolver.resolveValues(batch);
        resolvedValues.push(
          ...rows.map(({ selectedId, label, ...row }) => ({
            ...row,
            ...(selectedId != null && { selectedId }),
            ...(label != null && { label }),
          })),
        );
        batch = [];
      };
      for (const query of resolutionQueries(input, reference)) {
        batch.push(query);
        if (batch.length === 256) resolveBatch();
      }
      if (batch.length) resolveBatch();
      const result: AnalysisInput = {
        ...input,
        limitations: input.limitations.filter(
          (message) => !message.startsWith("Token resolution unavailable:"),
        ),
        resolvedValues,
        valueResolution: {
          datasetHash: input.source.hash,
          ...(reference && { referenceHash: reference.source.hash }),
          contextPolicy: VALUE_CONTEXT_POLICY,
          engine,
        },
      };
      prepared.result = result;
      return result;
    },
    dispose() {
      for (const slot of slots.values()) slot.resolver.free();
      slots.clear();
    },
  };
}

let wasm: Promise<{ module: typeof Wasm; hash: string }> | undefined;
export function loadWasm() {
  wasm ??= (async () => {
    const [module, { default: url }] = await Promise.all([
      import("@adobe/design-data-wasm/web"),
      import("@adobe/design-data-wasm/module.wasm?url"),
    ]);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`WASM request failed (${response.status}).`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    await module.default({ module_or_path: bytes });
    return { module, hash };
  })().catch((error: unknown) => {
    wasm = undefined;
    throw error;
  });
  return wasm;
}

export const wasmResolution = createValueResolutionService(async () => {
  const { module, hash } = await loadWasm();
  return {
    engine: `wasm:sha256:${hash}`,
    create: (input) => new module.ValueResolver(input),
  };
});
