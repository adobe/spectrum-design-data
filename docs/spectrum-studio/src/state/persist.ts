// Copyright 2026 Adobe. All rights reserved.
import { atom, type WritableAtom } from "jotai";
import { assertAuthoringUpdate } from "./authoringGuards";

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
  return atom(
    (get) => get(base),
    (get, set, update: T | ((previous: T) => T)) => {
      const next =
        typeof update === "function"
          ? (update as (previous: T) => T)(get(base))
          : update;
      if (validate && !validate(next))
        throw new Error(`${key}: invalid data cannot be applied.`);
      assertAuthoringUpdate(get, key, next);
      set(base, next);
    },
  );
}

let flush: (() => void) | undefined;
export function registerPersistenceFlush(callback: () => void) {
  flush = callback;
  return () => {
    if (flush === callback) flush = undefined;
  };
}
export function flushPersistedState() {
  flush?.();
}
