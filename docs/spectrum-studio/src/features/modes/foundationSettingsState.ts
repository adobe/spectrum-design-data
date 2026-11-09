// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { modeSetsAtom, writeModeSources } from "./state";
import { capabilityOwners } from "./ownership";
import type { ModeSet } from "./model";
import type { FoundationId } from "./parameters";
import {
  foundationParameterDefaults,
  isFoundationParameterSettings,
  previewIdsForCapability,
  removeModeCapability,
  restoreModeCapability,
  type FoundationParameterSettings,
  type FoundationSettingId,
} from "./foundationSettings";
import { clearPreviewParametersAtom } from "./previewState";
import { upgradeSizingSettings } from "../foundations/componentSizing";

export const foundationParameterSettingsAtom =
  persistedAtom<FoundationParameterSettings>({
    key: "foundations/parameter-settings",
    schemaVersion: 2,
    initialize: foundationParameterDefaults,
    validate: isFoundationParameterSettings,
    migrate: (data, version) => {
      const upgraded = version === 1 ? upgradeSizingSettings(data) : data;
      return isFoundationParameterSettings(upgraded) ? upgraded : null;
    },
  });

export const rememberedModeSettingsAtom = atom<
  Partial<Record<FoundationSettingId, ModeSet[]>>
>({});

export const clearRememberedModeSettingsAtom = atom(
  null,
  (
    get,
    set,
    input?: string | { modeSetId: string; foundation: FoundationId },
  ) => {
    if (!input) {
      set(rememberedModeSettingsAtom, {});
      return;
    }
    set(
      rememberedModeSettingsAtom,
      Object.fromEntries(
        Object.entries(get(rememberedModeSettingsAtom)).map(([id, sets]) => [
          id,
          sets.filter(
            (modeSet) =>
              modeSet.id !==
                (typeof input === "string" ? input : input.modeSetId) ||
              (typeof input !== "string" &&
                !id.startsWith(`${input.foundation}.`)),
          ),
        ]),
      ),
    );
  },
);

export const updateFoundationParameterSettingAtom = atom(
  null,
  (
    get,
    set,
    input: {
      id: FoundationSettingId;
      kind: "modal" | "adaptive";
      value: boolean;
    },
  ) => {
    const settings = get(foundationParameterSettingsAtom);
    if (settings[input.id][input.kind] === input.value) return;
    const sets = get(modeSetsAtom);
    const remembered = get(rememberedModeSettingsAtom);
    let nextSets = sets;
    let nextRemembered = remembered;
    if (input.kind === "modal") {
      if (!input.value) {
        nextRemembered = {
          ...remembered,
          [input.id]: sets.filter((modeSet) =>
            modeSet.authoringCapabilities?.includes(input.id),
          ),
        };
        nextSets = sets.map((modeSet) =>
          removeModeCapability(modeSet, input.id),
        );
      } else {
        const owner = capabilityOwners(sets)[input.id];
        if (owner && remembered[input.id]?.some((item) => item.id !== owner))
          throw new Error(
            "Another mode set now controls this parameter. Its previous settings cannot be restored.",
          );
        nextSets = sets.map((modeSet) => {
          const prior = remembered[input.id]?.find(
            (item) => item.id === modeSet.id,
          );
          return prior && (!owner || owner === modeSet.id)
            ? restoreModeCapability(modeSet, prior, input.id)
            : modeSet;
        });
        const next = { ...remembered };
        delete next[input.id];
        nextRemembered = next;
      }
    }
    const nextSettings = {
      ...settings,
      [input.id]: { ...settings[input.id], [input.kind]: input.value },
    };
    if (input.kind === "modal")
      writeModeSources(get, set, nextSets, undefined, nextSettings);
    else set(foundationParameterSettingsAtom, nextSettings);
    set(rememberedModeSettingsAtom, nextRemembered);
    set(clearPreviewParametersAtom, previewIdsForCapability(input.id));
  },
);
