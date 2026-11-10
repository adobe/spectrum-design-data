// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import { isFoundationPublished } from "../../foundations/types";
import { resolveBrowserTokens } from "../../tokens/browserResolution";
import type { BrowserTokenSource } from "../../tokens/browserModel";
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

export function categoricalMemberSources(
  scale: CategoricalDataVisScale,
  swatches: readonly UiSwatch[],
  output?: ColorOutputSettings,
): BrowserTokenSource[] {
  return scale.members.map((member, index) => {
    let value = "",
      generatedValue = "",
      overridden = false,
      validationError: string | undefined;
    try {
      ({ value, generatedValue, overridden } = categoricalMemberValue(
        scale,
        member.id,
        swatches,
        output,
      ));
    } catch (error) {
      validationError = error instanceof Error ? error.message : String(error);
    }
    const name = `${scale.name} ${index + 1}`;
    return {
      id: dataVisMemberId(scale.id, member.id),
      type: "colors",
      tier: "primitive",
      groupId: scale.id,
      groupLabel: scale.name,
      name,
      generatedName: name,
      value,
      generatedValue,
      unit: "",
      legacyOverridden: overridden,
      dataVis: {
        scaleId: scale.id,
        memberId: member.id,
        ordinal: index + 1,
        source: member.source,
        hidden: !isFoundationPublished(scale),
        static: !!scale.staticColors,
      },
      ...(validationError && { validationError }),
    };
  });
}

export function resolvedCategoricalColors(
  document: ColorSystemDocument,
  swatches: readonly UiSwatch[],
  edits: BrowserTokenEdits,
  modeKey: string,
  {
    includeUnpublished = false,
    referenceSources = [],
  }: {
    includeUnpublished?: boolean;
    referenceSources?: BrowserTokenSource[];
  } = {},
) {
  const sources = document.dataVisScales.flatMap((scale) =>
    scale.kind === "categorical" &&
    (includeUnpublished || isFoundationPublished(scale))
      ? categoricalMemberSources(scale, swatches, document.settings.colorOutput)
      : [],
  );
  return resolveBrowserTokens([...referenceSources, ...sources], edits, modeKey)
    .filter((token) => !!token.dataVis)
    .map((token) => {
      if (token.validationError) throw new Error(token.validationError);
      if (
        typeof token.value !== "string" ||
        typeof token.generatedValue !== "string"
      )
        throw new Error("A categorical member requires a concrete color.");
      const color = concreteColor(token.value);
      return {
        id: token.sourceId ?? token.id,
        name: token.name,
        value: token.lifecycle?.frozen
          ? token.value
          : serializeOutputColor(color, document.settings.colorOutput),
        generatedValue: token.generatedValue,
        valueOverridden: token.valueOverridden,
      };
    });
}
