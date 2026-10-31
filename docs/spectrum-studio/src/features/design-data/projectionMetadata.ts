// Copyright 2026 Adobe. All rights reserved.
import type { CompleteDesignSystemDataset } from "./model";
import type { BrowserTokenEdits } from "../tokens/browserModel";
import type { ParameterBinding } from "../scales/interpolation";
import {
  browserAssignmentId,
  emptyOutputMetadata,
  type OutputMetadata,
  type OutputRecipe,
} from "./materialization";
import { DIMENSION_SCOPES } from "../taxonomy/model";
import { structureGeneration } from "../structures/model";
import { tokenStableKey, tokenUuid } from "../tokens/model";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import { staticCategoricalTokenIds } from "../color-system/data-vis/frozenColors";
import { OPACITY_PARAMETERS } from "../opacity/generation";

const pointerPart = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");

/** Report-only adapter: references are declared source intent, not proven effective dependencies. */
export function authoringOutputMetadata(
  dataset: CompleteDesignSystemDataset,
  edits: BrowserTokenEdits,
): OutputMetadata {
  const system = dataset.system;
  const metadata = emptyOutputMetadata(system.modeSets.map((axis) => axis.key));
  const recipe = (
    id: string,
    pointer: string,
    generator: string,
    references: string[],
    bindings: Record<string, ParameterBinding> = {},
    bindingPath = "bindings",
  ): OutputRecipe => ({
    id,
    source: "authoring-dataset",
    pointer,
    generator,
    definitionReferences: [...new Set(references)].sort(),
    declaredBindings: Object.entries(bindings)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([parameter, binding]) => ({
        parameter,
        modeParameterId: binding.modeParameterId,
        source: "authoring-dataset",
        pointer: `${pointer}/${bindingPath}/${pointerPart(parameter)}`,
      })),
    dependencyAssessment: "declared-only",
    evaluatorVersion: "not-established",
  });
  metadata.recipes.push(
    recipe(
      "color-cascade",
      "/system/foundations/color",
      "buildCascadeTokenExport",
      system.foundations.color.scales.flatMap((scale) =>
        scale.customContrasts ? [scale.customContrasts.namingRuleId] : [],
      ),
    ),
  );
  system.foundations.color.dataVisScales.forEach((scale, index) => {
    const sources = scale.staticColors
      ? []
      : scale.kind === "categorical"
        ? scale.members.map((member) => member.source)
        : scale.points.map((point) => point.source);
    metadata.recipes.push(
      recipe(
        `data-vis:${scale.id}`,
        `/system/foundations/color/dataVisScales/${index}`,
        scale.kind === "categorical"
          ? "categoricalBrowserSources"
          : "compileContinuousScale",
        sources.flatMap((source) =>
          source.kind === "key-color"
            ? []
            : source.kind === "primitive-token"
              ? [source.tokenId]
              : source.kind === "ui-scale"
                ? [source.scaleId]
                : [
                    tokenUuid(
                      tokenStableKey(source.scaleId, source.contrastId),
                    ),
                  ],
        ),
      ),
    );
    if (scale.kind === "categorical")
      scale.staticColors?.forEach((color, colorIndex) => {
        if (color.overrideValue === undefined) return;
        metadata.assignments.push({
          id: browserAssignmentId(dataVisMemberId(scale.id, color.id), "[]"),
          kind: "browser-value-edit",
          source: "authoring-dataset",
          pointer: `/system/foundations/color/dataVisScales/${index}/staticColors/${colorIndex}/overrideValue`,
          context: {},
          selection: {},
          valueEvidence: {
            assigned: color.overrideValue,
            baseline: color.value,
          },
        });
      });
  });
  metadata.recipes.push(
    recipe(
      "elevation",
      "/system/foundations/elevation",
      "generateElevation",
      system.foundations.elevation.layers.map((layer) => layer.scaleTypeId),
    ),
  );
  const typography = system.foundations.typography;
  if (system.foundations.opacity) {
    const opacity = recipe(
      "opacity",
      "/system/foundations/opacity",
      "resolveOpacity",
      [],
    );
    opacity.declaredBindings = OPACITY_PARAMETERS.map((modeParameterId) => ({
      parameter: modeParameterId,
      modeParameterId,
      source: "authoring-dataset",
      pointer: "/system/foundations/opacity/polarityCompensation",
    }));
    metadata.recipes.push(opacity);
    metadata.limitations.push(
      "Opacity uses the Studio-local opacity contract, not an upstream modern value-type schema (LTAX-002, LTAX-003, LTAX-005, LTAX-007, LTAX-016).",
    );
  }
  const formulaIndex = system.scaleTypes.findIndex(
    (formula) => formula.id === typography.scaleTypeId,
  );
  const typeScale = system.scaleTypes[formulaIndex];
  const typographyRecipe = recipe(
    "typography",
    "/system/foundations/typography",
    "generateTypography",
    [
      typography.scaleTypeId,
      typography.textRoundingRuleId,
      typography.lineHeightRoundingRuleId,
      ...(typeScale?.textSizeAdaptation
        ? [typeScale.textSizeAdaptation.interpolationId]
        : []),
      ...typography.lineHeights
        .filter((card) => card.isAdaptive)
        .map((card) => card.adaptive.interpolationId),
    ],
  );
  typographyRecipe.declaredBindings = ["base", "ratio"].map((parameter) => ({
    parameter,
    modeParameterId: "typography.textZoom",
    source: "authoring-dataset",
    pointer: `/system/scaleTypes/${formulaIndex}/${parameter === "ratio" ? "textSizeAdaptation" : "base"}`,
  }));
  metadata.recipes.push(typographyRecipe);
  for (const domain of DIMENSION_SCOPES) {
    system.foundations[domain].scales.forEach((scale, index) =>
      metadata.recipes.push(
        recipe(
          `${domain}:${scale.id}`,
          `/system/foundations/${domain}/scales/${index}`,
          domain === "radius"
            ? "generateRadiusScale"
            : domain === "spacing"
              ? "generateSpacingScale"
              : "generateSizeScale",
          [scale.scaleTypeId, scale.roundingRuleId],
          scale.bindings,
        ),
      ),
    );
  }
  system.structures.structures.forEach((structure, index) => {
    const generation = structureGeneration(structure);
    if (!generation.applications.length) return;
    metadata.recipes.push(
      recipe(
        `structure:${structure.conceptId}`,
        `/system/structures/structures/${index}`,
        "buildTshirtArtifacts",
        [
          ...generation.applications.map((application) => application.ruleId),
          ...structure.properties.flatMap((binding) =>
            "$ref" in binding ? [binding.$ref] : [],
          ),
        ],
      ),
    );
  });
  const dormantMemberIds = staticCategoricalTokenIds(system.foundations.color);
  for (const [tokenId, edit] of Object.entries(edits)) {
    if (edit.authoring?.manual)
      metadata.recipes.push(
        recipe(
          `manual-token:${tokenId}`,
          `/browserTokenEdits/${pointerPart(tokenId)}/authoring/manual`,
          "resolveBrowserTokens",
          [edit.authoring.manual.targetId],
        ),
      );
    for (const [key, assignment] of Object.entries(
      edit.authoring?.assignments ?? {},
    )) {
      metadata.assignments.push({
        id: browserAssignmentId(tokenId, key),
        kind: "browser-value-edit",
        source: "authoring-dataset",
        pointer: `/browserTokenEdits/${pointerPart(tokenId)}/authoring/assignments/${pointerPart(key)}`,
        context: {},
        selection: Object.fromEntries(JSON.parse(key) as [string, string][]),
        ...(assignment.kind === "literal" &&
          edit.authoring?.baselines?.[key] !== undefined && {
            valueEvidence: {
              assigned: assignment.value,
              baseline: edit.authoring.baselines[key],
            },
          }),
      });
    }
    if (dormantMemberIds.has(tokenId)) continue;
    for (const modeKey of Object.keys(edit.values)) {
      const selection = Object.fromEntries(
        JSON.parse(modeKey) as [string, string][],
      );
      metadata.assignments.push({
        id: browserAssignmentId(tokenId, modeKey),
        kind: "browser-value-edit",
        source: "authoring-dataset",
        pointer: `/browserTokenEdits/${pointerPart(tokenId)}/values/${pointerPart(modeKey)}`,
        context: {},
        selection,
        valueEvidence: {
          assigned: edit.values[modeKey].value,
          baseline: edit.values[modeKey].baseline,
        },
      });
    }
  }
  for (const [tokenId, override] of Object.entries(system.tokenOverrides))
    if (override.value !== undefined)
      metadata.assignments.push({
        id: `legacy-override:${tokenId}`,
        kind: "legacy-token-override",
        source: "authoring-dataset",
        pointer: `/system/tokenOverrides/${pointerPart(tokenId)}`,
        context: {},
        valueEvidence: {
          assigned: override.value,
          baseline: override.baseline.value,
        },
      });
  metadata.limitations.push(
    "Non-color Cartesian rows are evaluation samples, not explicit assignments or canonical dataset coverage. Serialized color cascade rows are existing generated output, not proof of canonical emission policy.",
    "Browser value edits and legacy overrides are inventoried independently of effective row association. Name-only edits are not value assignments. The color exporter does not carry per-row baseline/edit lineage; it is not reconstructed from equal values or inferred mode defaults.",
    "Recipe references and bindings are declared intent only; mode foundation patches, rule conditions and color generation may supply additional dependencies. No complete dependency graph or numerical sensitivity claim is made.",
    "This projection excludes temporary previews. Working authoring state is not saved state. Hidden Typography is omitted from publishing projection rows, not from authoring token inventories. componentSize remains in typography pending EPIC-2.5.",
    "Structure variants are generated serialized contexts, not Cartesian samples. Structure-enabled sizes are not mode axes. Their required primitive artifact targets are inventoried separately from existing primitive evaluation rows to avoid counting a primitive twice. Local graph validation does not establish complete upstream materialization or reference resolution.",
  );
  return metadata;
}
