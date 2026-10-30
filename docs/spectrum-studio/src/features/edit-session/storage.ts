// Copyright 2026 Adobe. All rights reserved.
import {
  isFoundationModeAttachments,
  type FoundationModeAttachments,
} from "../../state/view/foundationModeAttachments";

export const AUTHORING_STORAGE_KEY = "leonardo:authoring:v1";
export const PREFERENCES_STORAGE_KEY = "leonardo:preferences:v1";
export const AUTHORING_RECORD_VERSION = 17;

export interface AuthoringRecord<T> {
  version:
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17;
  working: T;
  saved: T;
  isEditing: boolean;
  attachments: FoundationModeAttachments;
  savedAttachments: FoundationModeAttachments;
}

export interface ViewPreferences {
  version: 1;
  appearance: "light" | "dark";
  modeSelection: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

let blocked = false;

export function blockAuthoringStorage() {
  blocked = true;
}

export function readAuthoringRecord<T>(
  validate: (value: unknown) => asserts value is T,
  upgrade?: (
    value: unknown,
    version:
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6
      | 7
      | 8
      | 9
      | 10
      | 11
      | 12
      | 13
      | 14
      | 15
      | 16,
  ) => unknown,
): AuthoringRecord<T> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTHORING_STORAGE_KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4 &&
      value.version !== 5 &&
      value.version !== 6 &&
      value.version !== 7 &&
      value.version !== 8 &&
      value.version !== 9 &&
      value.version !== 10 &&
      value.version !== 11 &&
      value.version !== 12 &&
      value.version !== 13 &&
      value.version !== 14 &&
      value.version !== 15 &&
      value.version !== 16 &&
      value.version !== AUTHORING_RECORD_VERSION) ||
    typeof value.isEditing !== "boolean" ||
    !isFoundationModeAttachments(value.attachments) ||
    !isFoundationModeAttachments(value.savedAttachments)
  ) {
    throw new Error(
      "Stored authoring data has an unsupported format. Reset all to replace it with defaults.",
    );
  }
  const working =
    value.version !== AUTHORING_RECORD_VERSION && upgrade
      ? upgrade(value.working, value.version)
      : value.working;
  const saved =
    value.version !== AUTHORING_RECORD_VERSION && upgrade
      ? upgrade(value.saved, value.version)
      : value.saved;
  validate(working);
  validate(saved);
  const record: AuthoringRecord<T> = {
    version: upgrade ? AUTHORING_RECORD_VERSION : value.version,
    working,
    saved,
    isEditing: value.isEditing,
    attachments: value.attachments,
    savedAttachments: value.savedAttachments,
  };
  return record;
}

export function writeAuthoringRecord<T>(
  record: AuthoringRecord<T>,
  replaceInvalid = false,
) {
  if (typeof window === "undefined") return;
  if (blocked && !replaceInvalid)
    throw new Error(
      "Stored changes could not be restored. Reset all before replacing them.",
    );
  const serialized = JSON.stringify(record);
  if (window.localStorage.getItem(AUTHORING_STORAGE_KEY) !== serialized) {
    window.localStorage.setItem(AUTHORING_STORAGE_KEY, serialized);
  }
  blocked = false;
}

export function readViewPreferences(): ViewPreferences | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !["light", "dark"].includes(String(value.appearance)) ||
    !isRecord(value.modeSelection) ||
    !Object.values(value.modeSelection).every((id) => typeof id === "string")
  ) {
    throw new Error("Stored appearance or mode choices could not be restored.");
  }
  const appearance = value.appearance === "dark" ? "dark" : "light";
  const modeSelection = Object.fromEntries(
    Object.entries(value.modeSelection).map(([key, id]) => [key, String(id)]),
  );
  return { version: 1, appearance, modeSelection };
}

export function writeViewPreferences(preferences: ViewPreferences) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(preferences);
  if (window.localStorage.getItem(PREFERENCES_STORAGE_KEY) !== serialized) {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, serialized);
  }
}
