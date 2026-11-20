// Copyright 2026 Adobe. All rights reserved.
import {
  atom,
  createStore,
  type Getter,
  type Setter,
  type WritableAtom,
} from "jotai";
import {
  assertAuthoringUpdate,
  withValidatedAuthoringUpdates,
} from "./authoringGuards";
import { deferPersistedNumeric } from "../features/edit-session/numericProposal";

export const PROTOTYPE_STORAGE_KEYS = [
  "foundations/color",
  "foundations/typography",
  "foundations/spacing",
  "foundations/size",
  "registry/taxonomy",
  "tokens/color/overrides",
  "tokens/browser/edits",
  "rules/library",
  "logic/scale-types",
  "logic/interpolations",
  "logic/curves",
  "modes/mode-sets",
  "modes/selection",
  "modes/adaptive-claims",
  "platforms",
  "view/edit-mode",
  "edit-session/snapshot",
  "artifacts/dimensions",
].map((key) => `leonardo:v1:${key}`);

const cleanupIssues: string[] = [];
const issuesAtom = atom<string[]>(cleanupIssues);
export const PERSISTENCE_ISSUE_PREFIXES = {
  authoring: "Could not store or restore your authoring changes.",
  preferences: "Could not store or restore your appearance or mode choices.",
  artifacts: "Could not rebuild or store your generated token cache.",
};
export const persistenceIssuesAtom = atom((get) => get(issuesAtom));
export const reportPersistenceIssueAtom = atom(
  null,
  (get, set, message: string) => {
    console.error(message);
    if (!get(issuesAtom).includes(message))
      set(issuesAtom, [...get(issuesAtom), message]);
  },
);
export const clearPersistenceIssuesAtom = atom(
  null,
  (get, set, scope?: "authoring" | "preferences" | "artifacts") => {
    set(
      issuesAtom,
      scope
        ? get(issuesAtom).filter(
            (issue) => !issue.startsWith(PERSISTENCE_ISSUE_PREFIXES[scope]),
          )
        : [],
    );
  },
);

export function clearPersistedState() {
  if (typeof window === "undefined") return;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      const store = window[name];
      for (const key of PROTOTYPE_STORAGE_KEYS) store.removeItem(key);
    } catch (failure) {
      const message = `Could not remove old Spectrum studio prototype data from ${name}. ${failure instanceof Error ? failure.message : String(failure)}`;
      cleanupIssues.push(message);
      console.error(message);
    }
  }
}

clearPersistedState();

export interface PersistedAtomOptions<T> {
  key: string;
  schemaVersion: number;
  initialize: () => T;
  validate?: (data: unknown) => data is T;
  migrate?: (data: unknown, fromVersion: number) => T | null;
  legacyKey?: string;
  preserveInvalid?: boolean;
}

interface PersistedTarget {
  validate: (value: unknown) => boolean;
  write: (set: Setter, value: unknown) => void;
  seed: (set: Setter, value: unknown) => void;
}
const persistedTargets = new Map<string, PersistedTarget>();
let observeWrite: ((key: string, value: unknown) => void) | undefined;

/** Seeds only a newly created store; later writes still run normal guards. */
export function createIsolatedPersistedStore(
  updates: ReadonlyMap<string, unknown>,
) {
  for (const [key, value] of updates) {
    const target = persistedTargets.get(key);
    if (!target || !target.validate(value))
      throw new Error(`The isolated ${key} source has invalid data.`);
  }
  const store = createStore();
  store.set(
    atom(null, (_get, set) => {
      for (const [key, value] of updates)
        persistedTargets.get(key)!.seed(set, value);
    }),
  );
  return store;
}

/** Records canonical writes in an isolated validation store, not attempted edits. */
export function recordPersistedWrites(run: () => void) {
  const updates = new Map<string, unknown>();
  const previous = observeWrite;
  observeWrite = (key, value) => updates.set(key, value);
  try {
    run();
    return updates;
  } finally {
    observeWrite = previous;
  }
}

export function applyPersistedWrites(
  get: Getter,
  set: Setter,
  updates: ReadonlyMap<string, unknown>,
) {
  for (const [key, value] of updates) {
    const target = persistedTargets.get(key);
    if (!target || !target.validate(value))
      throw new Error(`The prepared ${key} update has invalid source data.`);
  }
  return withValidatedAuthoringUpdates(get, updates, () => {
    for (const [key, value] of updates)
      persistedTargets.get(key)!.write(set, value);
  });
}

// The edit-session coordinator persists complete snapshots, not independent atom writes.
export function persistedAtom<T>({
  key,
  initialize,
  validate,
}: PersistedAtomOptions<T>): WritableAtom<T, [T | ((previous: T) => T)], void> {
  const initial = initialize();
  if (validate && !validate(initial))
    throw new Error(`${key}: invalid shipped defaults.`);
  const base = atom<T>(initial);
  const source = atom(
    (get) => get(base),
    (get, set, update: T | ((previous: T) => T)) => {
      const next =
        typeof update === "function"
          ? (update as (previous: T) => T)(get(base))
          : update;
      if (validate && !validate(next))
        throw new Error(`${key}: invalid data cannot be applied.`);
      if (deferPersistedNumeric(key, get(base), next)) return;
      assertAuthoringUpdate(get, key, next);
      set(base, next);
      observeWrite?.(key, next);
    },
  );
  if (validate)
    persistedTargets.set(key, {
      validate,
      write: (set, value) => {
        if (!validate(value))
          throw new Error(`${key}: invalid prepared source data.`);
        set(source, value);
      },
      seed: (set, value) => {
        if (!validate(value))
          throw new Error(`${key}: invalid isolated source data.`);
        set(base, value);
      },
    });
  return source;
}

let flush:
  | {
      callback: () => void;
      store?: ReturnType<typeof createStore>;
    }
  | undefined;
export function registerPersistenceFlush(
  callback: () => void,
  store?: ReturnType<typeof createStore>,
) {
  const registration = { callback, store };
  flush = registration;
  return () => {
    if (flush === registration) flush = undefined;
  };
}
export function flushPersistedState(store?: ReturnType<typeof createStore>) {
  if (!store || flush?.store === store) flush?.callback();
}
