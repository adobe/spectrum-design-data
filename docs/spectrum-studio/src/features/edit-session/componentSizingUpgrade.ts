// Copyright 2026 Adobe. All rights reserved.
import {
  COMPONENT_SIZING_DEFAULTS,
  upgradeTypographySizingDocument,
  upgradeSizingSettings,
} from "../foundations/componentSizing";
import { isModeSetList, MODE_SET_DEFAULTS } from "../modes/model";
import { isStructuresDocument } from "../structures/model";
import { synchronizeVariantIdentities } from "../structures/semanticIdentity";

export function upgradeSizingFields(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const settings = source.foundationParameterSettings;
  return {
    ...source,
    typography: upgradeTypographySizingDocument(source.typography),
    ...(!("componentSizing" in source) && {
      componentSizing: { ...COMPONENT_SIZING_DEFAULTS },
    }),
    ...(settings && typeof settings === "object"
      ? {
          foundationParameterSettings: upgradeSizingSettings(settings),
        }
      : {}),
  };
}

export function upgradeComponentSizingSnapshot(
  value: unknown,
  identities = new Map<string, string>(),
  reportIssue: (message: string) => void = console.warn,
): unknown {
  const upgraded = upgradeSizingFields(value);
  if (!upgraded || typeof upgraded !== "object") return upgraded;
  const source = upgraded as Record<string, unknown>;
  if (!isModeSetList(source.modeSets)) return upgraded;
  const sets = source.modeSets;
  const shipped = MODE_SET_DEFAULTS.find(
    (set) => set.id === "mode-set-platform-scale",
  )!;
  const previous = sets.find((set) => set.id === shipped.id);
  if (!previous) return upgraded;
  const capabilities = shipped.authoringCapabilities!;
  const neutral =
    (previous.key === shipped.key || previous.key === "platformScale") &&
    previous.defaultModeId === shipped.defaultModeId &&
    previous.modes.length === 1 &&
    previous.modes[0].id === shipped.defaultModeId &&
    (previous.modes[0].key === shipped.modes[0].key ||
      previous.modes[0].key === "default") &&
    Object.keys(previous.modes[0].foundations).length === 0 &&
    !previous.authoringCapabilities?.length;
  if (capabilities.every((id) => previous.authoringCapabilities?.includes(id)))
    return upgraded;
  const conflict = sets.some(
    (set) =>
      set.id !== previous.id &&
      set.authoringCapabilities?.some((id) => capabilities.includes(id)),
  );
  if (!neutral || conflict) {
    reportIssue(
      "Scale settings were preserved. Configure Component size and Base text size in the customized mode set; automatic setup would replace authored modes or parameter ownership.",
    );
    return upgraded;
  }
  const modeSets = sets.map((set) =>
    set.id === previous.id
      ? {
          ...set,
          name: set.name === "Platform scale" ? "Scale" : set.name,
          authoringCapabilities: [...capabilities],
          modes: [
            {
              ...set.modes[0],
              name:
                set.modes[0].name === "Default" ? "desktop" : set.modes[0].name,
            },
            structuredClone(
              shipped.modes.find((mode) => mode.key === "mobile")!,
            ),
          ],
        }
      : set,
  );
  return {
    ...source,
    modeSets,
    ...(isStructuresDocument(source.structures) && {
      structures: synchronizeVariantIdentities(
        source.structures,
        modeSets,
        (conceptId, context) => {
          const key = `component-sizing:${conceptId}:${context}`;
          const id = identities.get(key) ?? crypto.randomUUID();
          identities.set(key, id);
          return id;
        },
      ),
    }),
  };
}
