// Copyright 2026 Adobe. All rights reserved.
import type { TypographyDocument } from "./model";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "./model";
import { generateTypography } from "./typographyGeneration";
import {
  typographyTokenValues,
  type TypographyNamingContext,
} from "./typographyTokens";
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import { SCALE_TYPE_DEFAULTS, type ScaleType } from "../scales/scaleType";
import type { Interpolation } from "../scales/interpolationDefinition";
import { TYPOGRAPHY_INTERPOLATIONS } from "./lineHeightInterpolations";
import { formatTypographyLength, formatTypographyNumber } from "./units";
import {
  withTaxonomyProjection,
  type TaxonomyDocument,
} from "../taxonomy/model";

export const TEXT_ZOOM_ATTRIBUTE = "data-text-zoom";

function declarations(
  document: TypographyDocument,
  textZoom: number,
  indent: string,
  rules: readonly Rule[],
  scaleTypes: readonly ScaleType[],
  interpolations: readonly Interpolation[],
  taxonomy?: TaxonomyDocument,
  naming?: TypographyNamingContext,
) {
  return typographyTokenValues(
    generateTypography(document, textZoom, rules, scaleTypes, interpolations),
    taxonomy,
    naming,
  ).map(
    ({ group, name, value }) =>
      `${indent}--${name}: ${group.isUnitless ? formatTypographyNumber(value) : formatTypographyLength(value, document.outputUnit)};`,
  );
}

/** Rem values keep the browser's text size in effect, so text zoom multiplies on top of it. */
export function buildTypographyCss(
  document: TypographyDocument,
  {
    scope,
    purpose = "publishing",
    rules = RULE_DEFAULTS,
    scaleTypes = SCALE_TYPE_DEFAULTS,
    interpolations = TYPOGRAPHY_INTERPOLATIONS,
    taxonomy,
    registry,
  }: {
    scope?: string;
    purpose?: "authoring" | "publishing";
    rules?: readonly Rule[];
    scaleTypes?: readonly ScaleType[];
    interpolations?: readonly Interpolation[];
    taxonomy?: TaxonomyDocument;
    registry?: TaxonomyDocument;
  } = {},
) {
  if (purpose === "publishing" && document.hideFromPublishing) return "";
  const activeRegistry = registry ?? taxonomy;
  const build = () => {
    const naming = activeRegistry
      ? { registry: activeRegistry, names: document.metricNames }
      : undefined;
    const zoomSelector = (textZoom: number) => {
      const attribute = `[${TEXT_ZOOM_ATTRIBUTE}="${textZoom}"]`;
      return scope ? `${scope}${attribute}, ${scope} ${attribute}` : attribute;
    };
    const lines = [
      `${scope ?? ":root"}, ${zoomSelector(document.textZoom)} {`,
      ...declarations(
        document,
        document.textZoom,
        "  ",
        rules,
        scaleTypes,
        interpolations,
        taxonomy,
        naming,
      ),
      "}",
    ];
    for (let textZoom = TEXT_ZOOM_MIN; textZoom <= TEXT_ZOOM_MAX; textZoom++) {
      if (textZoom === document.textZoom) continue;
      lines.push(
        "",
        `${zoomSelector(textZoom)} {`,
        ...declarations(
          document,
          textZoom,
          "  ",
          rules,
          scaleTypes,
          interpolations,
          taxonomy,
          naming,
        ),
        "}",
      );
    }
    return lines.join("\n");
  };
  const fromRegistry = () =>
    activeRegistry ? withTaxonomyProjection(activeRegistry, build) : build();
  return taxonomy && taxonomy !== activeRegistry
    ? withTaxonomyProjection(taxonomy, fromRegistry)
    : fromRegistry();
}
