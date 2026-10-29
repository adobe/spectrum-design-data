// Copyright 2026 Adobe. All rights reserved.
import type { ColorTokenOutcomeReuse } from "../tokens/colorGeneration";
import type { GeneratedToken } from "../tokens/model";

export interface PreparedScaleColors {
  readonly input: string;
  readonly tokens: readonly GeneratedToken[];
}

const MAX_ENTRIES = 128;
const MAX_BYTES = 1_000_000;
const encoder = new TextEncoder();

export function preparedScaleColorsFitBudget(
  entries: readonly PreparedScaleColors[],
): boolean {
  return (
    entries.length <= MAX_ENTRIES &&
    encoder.encode(JSON.stringify(entries)).byteLength <= MAX_BYTES
  );
}

function inputSignature(input: unknown): string | null {
  const ancestors = new WeakSet<object>();
  const supported = (value: unknown): boolean => {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    )
      return true;
    if (typeof value === "number")
      return Number.isFinite(value) && !Object.is(value, -0);
    if (typeof value !== "object" || ancestors.has(value)) return false;
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      array
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    )
      return false;
    const keys = Reflect.ownKeys(value).filter(
      (key) => !array || key !== "length",
    );
    if (
      array &&
      (keys.length !== value.length ||
        keys.some((key, index) => key !== String(index)))
    )
      return false;
    ancestors.add(value);
    const valid = keys.every((key) => {
      const property = Object.getOwnPropertyDescriptor(value, key)!;
      return (
        typeof key === "string" &&
        property.enumerable &&
        "value" in property &&
        supported(property.value)
      );
    });
    ancestors.delete(value);
    return valid;
  };
  return supported(input) ? JSON.stringify(input) : null;
}

export function withPreparedScaleColors<T>(
  previous: readonly PreparedScaleColors[] | undefined,
  prepared: PreparedScaleColors[] | undefined,
  read: (reuse: ColorTokenOutcomeReuse | undefined) => T,
): T {
  if (!previous?.length && !prepared) return read(undefined);
  const ready = new Map(previous?.map((entry) => [entry.input, entry.tokens]));
  const recorded = new Set(prepared?.map((entry) => entry.input));
  // Object signatures are shared only within this synchronous, read-only inventory.
  let signatures: WeakMap<object, string | null> | null = new WeakMap();
  let bytes = prepared
    ? encoder.encode(JSON.stringify(prepared)).byteLength
    : 0;
  const reuse: ColorTokenOutcomeReuse = (input, generate) => {
    const keys = signatures;
    if (!keys) return generate();
    const parts = input.map((value) => {
      if (typeof value !== "object" || value === null)
        return inputSignature(value);
      const cached = keys.get(value);
      if (cached !== undefined) return cached;
      const signature = inputSignature(value);
      keys.set(value, signature);
      return signature;
    });
    const key = parts.includes(null) ? null : `[${parts.join(",")}]`;
    const cached = key === null ? undefined : ready.get(key);
    const outcomes = cached
      ? structuredClone(cached).map((token) => ({
          status: "ready" as const,
          token,
        }))
      : generate();
    if (
      prepared &&
      key !== null &&
      !recorded.has(key) &&
      outcomes.every((outcome) => outcome.status === "ready")
    ) {
      const entry = {
        input: key,
        tokens: outcomes.map((outcome) => outcome.token),
      };
      const size =
        encoder.encode(JSON.stringify(entry)).byteLength +
        (prepared.length ? 1 : 0);
      if (prepared.length < MAX_ENTRIES && bytes + size <= MAX_BYTES) {
        prepared.push(structuredClone(entry));
        recorded.add(key);
        bytes += size;
      }
    }
    return outcomes;
  };
  try {
    return read(reuse);
  } finally {
    signatures = null;
    ready.clear();
    recorded.clear();
  }
}
