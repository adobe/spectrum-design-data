// Copyright 2026 Adobe. All rights reserved.
import { upgradeTypographyFontsSnapshot } from "../typography/fontsUpgrade";
import {
  isFoundationModeAttachments,
  type FoundationModeAttachments,
} from "../../state/view/foundationModeAttachments";
import { upgradeGeneratorRulesSnapshot } from "./generatorRulesUpgrade";
import { upgradeScaleAdjustmentSnapshot } from "./scaleAdjustmentUpgrade";
import { upgradeFoundationSettingsSnapshot } from "./foundationSettingsUpgrade";
import { upgradeColorNamingSnapshot } from "./colorNamingUpgrade";
import { upgradeStylesSnapshot } from "./stylesUpgrade";
import {
  isLayoutScaleMigrationSource,
  upgradeLayoutScalesSnapshot,
} from "./layoutScalesUpgrade";
import { upgradeTokenTierData } from "./tokenTierUpgrade";
import { upgradePlatformScaleSnapshot } from "./platformScaleUpgrade";
import { upgradeScaleKeys } from "../modes/scaleKeys";
import {
  upgradeComponentSizingSnapshot,
  upgradeSizingFields,
} from "./componentSizingUpgrade";
import {
  encodeStructureSource,
  decodeStructureSource,
} from "./structureSourceCodec";
import {
  decodeAuthoringStorage,
  encodeAuthoringStorage,
} from "./authoringStorageCodec";

export const AUTHORING_STORAGE_KEY = "leonardo:authoring:v1";
export const PREFERENCES_STORAGE_KEY = "leonardo:preferences:v1";
export const AUTHORING_RECORD_VERSION = 33;

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
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33;
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
      | 16
      | 17
      | 18
      | 19
      | 20
      | 21
      | 22
      | 23
      | 24
      | 25
      | 26
      | 27
      | 28
      | 29
      | 30
      | 31
      | 32,
  ) => unknown,
  reportIssue?: (message: string) => void,
  reconcile?: (value: T, identities: Map<string, string>) => T,
): AuthoringRecord<T> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTHORING_STORAGE_KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(decodeAuthoringStorage(raw));
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
      value.version !== 17 &&
      value.version !== 18 &&
      value.version !== 19 &&
      value.version !== 20 &&
      value.version !== 21 &&
      value.version !== 22 &&
      value.version !== 23 &&
      value.version !== 24 &&
      value.version !== 25 &&
      value.version !== 26 &&
      value.version !== 27 &&
      value.version !== 28 &&
      value.version !== 29 &&
      value.version !== 30 &&
      value.version !== 31 &&
      value.version !== 32 &&
      value.version !== AUTHORING_RECORD_VERSION) ||
    typeof value.isEditing !== "boolean" ||
    !isFoundationModeAttachments(value.attachments) ||
    !isFoundationModeAttachments(value.savedAttachments)
  ) {
    throw new Error(
      "Stored authoring data has an unsupported format. Reset all to replace it with defaults.",
    );
  }
  const identities = new Map<string, string>();
  const working = upgradeTypographyFontsSnapshot(
    upgradeTokenTierData(
      decodeStructureSource(
        value.version !== AUTHORING_RECORD_VERSION &&
          value.version < 28 &&
          upgrade
          ? upgradeGeneratorRulesSnapshot(
              upgrade(
                upgradeScaleAdjustmentSnapshot(
                  upgradeSizingFields(upgradeTokenTierData(value.working)),
                ),
                value.version,
              ),
            )
          : value.working,
        identities,
      ),
    ),
    identities,
  );
  const saved = upgradeTypographyFontsSnapshot(
    upgradeTokenTierData(
      decodeStructureSource(
        value.version !== AUTHORING_RECORD_VERSION &&
          value.version < 28 &&
          upgrade
          ? upgradeGeneratorRulesSnapshot(
              upgrade(
                upgradeScaleAdjustmentSnapshot(
                  upgradeSizingFields(upgradeTokenTierData(value.saved)),
                ),
                value.version,
              ),
            )
          : value.saved,
        identities,
      ),
    ),
    identities,
  );
  const platformWorking =
    value.version < 25
      ? upgradePlatformScaleSnapshot(working, identities)
      : working;
  const platformSaved =
    value.version < 25
      ? upgradePlatformScaleSnapshot(saved, identities)
      : saved;
  const sizingWorking =
    value.version < 26 && upgrade
      ? upgradeComponentSizingSnapshot(platformWorking, identities, reportIssue)
      : platformWorking;
  const sizingSaved =
    value.version < 26 && upgrade
      ? upgradeComponentSizingSnapshot(platformSaved, identities, reportIssue)
      : platformSaved;
  const keyedWorking =
    value.version < 27
      ? upgradeScaleKeys(sizingWorking, reportIssue)
      : sizingWorking;
  const keyedSaved =
    value.version < 27
      ? upgradeScaleKeys(sizingSaved, reportIssue)
      : sizingSaved;
  validate(keyedWorking);
  validate(keyedSaved);
  const upgradedWorking =
    value.version < 28 && upgrade
      ? upgradeFoundationSettingsSnapshot(keyedWorking)
      : keyedWorking;
  const upgradedSaved =
    value.version < 28 && upgrade
      ? upgradeFoundationSettingsSnapshot(keyedSaved)
      : keyedSaved;
  const namedWorking =
    value.version < 29 && upgrade
      ? upgradeColorNamingSnapshot(upgradedWorking)
      : upgradedWorking;
  const namedSaved =
    value.version < 29 && upgrade
      ? upgradeColorNamingSnapshot(upgradedSaved)
      : upgradedSaved;
  const stylesWorking = upgrade
    ? upgradeStylesSnapshot(namedWorking)
    : namedWorking;
  const stylesSaved = upgrade ? upgradeStylesSnapshot(namedSaved) : namedSaved;
  validate(stylesWorking);
  validate(stylesSaved);
  const layoutWorking =
    value.version < 31 && upgrade && isLayoutScaleMigrationSource(stylesWorking)
      ? upgradeLayoutScalesSnapshot(stylesWorking, identities)
      : stylesWorking;
  const layoutSaved =
    value.version < 31 && upgrade && isLayoutScaleMigrationSource(stylesSaved)
      ? upgradeLayoutScalesSnapshot(stylesSaved, identities)
      : stylesSaved;
  validate(layoutWorking);
  validate(layoutSaved);
  const record: AuthoringRecord<T> = {
    version: upgrade ? AUTHORING_RECORD_VERSION : value.version,
    working: reconcile ? reconcile(layoutWorking, identities) : layoutWorking,
    saved: reconcile ? reconcile(layoutSaved, identities) : layoutSaved,
    isEditing: value.isEditing,
    attachments: value.attachments,
    savedAttachments: value.savedAttachments,
  };
  validate(record.working);
  validate(record.saved);
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
  const serialized = encodeAuthoringStorage({
    ...record,
    working:
      record.version === AUTHORING_RECORD_VERSION
        ? encodeStructureSource(record.working)
        : record.working,
    saved:
      record.version === AUTHORING_RECORD_VERSION
        ? encodeStructureSource(record.saved)
        : record.saved,
  });
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
