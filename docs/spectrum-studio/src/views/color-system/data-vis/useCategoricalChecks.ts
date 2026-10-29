// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import {
  dataVisContextFingerprintAtom,
  dataVisInputDocumentAtom,
  resolvedCategoricalTokensAtom,
} from "../../../features/color-system/data-vis/state";
import { dataVisMemberId } from "../../../features/color-system/data-vis/identity";
import { dataVisBackground } from "../../../features/color-system/data-vis/resolution";
import { usePaletteInspections } from "../../../features/color-system/data-vis/usePaletteInspections";
import type {
  PaletteInspection,
  PaletteInspectionRequest,
} from "../../../features/color-system/data-vis/workerRuntime";

export function useCategoricalChecks() {
  const document = useAtomValue(dataVisInputDocumentAtom),
    tokens = useAtomValue(resolvedCategoricalTokensAtom);
  const fingerprint = useAtomValue(dataVisContextFingerprintAtom);
  const inputs = useMemo(() => {
    const palettes: PaletteInspectionRequest[] = [],
      unavailable: Record<string, PaletteInspection> = {};
    for (const scale of document.dataVisScales)
      if (scale.kind === "categorical") {
        try {
          const members = scale.members.map((member, index) => {
            const token = tokens.find(
              (token) => token.id === dataVisMemberId(scale.id, member.id),
            );
            if (
              !token ||
              token.validationError ||
              typeof token.value !== "string"
            )
              throw new Error(
                token?.validationError ??
                  "A categorical output is unavailable.",
              );
            return {
              id: token.id,
              source: member.source,
              label: `Color ${index + 1}`,
              value: token.value,
              generatedValue: token.value,
              manuallyOverridden: token.valueOverridden,
            };
          });
          palettes.push({
            id: scale.id,
            members,
            preferences: scale.preferences,
            background: dataVisBackground(document),
            gamut: renderGamutForOutput(document.settings.colorOutput),
          });
        } catch (failure) {
          unavailable[scale.id] = {
            status: "error",
            error: failure instanceof Error ? failure.message : String(failure),
          };
        }
      }
    return { palettes, unavailable };
  }, [document, tokens]);
  const state = usePaletteInspections(inputs.palettes, fingerprint);
  return state.status === "ready"
    ? { ...state, reports: { ...inputs.unavailable, ...state.reports } }
    : state;
}
import { renderGamutForOutput } from "../../../features/color-system/colorMath";
