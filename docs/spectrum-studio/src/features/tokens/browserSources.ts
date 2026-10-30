// Copyright 2026 Adobe. All rights reserved.
import { isFoundationPublished } from "../foundations/types";
import {
  typographyTokenGroups,
  typographyTokenName,
  type TypographyNamingContext,
} from "../typography/typographyTokens";
import { isPaletteToken, tokenDisplayName, type ResolvedToken } from "./model";
import type { GeneratedTypographyToken } from "../typography/model";
import type { GeneratedSpacingValue, SpacingScale } from "../spacing/model";
import { temporaryTokenGroupForPrimitiveColorTokens } from "./view/temporaryTokenTermOrdering";
import type { BrowserTokenSource } from "./browserModel";
import {
  taxonomyColorSourceId,
  taxonomyDimensionSourceId,
  taxonomyPaletteSourceId,
  withTaxonomyProjection,
} from "../taxonomy/model";
import type { ColorSystemDocument } from "../color-system/model";
import type { TaxonomyDocument } from "../taxonomy/model";
import { governedColorContext } from "../taxonomy/colorGovernance";
import { governedFoundationContext } from "../taxonomy/foundationGovernance";
import type { DimensionScope } from "../taxonomy/model";
import { dimensionIssues } from "../scales/issues";
import type { Rule } from "../logic/model";

export function browserSourcesFromOutputs(
  colors: ResolvedToken[],
  typographyTokens: GeneratedTypographyToken[],
  spacingScales: { scale: SpacingScale; values: GeneratedSpacingValue[] }[],
  sizeScales: { scale: SpacingScale; values: GeneratedSpacingValue[] }[] = [],
  typographyNaming?: TypographyNamingContext,
  colorNaming?: {
    document: ColorSystemDocument;
    registry: TaxonomyDocument;
    rules?: readonly Rule[];
  },
  radiusScales: { scale: SpacingScale; values: GeneratedSpacingValue[] }[] = [],
  options: { includeUnpublished?: boolean } = {},
): BrowserTokenSource[] {
  const project = () =>
    sourceBatch(
      colors,
      typographyTokens,
      spacingScales,
      sizeScales,
      typographyNaming,
      colorNaming,
      radiusScales,
      options,
    );
  const registry = typographyNaming?.registry ?? colorNaming?.registry;
  return registry ? withTaxonomyProjection(registry, project) : project();
}

function sourceBatch(
  colors: ResolvedToken[],
  typographyTokens: GeneratedTypographyToken[],
  spacingScales: { scale: SpacingScale; values: GeneratedSpacingValue[] }[],
  sizeScales: { scale: SpacingScale; values: GeneratedSpacingValue[] }[],
  typographyNaming: TypographyNamingContext | undefined,
  colorNaming:
    | {
        document: ColorSystemDocument;
        registry: TaxonomyDocument;
        rules?: readonly Rule[];
      }
    | undefined,
  radiusScales: { scale: SpacingScale; values: GeneratedSpacingValue[] }[],
  options: { includeUnpublished?: boolean },
): BrowserTokenSource[] {
  const colorSources: BrowserTokenSource[] =
    temporaryTokenGroupForPrimitiveColorTokens(colors).flatMap((group) =>
      group.tokens.map((token) => ({
        id: token.uuid,
        type: "colors",
        groupId: group.id,
        groupLabel: group.label,
        name: tokenDisplayName(token.name),
        value: token.value,
        generatedName: tokenDisplayName(token.generated.name),
        generatedValue: token.generated.value,
        unit: "",
        legacyOverridden: token.valueOverridden,
        legacyStale: token.stale,
        taxonomyEvidence: {
          property: "color",
          colorFamily: token.generated.name.colorName,
          ...(token.generated.name.contrastValue
            ? { contrastLabel: token.generated.name.contrastValue }
            : {}),
        },
        taxonomySource: colorNaming
          ? governedColorContext(
              colorNaming.document,
              colorNaming.registry,
              token.source.scaleId,
              token.source.contrastId,
              colorNaming.rules,
            )
          : isPaletteToken(token)
            ? { id: taxonomyPaletteSourceId(token.source.contrastId) }
            : {
                id: taxonomyColorSourceId(token.source.scaleId),
                stepId: token.source.contrastId,
              },
        ...(isPaletteToken(token) && {
          paletteColorId: token.source.contrastId,
        }),
      })),
    );
  const typography: BrowserTokenSource[] = typographyTokenGroups(
    typographyTokens,
    typographyNaming,
  ).flatMap((group) =>
    typographyTokens.map((token) => ({
      id: `typography-${group.id}-${token.scale}`,
      type: "typography",
      groupId: group.id,
      groupLabel: group.label,
      name: typographyTokenName(group, token, typographyNaming),
      generatedName: typographyTokenName(group, token, typographyNaming),
      value: group.value(token),
      generatedValue: group.value(token),
      unit: group.isUnitless ? "" : "px",
      ...(group.measurement && { measurement: group.measurement }),
      ...(!group.isUnitless && {
        displayUnit: typographyNaming?.outputUnit ?? "rem",
      }),
      taxonomyEvidence: {
        property: "typography",
        typographyMetric: group.id,
        scaleIndex: token.scale,
      },
      taxonomySource: typographyNaming
        ? governedFoundationContext(
            typographyNaming.registry,
            "typography",
            typographyNaming.names![group.id]!,
            `typography:${group.id}`,
            token.scale,
          )
        : { id: `typography:${group.id}`, stepId: String(token.scale) },
    })),
  );
  const dimensions: [DimensionScope, typeof spacingScales][] = [
    ["spacing", spacingScales],
    ["size", sizeScales],
    ["radius", radiusScales],
  ];
  const dimensionSources = dimensions.flatMap(([domain, scales]) =>
    scales
      .filter(
        ({ scale }) =>
          options.includeUnpublished || isFoundationPublished(scale),
      )
      .flatMap(({ scale, values }) =>
        values.map(
          (token): BrowserTokenSource => ({
            id: `${domain}-${scale.id}-${token.step}`,
            type: domain,
            groupId: scale.id,
            groupLabel: scale.name,
            name: token.name,
            generatedName: token.name,
            value: token.value,
            generatedValue: token.value,
            unit: "px",
            ...(domain === "radius" &&
              dimensionIssues([token], "non-negative").variant ===
                "negative" && {
                validationError:
                  "Unavailable radius: values must be finite and non-negative.",
              }),
            taxonomyEvidence: {
              property: domain,
              foundationScale: scale.name,
              scaleIndex: token.step,
            },
            taxonomySource: typographyNaming
              ? governedFoundationContext(
                  typographyNaming.registry,
                  domain,
                  scale.nameRef!,
                  taxonomyDimensionSourceId(domain, scale.id),
                  token.step,
                )
              : {
                  id: taxonomyDimensionSourceId(domain, scale.id),
                  stepId: String(token.step),
                },
          }),
        ),
      ),
  );
  return [...colorSources, ...typography, ...dimensionSources];
}
