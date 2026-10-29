// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter } from "jotai";

type AuthoringGuard = (
  get: Getter,
  updates: ReadonlyMap<string, unknown>,
) => void;
const guards = new Map<string, AuthoringGuard>();
const batchOwnerAtom = atom(() => ({}));
interface ValidationBatch {
  updates: ReadonlyMap<string, unknown>;
  revision: number;
  valid: boolean;
}
const batches = new WeakMap<object, ValidationBatch[]>();
let guardRevision = 0;
let activeBatches = 0;

export function registerAuthoringGuard(id: string, guard: AuthoringGuard) {
  guards.set(id, guard);
  guardRevision += 1;
}
export function assertAuthoringUpdate(get: Getter, key: string, next: unknown) {
  assertAuthoringUpdates(get, new Map([[key, next]]));
}
export function assertAuthoringUpdates(
  get: Getter,
  updates: ReadonlyMap<string, unknown>,
) {
  const contexts = activeBatches ? batches.get(get(batchOwnerAtom)) : undefined;
  const current = contexts?.at(-1);
  if (
    current?.valid &&
    current.revision === guardRevision &&
    [...updates].every(
      ([key, next]) =>
        current.updates.has(key) && Object.is(current.updates.get(key), next),
    )
  )
    return;
  if (contexts) for (const context of contexts) context.valid = false;
  for (const guard of guards.values()) guard(get, updates);
}

/** The callback only commits the supplied immutable proposal, synchronously. */
export function withValidatedAuthoringUpdates(
  get: Getter,
  updates: ReadonlyMap<string, unknown>,
  write: () => undefined,
) {
  const approved = new Map(updates);
  const revision = guardRevision;
  assertAuthoringUpdates(get, approved);
  const owner = get(batchOwnerAtom);
  const contexts = batches.get(owner) ?? [];
  contexts.push({ updates: approved, revision, valid: true });
  batches.set(owner, contexts);
  activeBatches += 1;
  try {
    write();
  } finally {
    contexts.pop();
    activeBatches -= 1;
    if (!contexts.length) batches.delete(owner);
  }
}
