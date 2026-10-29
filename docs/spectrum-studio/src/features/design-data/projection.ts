// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import { buildCascadeTokenExport } from "../tokens/cascadeExport";
import { modeSetDefaultMode } from "../modes/model";
import {
  contextForModes,
  modeCombinationCount,
  modeCombinations,
  selectionForModes,
} from "../modes/combinations";
import { resolveModeParameterValues } from "../modes/parameterResolution";
import { generateTypography } from "../typography/typographyGeneration";
import { resolveTypographyDocument } from "../typography/resolution";
import { generateSpacingScale } from "../spacing/generate";
import { generateSizeScale } from "../size/generate";
import { generateRadiusScale } from "../radius/generate";
import { DIMENSION_SCOPES } from "../taxonomy/model";
import { dimensionIssues } from "../scales/issues";
import { isFoundationPublished } from "../foundations/types";
import {
  canonicalTokenModeKey,
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserToken,
  type BrowserTokenEdits,
} from "../tokens/browserModel";
import { browserSourcesFromOutputs } from "../tokens/browserSources";
import type { CompleteDesignSystemDataset } from "./model";
import {
  canonicalJson,
  type AnalysisInput,
  type AnalysisRecord,
  type AnalysisSource,
} from "./comparison";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "./validation";
import { authoringOutputMetadata } from "./projectionMetadata";
import {
  browserAssignmentId,
  emptyOutputMetadata,
  outputScenario,
} from "./materialization";
import { generateElevation } from "../elevation/generate";
import { resolveElevationDocument } from "../elevation/resolution";
import { browserElevationSources } from "../elevation/output";
import { buildTshirtArtifacts } from "./tshirtArtifacts";
import { projectClassification } from "../taxonomy/model";
import { structureName } from "../structures/generation";
import { aliasReferencePacket } from "../tokens/aliases";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import { componentRelationships } from "../components/projection";
import { opacityRows, opacityOutputIssues } from "../opacity/output";

function overrideEvidence(row: BrowserToken): Partial<AnalysisRecord> {
  return row.nameOverridden || row.valueOverridden
    ? {
        overrides: {
          ...(row.nameOverridden ? { generatedName: row.generatedName } : {}),
          ...(row.valueOverridden
            ? { generatedValue: row.generatedValue }
            : {}),
        },
      }
    : {};
}

export function projectAuthoringDataset(
  dataset: CompleteDesignSystemDataset,
  source: AnalysisSource,
  browserEdits: BrowserTokenEdits = dataset.system.browserTokenEdits ?? {},
): AnalysisInput {
  const records: AnalysisRecord[] = [];
  const errors: string[] = [];
  let outputMetadata = emptyOutputMetadata();
  const add = (
    category: string,
    id: string,
    name: string,
    value: unknown,
    pointer: string,
    extra: Partial<AnalysisRecord> = {},
  ) => {
    records.push({
      id: `${category}:${id}`,
      category,
      name,
      value,
      source: "authoring-dataset",
      pointer,
      classification: "authored",
      ...extra,
    });
  };
  const system = dataset.system;
  for (const [category, value] of Object.entries(system)) {
    if (category === "aliases" || category === "browserTokenEdits") continue;
    if (category === "components") {
      system.components?.components.forEach((component, index) => {
        add(
          "components",
          component.id,
          component.declaration.displayName,
          component.declaration,
          `/system/components/components/${index}`,
          { identity: component.id },
        );
        componentRelationships(component, system.taxonomy).forEach(
          (row, rowIndex) =>
            add(
              "relationships",
              row.uuid,
              `${component.declaration.displayName} ${row.scope.part ?? ""} ${row.scope.property}`.trim(),
              row,
              `/system/components/components/${index}/assignments/${rowIndex}`,
              { identity: row.uuid },
            ),
        );
      });
      continue;
    }
    if (category === "foundations") {
      for (const [foundation, document] of Object.entries(system.foundations))
        add(
          "foundations",
          foundation,
          foundation,
          document,
          `/system/foundations/${foundation}`,
        );
    } else if (category === "structures") {
      system.structures.structures.forEach((structure, index) =>
        add(
          "authoring/structures",
          structure.conceptId,
          structureName(structure, system.taxonomy),
          structure,
          `/system/structures/structures/${index}`,
          { conceptId: structure.conceptId },
        ),
      );
    } else if (Array.isArray(value)) {
      const target =
        category === "modeSets" ? "mode-sets" : `authoring/${category}`;
      value.forEach((entry: { id: string; name?: string }, index) =>
        add(
          target,
          entry.id,
          entry.name ?? entry.id,
          entry,
          `/system/${category}/${index}`,
        ),
      );
    } else
      add(
        `authoring/${category}`,
        category,
        category,
        value,
        `/system/${category}`,
      );
  }
  if (Object.keys(browserEdits).length)
    add(
      "authoring/token-edits",
      "browser",
      "Browser token edits",
      browserEdits,
      "/browserTokenEdits",
    );
  try {
    composeDesignSystemDefaults(
      canonicalDesignSystemDataset(dataset),
      system.scaleTypes,
    );
    outputMetadata = authoringOutputMetadata(dataset, browserEdits);
    const scenarios = new Map<string, ReturnType<typeof outputScenario>>();
    const observe = (
      recordId: string,
      recipeId: string,
      context: Record<string, string>,
      kind: "evaluation" | "serialized-context",
      assignmentIds: string[] = [],
    ) => {
      const scenario = outputScenario(context, outputMetadata.axes, kind);
      scenarios.set(scenario.id, scenario);
      outputMetadata.observations.push({
        recordId: `tokens:${recordId}`,
        origin:
          kind === "evaluation" ? "evaluation-sample" : "generated-output",
        recipeId,
        scenarioId: scenario.id,
        assignmentIds,
        lineage: assignmentIds.length
          ? "generated-baseline-and-edit"
          : "generator-source-only",
      });
      outputMetadata.scenarios = [...scenarios.values()];
    };
    const variants = buildTshirtArtifacts(
      {
        colorSystem: system.foundations.color,
        typography: system.foundations.typography,
        spacing: system.foundations.spacing,
        size: system.foundations.size,
        radius: system.foundations.radius,
        elevation: system.foundations.elevation,
        opacity: system.foundations.opacity,
        taxonomy: system.taxonomy,
        structures: system.structures,
        rules: system.rules,
        scaleTypes: system.scaleTypes,
        modeSets: system.modeSets,
        browserTokenEdits: browserEdits,
      },
      source.kind === "defaults"
        ? "shipped"
        : source.kind === "saved"
          ? "saved"
          : "working",
    );
    if (system.aliases?.tokens.length) {
      const targets = canonicalAliasRows(
        completeAliasSource({
          ...system,
          colorSystem: system.foundations.color,
          ...system.foundations,
          browserTokenEdits: browserEdits,
        }),
        variants,
      );
      for (const alias of aliasReferencePacket(system.aliases, targets)) {
        add(
          "compatibility-aliases",
          alias.uuid,
          alias.name,
          undefined,
          "/system/aliases",
          {
            identity: alias.uuid,
            reference: alias.$ref,
            classification: "generated",
            conceptId: alias.aliasId,
          },
        );
      }
    }
    for (const row of variants.semantics) {
      const taxonomy = projectClassification(
        system.taxonomy,
        row.classification,
        "structures",
      );
      add(
        "tokens",
        row.token.uuid,
        taxonomy.name,
        "$ref" in row.token ? undefined : row.token.value,
        `/system/structures/structures/${system.structures.structures.findIndex((structure) => structure.conceptId === row.structureId)}`,
        {
          classification: "generated",
          identity: row.token.uuid,
          conceptId: row.conceptId,
          structuredName: row.token.name,
          context: row.context,
          taxonomy,
          ...(row.token.$ref && { reference: row.token.$ref }),
          ...(row.target.family !== "elevation" && { unit: "px" }),
        },
      );
      observe(
        row.token.uuid,
        `structure:${row.structureId}`,
        row.context,
        "serialized-context",
      );
      const observation = outputMetadata.observations.at(-1)!;
      if (row.kind === "override") {
        const assignmentId = browserAssignmentId(
          row.target.nativeId,
          canonicalTokenModeKey(row.selection),
        );
        if (
          outputMetadata.assignments.some(
            (assignment) => assignment.id === assignmentId,
          )
        )
          observation.assignmentIds.push(assignmentId);
      }
    }
    for (const target of variants.primitiveLineage)
      add(
        "authoring/generated-targets",
        target.uuid,
        target.nativeId,
        target,
        "/generated/tshirt/primitiveLineage",
        {
          identity: target.uuid,
          conceptId: target.conceptId,
          classification: "generated",
          context: target.context,
        },
      );
    for (const field of variants.fields)
      if (
        "name" in field &&
        typeof field.name === "string" &&
        variants.semantics.length
      )
        add(
          "fields",
          `tshirt:${field.name}`,
          field.name,
          field,
          "/generated/tshirt/fields",
        );
    const axes = system.modeSets.filter((modeSet) => modeSet.modes.length);
    const count = modeCombinationCount(axes);
    if (count > 256)
      throw new Error(
        `Generation requires ${count} mode combinations; the interactive/report safety limit is 256. No partial token denominator is published.`,
      );
    const activeModes = axes
      .map(modeSetDefaultMode)
      .filter((mode) => mode !== undefined);
    const color = buildCascadeTokenExport({
      base: system.foundations.color,
      modeSets: system.modeSets,
      activeModes,
      activeTokens: [],
      overrides: system.tokenOverrides,
      browserEdits,
      taxonomy: system.taxonomy,
      rules: system.rules,
    });
    const staticValues = new Map(
      system.foundations.color.dataVisScales.flatMap((scale) =>
        scale.kind === "categorical"
          ? (scale.staticColors ?? [])
              .filter((color) => color.overrideValue !== undefined)
              .map(
                (color) =>
                  [dataVisMemberId(scale.id, color.id), color] as const,
              )
          : [],
      ),
    );
    for (const token of color.tokens) {
      const context = Object.fromEntries(
        axes.flatMap((axis) => {
          const mode = token.name[axis.key];
          return typeof mode === "string" ? [[axis.key, mode]] : [];
        }),
      );
      const taxonomy = color.taxonomy?.projections[token.uuid];
      const shared = staticValues.get(token.uuid);
      add(
        "tokens",
        token.uuid,
        taxonomy && !taxonomy.issues.length
          ? taxonomy.name
          : canonicalJson(token.name),
        token.value,
        "/system/foundations/color",
        {
          structuredName: token.name,
          identity: token.uuid,
          conceptId: token.conceptId,
          context,
          classification: "generated",
          ...(taxonomy && { taxonomy }),
          ...(shared && { overrides: { generatedValue: shared.value } }),
        },
      );
      observe(
        token.uuid,
        "color-cascade",
        context,
        "serialized-context",
        shared ? [browserAssignmentId(token.uuid, "[]")] : [],
      );
    }
    const combinations = modeCombinations(axes);
    errors.push(
      ...opacityOutputIssues({
        opacity: system.foundations.opacity,
        colorSystem: system.foundations.color,
        modeSets: system.modeSets,
        browserTokenEdits: browserEdits,
      }),
    );
    for (const row of opacityRows(
      {
        opacity: system.foundations.opacity,
        colorSystem: system.foundations.color,
        modeSets: system.modeSets,
        browserTokenEdits: browserEdits,
      },
      system.taxonomy,
    )) {
      if (!row.uuid || row.issues.length) {
        errors.push(...row.issues);
        continue;
      }
      add(
        "tokens",
        row.uuid,
        row.name,
        row.value,
        "/system/foundations/opacity",
        {
          identity: row.uuid,
          conceptId: row.conceptId,
          context: row.context,
          structuredName: {
            property: "opacity",
            scaleIndex: row.scaleIndex,
            ...row.context,
          },
          classification: "generated",
          ...(row.value !== row.generatedValue && {
            overrides: { generatedValue: row.generatedValue },
          }),
        },
      );
      observe(
        row.uuid,
        "opacity",
        row.context,
        "serialized-context",
        browserEdits[row.conceptId]?.values[row.modeKey]
          ? [browserAssignmentId(row.conceptId, row.modeKey)]
          : [],
      );
    }
    for (const modes of combinations) {
      const context = contextForModes(axes, modes);
      const modeValues = resolveModeParameterValues(
        system.foundations,
        modes,
        undefined,
        { modeSets: system.modeSets },
      );
      const modeKey = canonicalTokenModeKey(selectionForModes(axes, modes));
      const suffix = canonicalJson(context);
      const elevation = system.foundations.elevation;
      const elevationSources = browserElevationSources(
        elevation,
        generateElevation(
          resolveElevationDocument(
            elevation,
            modes,
            system.modeSets,
            {},
            {
              opacity: system.foundations.opacity,
              colorSystem: system.foundations.color,
              modeSets: system.modeSets,
              browserTokenEdits: browserEdits,
            },
          ),
          system.scaleTypes,
          system.foundations.color.settings.colorOutput,
        ),
        system.taxonomy,
      );
      for (const row of projectBrowserTokens(
        resolveBrowserTokens(elevationSources, browserEdits, modeKey),
        system.taxonomy,
      )) {
        add(
          "tokens",
          `${row.id}:${suffix}`,
          row.name,
          row.shadows,
          "/system/foundations/elevation",
          {
            classification: "generated",
            conceptId: row.id,
            context,
            taxonomy: row.projection,
          },
        );
        observe(`${row.id}:${suffix}`, "elevation", context, "evaluation");
      }
      const typography = system.foundations.typography;
      if (isFoundationPublished(typography)) {
        const generated = generateTypography(
          resolveTypographyDocument(typography, modes, undefined, {
            modeSets: system.modeSets,
          }),
          undefined,
          system.rules,
          system.scaleTypes,
          system.interpolations,
        );
        for (const row of projectBrowserTokens(
          resolveBrowserTokens(
            browserSourcesFromOutputs([], generated, [], [], {
              names: typography.metricNames,
              registry: system.taxonomy,
            }),
            browserEdits,
            modeKey,
          ),
          system.taxonomy,
        )) {
          add(
            "tokens",
            `${row.id}:${suffix}`,
            row.name,
            row.value,
            "/system/foundations/typography",
            {
              classification: "generated",
              conceptId: row.id,
              context,
              unit: row.unit || undefined,
              taxonomy: row.projection,
              ...overrideEvidence(row),
            },
          );
          observe(
            `${row.id}:${suffix}`,
            "typography",
            context,
            "evaluation",
            browserEdits[row.id]?.values[modeKey]
              ? [browserAssignmentId(row.id, modeKey)]
              : [],
          );
        }
      }
      for (const domain of DIMENSION_SCOPES) {
        const rules = system.foundations[domain].pendingRules
          ? [...system.rules, ...system.foundations[domain].pendingRules]
          : system.rules;
        for (const scale of system.foundations[domain].scales.filter(
          isFoundationPublished,
        )) {
          const values =
            domain === "radius"
              ? generateRadiusScale(scale, rules, system.scaleTypes, modeValues)
              : domain === "spacing"
                ? generateSpacingScale(
                    scale,
                    rules,
                    system.scaleTypes,
                    modeValues,
                  )
                : generateSizeScale(
                    scale,
                    rules,
                    system.scaleTypes,
                    modeValues,
                  );
          if (
            domain === "radius" &&
            dimensionIssues(values, "non-negative").variant === "negative"
          ) {
            throw new Error(
              `Invalid Radius scale "${scale.name}": values must be finite and non-negative.`,
            );
          }
          const sources = browserSourcesFromOutputs(
            [],
            [],
            domain === "spacing" ? [{ scale, values }] : [],
            domain === "size" ? [{ scale, values }] : [],
            { names: undefined, registry: system.taxonomy },
            undefined,
            domain === "radius" ? [{ scale, values }] : [],
          );
          projectBrowserTokens(
            resolveBrowserTokens(sources, browserEdits, modeKey),
            system.taxonomy,
          ).forEach((row, index) => {
            add(
              "tokens",
              `${row.id}:${suffix}`,
              row.name,
              row.value,
              `/system/foundations/${domain}`,
              {
                classification: "generated",
                conceptId: `${domain}:${scale.id}:${values[index].step}`,
                context,
                unit: row.unit || undefined,
                taxonomy: row.projection,
                ...overrideEvidence(row),
              },
            );
            observe(
              `${row.id}:${suffix}`,
              `${domain}:${scale.id}`,
              context,
              "evaluation",
              browserEdits[row.id]?.values[modeKey]
                ? [browserAssignmentId(row.id, modeKey)]
                : [],
            );
          });
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return {
    source,
    records,
    outputMetadata,
    inventoryStatus: errors.length ? "partial" : "complete",
    categories: [...new Set(records.map((record) => record.category))].sort(),
    schemas: [
      "app-authoring-dataset-v1",
      ...(records.some(
        (record) =>
          record.category === "authoring/generated-targets" ||
          record.id.startsWith("fields:tshirt:"),
      )
        ? ["spectrum-design-data-tshirt-subset-v1"]
        : []),
    ],
    errors,
    limitations: [
      "Authoring definitions are app-owned extensions, not proposed-spec conformance.",
      "UI metadata is excluded. App token values use existing generators, publishing flags, mode owners, and overrides; temporary preview controls are excluded.",
    ],
  };
}

export function defaultsAnalysisInput(): AnalysisInput {
  return projectAuthoringDataset(designSystemDefaults, {
    kind: "defaults",
    root: "shipped app dataset",
    hash: "pending-adapter-sha256",
    revision: String(designSystemDefaults.dataset.revision),
    dirty: false,
    version: String(designSystemDefaults.schemaVersion),
    validator: "generated authoring JSON Schema + identity/reference checks",
  });
}
