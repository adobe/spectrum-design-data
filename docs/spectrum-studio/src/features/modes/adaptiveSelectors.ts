// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { FOUNDATION_PARAMETERS, parameterOwners } from "./parameters";
import { modeSetsAtom } from "./state";
import { foundationParameterSettingsAtom } from "./foundationSettingsState";
import type { FoundationSettingId } from "./foundationSettings";

export const effectiveParameterOwnersAtom = atom((get) => ({
  ...parameterOwners(get(modeSetsAtom)),
}));

export const adaptiveParametersAtom = atom((get) => {
  const settings = get(foundationParameterSettingsAtom);
  return FOUNDATION_PARAMETERS.filter(
    (parameter) =>
      settings[parameter.id as FoundationSettingId]?.adaptive === true,
  );
});
