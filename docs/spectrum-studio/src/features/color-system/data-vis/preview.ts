// Copyright 2026 Adobe. All rights reserved.
import { atom, type ExtractAtomValue } from "jotai";
import {
  dataVisContextFingerprintAtom,
  dataVisContinuousOutputsAtom,
  dataVisInputDocumentAtom,
  dataVisPrimitiveColorsAtom,
  dataVisUiSwatchesAtom,
  resolvedCategoricalTokensAtom,
  type ContinuousOutput,
} from "./state";
import {
  compileContinuousScale,
  continuousSamples,
  type ContinuousScale,
} from "./continuous";
import { categoricalPreviewMembers } from "./categoricalPreview";
import type { DataVisScale } from "./model";
import { quantitativeExample } from "./examples";
import type { DataVisObservation } from "./analysis";
import { dataVisBackground } from "./resolution";
import { renderGamutForOutput } from "../colorMath";
import type {
  PaletteInspection,
  PaletteInspectionRequest,
} from "./workerRuntime";

type ContinuousPreview = Omit<ContinuousScale, "evaluate"> & {
  output: NonNullable<Parameters<typeof compileContinuousScale>[2]>;
  samples: ReturnType<typeof continuousSamples>;
};
export type DataVisDisplay = { definition: DataVisScale } & (
  | {
      status: "ready";
      observations: DataVisObservation[];
      continuous?: ContinuousPreview;
      examples?: ReturnType<typeof quantitativeExample>;
    }
  | { status: "error"; error: string }
);

export function restoreContinuousPreview(scale: ContinuousPreview) {
  return compileContinuousScale(
    { id: scale.id, kind: scale.kind },
    scale.points,
    scale.output,
  );
}

export const dataVisPreviewAtom = atom((get) => {
  const document = get(dataVisInputDocumentAtom);
  const outputs = get(dataVisContinuousOutputsAtom);
  const categorical = get(resolvedCategoricalTokensAtom);
  const palettes: PaletteInspectionRequest[] = [];
  const unavailable: Record<string, PaletteInspection> = {};
  const displays = document.dataVisScales.map((definition): DataVisDisplay => {
    if (definition.kind !== "categorical") {
      const output = outputs.find((output) =>
        output.status === "ready"
          ? output.scale.id === definition.id
          : output.id === definition.id,
      );
      if (!output || output.status === "error")
        return {
          definition,
          status: "error",
          error: output?.error ?? "This continuous output is unavailable.",
        };
      return {
        definition,
        status: "ready",
        examples: quantitativeExample(definition.kind, output.scale.evaluate),
        continuous: {
          id: output.scale.id,
          kind: output.scale.kind,
          points: output.scale.points,
          diagnostics: output.scale.diagnostics,
          output: document.settings.colorOutput,
          samples: continuousSamples(output.scale),
        },
        observations: continuousSamples(output.scale, 9).map((sample) => ({
          id: String(sample.position),
          label: `${Number((sample.position * 100).toFixed(3))}%`,
          ...sample,
        })),
      };
    }
    try {
      const members = categoricalPreviewMembers(definition, categorical);
      palettes.push({
        id: definition.id,
        members,
        preferences: definition.preferences,
        background: dataVisBackground(document),
        gamut: renderGamutForOutput(document.settings.colorOutput),
      });
      return {
        definition,
        status: "ready",
        observations: members.map((member, index) => ({
          id: definition.members[index].id,
          label: member.label,
          position: index + 1,
          value: member.value,
        })),
      };
    } catch (failure) {
      const error =
        failure instanceof Error ? failure.message : String(failure);
      unavailable[definition.id] = { status: "error", error };
      return { definition, status: "error", error };
    }
  });
  return {
    document,
    displays,
    palettes,
    unavailable,
    categorical,
    swatches: get(dataVisUiSwatchesAtom),
    primitives: get(dataVisPrimitiveColorsAtom),
    fingerprint: get(dataVisContextFingerprintAtom),
  };
});
export type DataVisPreview = ExtractAtomValue<typeof dataVisPreviewAtom>;

export function restoreDataVisPreview(preview: DataVisPreview) {
  const outputs = preview.displays.flatMap((display): ContinuousOutput[] => {
    if (display.definition.kind === "categorical") return [];
    if (display.status === "error")
      return [
        { status: "error", id: display.definition.id, error: display.error },
      ];
    return display.continuous
      ? [
          {
            status: "ready",
            scale: restoreContinuousPreview(display.continuous),
          },
        ]
      : [];
  });
  return { ...preview, outputs };
}
export const browserDataVisPreviewAtom = atom((get) =>
  restoreDataVisPreview(get(dataVisPreviewAtom)),
);
export type BrowserDataVisPreview = ReturnType<typeof restoreDataVisPreview>;
