// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import { isFoundationPublished } from "../../foundations/types";
import { resolveToken } from "../../tokens/model";
import { resolveBrowserColorToken } from "../../tokens/colorResolution";
import type { BrowserTokenEdits } from "../../tokens/browserEditTypes";
import { dataVisMemberId } from "./identity";
import { concreteColor } from "./colors";
import { frozenColorValue, type CategoricalDataVisScale } from "./model";
import { linkedUiSwatch, type UiSwatch } from "./resolution";
import { serializeOutputColor } from "../outputSerialization";
import type { ColorOutputSettings } from "../outputSettings";

export function categoricalMemberValue(
  scale: CategoricalDataVisScale,
  memberId: string,
  swatches: readonly UiSwatch[],
  output?: ColorOutputSettings,
) {
  const member = scale.members.find((member) => member.id === memberId);
  if (!member) throw new Error("This categorical member is unavailable.");
  if (!scale.staticColors) {
    const value = linkedUiSwatch(member.source, swatches).value;
    return { value, generatedValue: value, overridden: false };
  }
  const color = scale.staticColors.find((color) => color.id === memberId);
  if (!color)
    throw new Error("This categorical member has no captured Static color.");
  const format = (value: string) =>
    output ? serializeOutputColor(concreteColor(value), output) : value;
  const value = format(frozenColorValue(color));
  concreteColor(value);
  return {
    value,
    generatedValue: format(color.value),
    overridden: color.overrideValue !== undefined,
  };
}

export function resolvedCategoricalColors(
  document: ColorSystemDocument,
  swatches: readonly UiSwatch[],
  edits: BrowserTokenEdits,
  modeKey: string,
  { includeUnpublished = false }: { includeUnpublished?: boolean } = {},
) {
  return document.dataVisScales.flatMap((scale) =>
    scale.kind === "categorical" &&
    (includeUnpublished || isFoundationPublished(scale))
      ? scale.members.map((member, index) => {
          const output = categoricalMemberValue(
              scale,
              member.id,
              swatches,
              document.settings.colorOutput,
            ),
            id = dataVisMemberId(scale.id, member.id);
          const generated = {
            uuid: id,
            name: { colorName: scale.name, contrastValue: String(index + 1) },
            value: output.generatedValue,
            source: {
              tokenType: "color" as const,
              scaleId: scale.id,
              contrastId: member.id,
            },
          };
          const token = resolveToken(generated, undefined);
          const final = scale.staticColors
            ? {
                ...token,
                value: output.value,
                valueOverridden: output.overridden,
              }
            : resolveBrowserColorToken(token, edits, modeKey, document);
          concreteColor(final.value);
          return {
            id,
            name: `${scale.name} ${index + 1}`,
            value: final.value,
            generatedValue: output.generatedValue,
            valueOverridden: final.valueOverridden,
          };
        })
      : [],
  );
}
