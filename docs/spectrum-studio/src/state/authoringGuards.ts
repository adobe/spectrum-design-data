// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter } from "jotai";
import { deferNumericBatch } from "../features/edit-session/numericProposal";

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
export function authoringGuardConfiguration() {
  return { revision: guardRevision, ids: [...guards.keys()].sort() };
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
  const proposal = current
    ? new Map([...current.updates, ...updates])
    : updates;
  if (contexts) for (const context of contexts) context.valid = false;
  for (const guard of guards.values()) guard(get, proposal);
}

/** The callback only commits the supplied immutable proposal, synchronously. */
export function withValidatedAuthoringUpdates(
  get: Getter,
  updates: ReadonlyMap<string, unknown>,
  write: () => undefined,
) {
  if (deferNumericBatch(updates)) return;
  const owner = get(batchOwnerAtom);
  const current = batches.get(owner)?.at(-1);
  const approved = new Map([...(current?.updates ?? []), ...updates]);
  const revision = guardRevision;
  assertAuthoringUpdates(get, approved);
  return runValidatedBatch(owner, approved, revision, write);
}

function runValidatedBatch(
  owner: object,
  approved: ReadonlyMap<string, unknown>,
  revision: number,
  write: () => undefined,
) {
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

/**
 * Preparation must run the same guards against a complete isolated source.
 * The returned batch is single-use, store-bound and valid only for that source.
 */
export async function prepareAuthoringUpdates<Value>(
  get: Getter,
  validate: () => Promise<{
    value: Value;
    updates: ReadonlyMap<string, unknown>;
    guards: ReturnType<typeof authoringGuardConfiguration>;
  }>,
  isCurrent: () => boolean,
) {
  const owner = get(batchOwnerAtom);
  const configuration = authoringGuardConfiguration();
  const prepared = await validate();
  const matches = () => {
    const current = authoringGuardConfiguration();
    return (
      current.revision === configuration.revision &&
      current.ids.join("\n") === configuration.ids.join("\n") &&
      prepared.guards.revision === configuration.revision &&
      prepared.guards.ids.join("\n") === configuration.ids.join("\n")
    );
  };
  if (!isCurrent() || !matches())
    throw new Error(
      "The authoring source or validation rules changed. Retry the edit.",
    );
  const updates = new Map(prepared.updates);
  let used = false;
  return {
    value: prepared.value,
    commit(currentGet: Getter, write: () => undefined) {
      if (
        used ||
        currentGet(batchOwnerAtom) !== owner ||
        !isCurrent() ||
        !matches()
      )
        throw new Error("The prepared authoring edit is no longer current.");
      used = true;
      return runValidatedBatch(owner, updates, configuration.revision, write);
    },
  };
}
