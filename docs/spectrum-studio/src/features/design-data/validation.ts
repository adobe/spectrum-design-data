// Copyright 2026 Adobe. All rights reserved.
import Ajv from "ajv";
import schema from "../../data/design-system.schema.json" with { type: "json" };
import { isParameterBinding } from "../scales/interpolation";
import {
  isScaleType,
  scaleTypeIssues,
  type ScaleType,
} from "../scales/scaleType";
import {
  isInterpolation,
  interpolationIssues,
} from "../scales/interpolationDefinition";
import type {
  CanonicalAuthoringDataset,
  CompleteCanonicalDesignSystemDataset,
  CompleteDesignSystemDataset,
} from "./model";
import { taxonomyIssues } from "../taxonomy/model";
import {
  assertRegisteredSourceNames,
  canonicalColorDocument,
  canonicalDimensionDocument,
  resolveNamedSource,
  resolveColorSourceNames,
} from "../taxonomy/naming";
import { typographyTokenGroups } from "../typography/typographyTokens";
import { isTypographyDocument } from "../typography/model";
import { assertFoundationGovernance } from "../taxonomy/foundationGovernance";
import { DIMENSION_SCOPES } from "../taxonomy/model";
import { isElevationDocument } from "../elevation/model";
import { generateElevation } from "../elevation/generate";
import { registeredSourceName } from "../taxonomy/naming";
import {
  assertStructureReferences,
  assertStructureTaxonomy,
} from "../structures/model";
import { availablePrimitiveReferences } from "../tokens/primitiveIdentity";
import { dataVisSourceIssues } from "../color-system/data-vis/references";
import { assertComponentDocument } from "../components/validation";
import { isColorOutputSettings } from "../color-system/outputSettings";
import { isOpacityDocument } from "../opacity/model";

const validateShape = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
}).compile<CanonicalAuthoringDataset>(schema);

export function canonicalDesignSystemDataset(
  dataset: CompleteDesignSystemDataset,
): CompleteCanonicalDesignSystemDataset {
  const { foundations } = dataset.system;
  const metrics = foundations.typography.metricNames;
  if (
    !metrics ||
    typographyTokenGroups(foundations.typography).some(
      (group) => !metrics[group.id],
    )
  )
    throw new DatasetValidationError([
      "Every native typography metric must reference a registered name.",
    ]);
  return {
    ...dataset,
    system: {
      ...dataset.system,
      foundations: {
        ...(foundations.opacity && { opacity: foundations.opacity }),
        color: canonicalColorDocument(foundations.color),
        spacing: canonicalDimensionDocument(foundations.spacing),
        size: canonicalDimensionDocument(foundations.size),
        radius: canonicalDimensionDocument(foundations.radius),
        elevation: foundations.elevation,
        typography: { ...foundations.typography, metricNames: { ...metrics } },
      },
    },
  };
}

export class DatasetValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Invalid authoring dataset:\n${issues.join("\n")}`);
    this.name = "DatasetValidationError";
  }
}

export function composeDesignSystemDefaults(
  input: unknown,
  formulaDefaults: readonly ScaleType[],
): CompleteDesignSystemDataset {
  if (!validateShape(input)) {
    throw new DatasetValidationError(
      (validateShape.errors ?? []).map(
        (error) => `${error.instancePath || "/"}: ${error.message}`,
      ),
    );
  }
  const dataset = structuredClone(input);
  const taxonomy = dataset.system.taxonomy;
  let result: CompleteDesignSystemDataset;
  try {
    result = {
      ...dataset,
      system: {
        ...dataset.system,
        taxonomy,
        foundations: {
          ...(dataset.system.foundations.opacity && {
            opacity: dataset.system.foundations.opacity,
          }),
          color: resolveColorSourceNames(
            {
              ...dataset.system.foundations.color,
              palette: dataset.system.foundations.color.palette.map((source) =>
                resolveNamedSource(source, taxonomy, "colors"),
              ),
              scales: dataset.system.foundations.color.scales.map((source) =>
                resolveNamedSource(source, taxonomy, "colors"),
              ),
              dataVisScales: dataset.system.foundations.color.dataVisScales.map(
                (source) =>
                  source.kind === "categorical"
                    ? resolveNamedSource(source, taxonomy, "colors")
                    : resolveNamedSource(source, taxonomy, "colors"),
              ),
              surfaces: dataset.system.foundations.color.surfaces.map(
                (source) => resolveNamedSource(source, taxonomy, "colors"),
              ),
            },
            taxonomy,
          ),
          typography: dataset.system.foundations.typography,
          spacing: {
            ...dataset.system.foundations.spacing,
            scales: dataset.system.foundations.spacing.scales.map((source) =>
              resolveNamedSource(source, taxonomy, "spacing"),
            ),
          },
          size: {
            ...dataset.system.foundations.size,
            scales: dataset.system.foundations.size.scales.map((source) =>
              resolveNamedSource(source, taxonomy, "size"),
            ),
          },
          radius: {
            ...dataset.system.foundations.radius,
            scales: dataset.system.foundations.radius.scales.map((source) =>
              resolveNamedSource(source, taxonomy, "radius"),
            ),
          },
          elevation: dataset.system.foundations.elevation,
        },
        scaleTypes:
          "scaleTypes" in dataset.system
            ? dataset.system.scaleTypes
            : structuredClone([...formulaDefaults]),
      },
    };
  } catch (failure) {
    throw new DatasetValidationError([
      failure instanceof Error ? failure.message : String(failure),
    ]);
  }
  const issues: string[] = taxonomyIssues(result.system.taxonomy).map(
    (issue) => `/system/taxonomy: ${issue}`,
  );
  if (
    result.system.foundations.opacity &&
    !isOpacityDocument(result.system.foundations.opacity)
  )
    issues.push("/system/foundations/opacity: invalid opacity configuration");
  if (result.system.components) {
    try {
      assertComponentDocument(result.system.components, taxonomy);
    } catch (failure) {
      issues.push(failure instanceof Error ? failure.message : String(failure));
    }
  }
  try {
    assertStructureTaxonomy(result.system.structures, taxonomy);
    assertStructureReferences(
      result.system.structures,
      availablePrimitiveReferences(result.system.foundations),
      undefined,
      result.system.foundations.typography,
    );
  } catch (failure) {
    issues.push(failure instanceof Error ? failure.message : String(failure));
  }
  if (!isElevationDocument(result.system.foundations.elevation))
    issues.push(
      "/system/foundations/elevation: invalid Elevation configuration",
    );
  else {
    try {
      registeredSourceName(
        result.system.taxonomy,
        result.system.foundations.elevation.name,
        "elevation",
      );
      generateElevation(
        {
          ...result.system.foundations.elevation,
          layers: result.system.foundations.elevation.layers.map((layer) => {
            if (!layer.opacityTokenId) return layer;
            const level = result.system.foundations.opacity?.levels.find(
              (level) => level.id === layer.opacityTokenId,
            );
            if (!level)
              throw new Error(
                `${layer.label}: unresolved opacity token "${layer.opacityTokenId}".`,
              );
            const { opacityTokenId: _reference, ...manual } = layer;
            void _reference;
            return { ...manual, manualOpacity: level.value };
          }),
        },
        result.system.scaleTypes,
      );
    } catch (failure) {
      issues.push(failure instanceof Error ? failure.message : String(failure));
    }
  }
  try {
    assertFoundationGovernance(
      result.system.foundations,
      taxonomy,
      result.system.rules,
    );
    for (const scope of DIMENSION_SCOPES)
      assertRegisteredSourceNames(
        result.system.foundations[scope].scales,
        taxonomy,
        scope,
      );
    assertRegisteredSourceNames(
      typographyTokenGroups(result.system.foundations.typography).map(
        (group) => ({
          id: group.id,
          name: group.id,
          nameRef: result.system.foundations.typography.metricNames?.[group.id],
        }),
      ),
      taxonomy,
      "typography",
    );
  } catch (failure) {
    issues.push(failure instanceof Error ? failure.message : String(failure));
  }
  const unique = (items: readonly { id: string }[], location: string) => {
    const ids = new Set<string>();
    for (const item of items) {
      if (!item.id.trim() || ids.has(item.id))
        issues.push(`${location}: empty or duplicate id "${item.id}"`);
      ids.add(item.id);
    }
    return ids;
  };
  const reference = (
    id: string,
    ids: ReadonlySet<string>,
    location: string,
  ) => {
    if (!ids.has(id)) issues.push(`${location}: unresolved reference "${id}"`);
  };
  const {
    foundations,
    modeSets,
    platforms,
    rules,
    interpolations,
    scaleTypes,
    adaptiveClaims,
  } = result.system;
  if (!isColorOutputSettings(foundations.color.settings.colorOutput))
    issues.push(
      "/system/foundations/color/settings/colorOutput: invalid gamut/format combination",
    );
  issues.push(...dataVisSourceIssues(foundations.color, modeSets));
  if (!result.dataset.id.trim()) issues.push("/dataset/id: must not be empty");
  const platformIds = unique(platforms, "/system/platforms");
  const modeSetIds = unique(modeSets, "/system/modeSets");
  unique(
    modeSets.map((modeSet) => ({ id: modeSet.key })),
    "/system/modeSets/keys",
  );
  unique(
    modeSets.flatMap((modeSet) => modeSet.modes),
    "/system/modeSets/modes",
  );
  unique(rules, "/system/rules");
  const roundingRuleIds = new Set(
    rules.filter((rule) => rule.type === "rounding").map((rule) => rule.id),
  );
  const formulaIds = unique(scaleTypes, "/system/scaleTypes");
  const interpolationIds = unique(interpolations, "/system/interpolations");
  const paletteIds = unique(
    foundations.color.palette,
    "/system/foundations/color/palette",
  );
  const colorScaleIds = unique(
    foundations.color.scales,
    "/system/foundations/color/scales",
  );
  unique(
    foundations.color.dataVisScales,
    "/system/foundations/color/dataVisScales",
  );
  unique(foundations.color.contrasts, "/system/foundations/color/contrasts");
  unique(foundations.color.surfaces, "/system/foundations/color/surfaces");
  reference(
    foundations.color.backgroundScaleId,
    colorScaleIds,
    "/system/foundations/color/backgroundScaleId",
  );
  for (const surface of foundations.color.surfaces)
    if (surface.sourceScaleId)
      reference(
        surface.sourceScaleId,
        colorScaleIds,
        `/system/foundations/color/surfaces/${surface.id}/sourceScaleId`,
      );

  for (const scale of foundations.color.scales) {
    if (scale.customContrasts) {
      const custom = scale.customContrasts;
      const ids = unique(
        custom.steps,
        `/system/foundations/color/scales/${scale.id}/customContrasts/steps`,
      );
      reference(
        custom.baseContrastId,
        ids,
        `/system/foundations/color/scales/${scale.id}/customContrasts/baseContrastId`,
      );
      reference(
        custom.namingRuleId,
        new Set(
          rules
            .filter((rule) => rule.type === "scale-naming")
            .map((rule) => rule.id),
        ),
        `/system/foundations/color/scales/${scale.id}/customContrasts/namingRuleId`,
      );
    }
    unique(scale.stops, `/system/foundations/color/scales/${scale.id}/stops`);
    for (const stop of scale.stops) {
      if (stop.paletteColorId)
        reference(
          stop.paletteColorId,
          paletteIds,
          `/system/foundations/color/scales/${scale.id}/stops/${stop.id}`,
        );
    }
  }
  for (const modeSet of modeSets) {
    reference(
      modeSet.defaultModeId,
      new Set(modeSet.modes.map((mode) => mode.id)),
      `/system/modeSets/${modeSet.id}/defaultModeId`,
    );
    unique(
      modeSet.modes.map((mode) => ({ id: mode.key })),
      `/system/modeSets/${modeSet.id}/keys`,
    );
    for (const mode of modeSet.modes) {
      for (const id of mode.platformIds)
        reference(
          id,
          platformIds,
          `/system/modeSets/${modeSet.id}/${mode.id}/platformIds`,
        );
      const color = mode.foundations.color;
      for (const [scaleId, values] of Object.entries(
        color?.scaleContrasts ?? {},
      )) {
        reference(
          scaleId,
          colorScaleIds,
          `/system/modeSets/${modeSet.id}/${mode.id}/scaleContrasts`,
        );
        const ids = new Set(
          foundations.color.scales
            .find((scale) => scale.id === scaleId)
            ?.customContrasts?.steps.map((step) => step.id),
        );
        for (const stepId of Object.keys(values))
          reference(
            stepId,
            ids,
            `/system/modeSets/${modeSet.id}/${mode.id}/scaleContrasts/${scaleId}`,
          );
      }
      for (const id of Object.keys(
        mode.foundations.elevation?.layerOpacities ?? {},
      )) {
        reference(
          id,
          new Set(foundations.elevation.layers.map((layer) => layer.id)),
          `/system/modeSets/${modeSet.id}/${mode.id}/elevation/layerOpacities`,
        );
      }
      if (color?.backgroundScaleId)
        reference(
          color.backgroundScaleId,
          colorScaleIds,
          `/system/modeSets/${modeSet.id}/${mode.id}/backgroundScaleId`,
        );
      for (const [scaleId, stops] of Object.entries(color?.scaleStops ?? {})) {
        reference(
          scaleId,
          colorScaleIds,
          `/system/modeSets/${modeSet.id}/${mode.id}/scaleStops`,
        );
        const stopIds = new Set(
          foundations.color.scales
            .find((scale) => scale.id === scaleId)
            ?.stops.map((stop) => stop.id),
        );
        for (const [stopId, stop] of Object.entries(stops)) {
          reference(
            stopId,
            stopIds,
            `/system/modeSets/${modeSet.id}/${mode.id}/scaleStops/${scaleId}`,
          );
          if (stop.paletteColorId)
            reference(
              stop.paletteColorId,
              paletteIds,
              `/system/modeSets/${modeSet.id}/${mode.id}/paletteColorId`,
            );
        }
      }
    }
  }
  for (const [parameterId, modeSetId] of Object.entries(adaptiveClaims)) {
    reference(modeSetId, modeSetIds, `/system/adaptiveClaims/${parameterId}`);
  }
  for (const formula of scaleTypes) {
    const location = `/system/scaleTypes/${formula.id}`;
    unique(formula.parameters, `/system/scaleTypes/${formula.id}/parameters`);
    if (!isScaleType(formula)) issues.push(`${location}: invalid formula`);
    issues.push(
      ...scaleTypeIssues(formula).map(
        (issue) => `/system/scaleTypes/${formula.id}: ${issue}`,
      ),
    );
  }
  for (const interpolation of interpolations) {
    const location = `/system/interpolations/${interpolation.id}`;
    if (!isInterpolation(interpolation))
      issues.push(`${location}: invalid interpolation`);
    else
      issues.push(
        ...interpolationIssues(interpolation).map(
          (issue) => `${location}: ${issue}`,
        ),
      );
  }
  const typography = foundations.typography;
  if (!isTypographyDocument(typography))
    issues.push(
      "/system/foundations/typography: invalid Typography settings or lineHeights",
    );
  reference(
    typography.scaleTypeId,
    formulaIds,
    "/system/foundations/typography/scaleTypeId",
  );
  for (const id of [
    typography.textRoundingRuleId,
    typography.lineHeightRoundingRuleId,
  ])
    reference(
      id,
      roundingRuleIds,
      "/system/foundations/typography/roundingRules",
    );
  for (const card of typography.lineHeights)
    reference(
      card.adaptive.interpolationId,
      interpolationIds,
      `/system/foundations/typography/lineHeights/${card.id}`,
    );
  for (const formula of scaleTypes)
    if (formula.textSizeAdaptation)
      reference(
        formula.textSizeAdaptation.interpolationId,
        interpolationIds,
        `/system/scaleTypes/${formula.id}`,
      );
  for (const foundation of DIMENSION_SCOPES) {
    const document = foundations[foundation];
    unique(document.scales, `/system/foundations/${foundation}/scales`);
    const availableRules = new Set([
      ...roundingRuleIds,
      ...(document.pendingRules ?? [])
        .filter((rule) => rule.type === "rounding")
        .map((rule) => rule.id),
    ]);
    for (const scale of document.scales) {
      reference(
        scale.scaleTypeId,
        formulaIds,
        `/system/foundations/${foundation}/${scale.id}/scaleTypeId`,
      );
      reference(
        scale.roundingRuleId,
        availableRules,
        `/system/foundations/${foundation}/${scale.id}/roundingRuleId`,
      );
      for (const [name, binding] of Object.entries(scale.bindings ?? {})) {
        if (!isParameterBinding(binding))
          issues.push(
            `/system/foundations/${foundation}/${scale.id}/bindings/${name}: invalid binding`,
          );
      }
    }
  }
  if (issues.length) throw new DatasetValidationError(issues);
  return result;
}
