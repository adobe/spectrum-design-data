// Copyright 2026 Adobe. All rights reserved.
import Ajv from "ajv";
import nativeSchema from "../../data/design-system.schema.json" with { type: "json" };
import { designSystemDefaults } from "../../data/defaults";
import type { ColorSystemDocument } from "../color-system/model";
import type { TypographyDocument } from "../typography/model";
import type { SpacingDocument } from "../spacing/model";
import type { SizeDocument } from "../size/model";
import type { RadiusDocument } from "../radius/model";
import {
  canonicalDimensionDocument,
  resolveNamedSource,
  type CanonicalSpacingDocument,
  type CanonicalSizeDocument,
} from "../taxonomy/naming";
import { generateDimensionScale } from "../scales/foundation";
import { DIMENSION_SCOPES, type DimensionScope } from "../taxonomy/model";
import type { CanonicalRadiusDocument } from "../taxonomy/naming";
import { dimensionIssues } from "../scales/issues";
import { modeSetDefaultMode, type ModeSet } from "../modes/model";
import {
  parameterOwners,
  BINDABLE_PARAMETER_RANGES,
} from "../modes/parameters";
import { modeCombinationCount, modeSelections } from "../modes/combinations";
import {
  resolveModeParameterValues,
  type ModeParameterValues,
} from "../modes/parameterResolution";
import { isParameterBinding, resolveBinding } from "../scales/interpolation";
import { scaleTypeIssues, type ScaleType } from "../scales/scaleType";
import type { Rule } from "../logic/model";
import { isFoundationPublished } from "../foundations/types";
import { browserSourcesFromOutputs } from "../tokens/browserSources";
import {
  canonicalTokenModeKey,
  isBrowserTokenEdits,
  projectBrowserTokens,
  resolveBrowserTokens,
  type BrowserTokenEdits,
} from "../tokens/browserModel";
import {
  isTaxonomyDocument,
  type TaxonomyDocument,
  type TaxonomyProjection,
} from "../taxonomy/model";
import { tokenUuid } from "../tokens/model";
import { canonicalJson } from "./canonicalJson";

export const DIMENSION_PROFILE = "leonardo-proposed-dimensions-v3";
export const DIMENSION_FOUNDATION_SCHEMA =
  "urn:leonardo:proposal:dimension-foundations:3";
export const DIMENSION_TOKEN_SCHEMA = "urn:leonardo:proposal:dimension-token:3";
export interface DimensionAuthoringSource {
  colorSystem: ColorSystemDocument;
  typography: TypographyDocument;
  spacing?: SpacingDocument;
  size?: SizeDocument;
  radius?: RadiusDocument;
  taxonomy?: TaxonomyDocument;
  scaleTypes?: ScaleType[];
  rules?: Rule[];
  modeSets: ModeSet[];
  browserTokenEdits?: BrowserTokenEdits;
}
type Domain = DimensionScope;
interface GenerationPlan {
  domain: Domain;
  scaleId: string;
  kind: "baseline" | "binding" | "override";
  context: Record<string, string>;
  selection: Record<string, string>;
  parameters: ModeParameterValues;
}
export interface DimensionArtifactSource {
  taxonomy?: TaxonomyDocument;
  unit: "px";
  spacing: CanonicalSpacingDocument;
  size: CanonicalSizeDocument;
  radius: CanonicalRadiusDocument;
  formulas: ScaleType[];
  rules: Rule[];
  modeSets: ModeSet[];
  edits: BrowserTokenEdits;
  plans: GenerationPlan[];
}
export interface DimensionToken {
  $schema: typeof DIMENSION_TOKEN_SCHEMA;
  uuid: string;
  conceptId: string;
  name: { scaleIndex: number } & Record<string, string | number>;
  value: string;
}
export interface DimensionLineage {
  taxonomy?: TaxonomyProjection;
  uuid: string;
  domain: Domain;
  scaleId: string;
  step: number;
  kind: GenerationPlan["kind"];
  selection: Record<string, string>;
  generatedValue: number;
  displayName: string;
  edit?: {
    tokenId: string;
    modeKey: string;
    assignedValue: string | number;
    authoredBaseline: string | number;
  };
}
export interface DimensionArtifactBundle {
  schemaVersion: 3;
  profileId: typeof DIMENSION_PROFILE;
  sourceHash: string;
  foundation: {
    $schema: typeof DIMENSION_FOUNDATION_SCHEMA;
    schemaVersion: 3;
    source: DimensionArtifactSource;
    references: {
      kind: "formula" | "rounding-rule";
      owner: "library" | Domain;
      id: string;
      revision: string;
    }[];
  };
  tokens: DimensionToken[];
  lineage: DimensionLineage[];
}

const record = { type: "object", additionalProperties: { type: "string" } };
const numbers = { type: "object", additionalProperties: { type: "number" } };
const requiredObject = (
  properties: Record<string, unknown>,
  optional: string[] = [],
) => ({
  type: "object",
  properties,
  required: Object.keys(properties).filter((key) => !optional.includes(key)),
  additionalProperties: false,
});
const list = (definition: string, maxItems: number) => ({
  type: "array",
  maxItems,
  items: { $ref: `#/definitions/${definition}` },
});
/** Real local proposal schema, composed with existing native payload schemas; not an upstream schema. */
export const dimensionFoundationSchema = {
  $id: DIMENSION_FOUNDATION_SCHEMA,
  definitions: nativeSchema.definitions,
  ...requiredObject({
    $schema: { const: DIMENSION_FOUNDATION_SCHEMA },
    schemaVersion: { const: 3 },
    source: requiredObject(
      {
        unit: { const: "px" },
        spacing: { $ref: "#/definitions/CanonicalSpacingDocument" },
        size: { $ref: "#/definitions/CanonicalSizeDocument" },
        radius: { $ref: "#/definitions/CanonicalRadiusDocument" },
        taxonomy: { $ref: "#/definitions/TaxonomyDocument" },
        formulas: list("ScaleType", 128),
        rules: list("RoundingRule", 128),
        modeSets: list("ModeSet", 16),
        edits: { type: "object", maxProperties: 2000 },
        plans: {
          type: "array",
          maxItems: 4096,
          items: requiredObject({
            domain: { enum: DIMENSION_SCOPES },
            scaleId: { type: "string", minLength: 1 },
            kind: { enum: ["baseline", "binding", "override"] },
            context: record,
            selection: record,
            parameters: numbers,
          }),
        },
      },
      ["taxonomy"],
    ),
    references: {
      type: "array",
      maxItems: 512,
      items: requiredObject({
        kind: { enum: ["formula", "rounding-rule"] },
        owner: { enum: ["library", ...DIMENSION_SCOPES] },
        id: { type: "string", minLength: 1 },
        revision: { type: "string", pattern: "^[a-f0-9]{64}$" },
      }),
    },
  }),
};
export const dimensionTokenSchema = {
  $id: DIMENSION_TOKEN_SCHEMA,
  ...requiredObject({
    $schema: { const: DIMENSION_TOKEN_SCHEMA },
    uuid: {
      type: "string",
      pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
    },
    conceptId: {
      type: "string",
      pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
    },
    name: {
      type: "object",
      required: ["scaleIndex"],
      properties: { scaleIndex: { type: "number" } },
      additionalProperties: { type: ["string", "number"] },
    },
    value: {
      type: "string",
      pattern: "^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:e[+-]?[0-9]+)?px$",
    },
  }),
};
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateFoundation = ajv.compile(dimensionFoundationSchema);
const validateToken = ajv.compile(dimensionTokenSchema);
const fail = (message: string): never => {
  throw new Error(message);
};
const unique = (items: readonly { id: string }[], label: string) => {
  if (
    items.some((item) => !item.id.trim()) ||
    new Set(items.map((item) => item.id)).size !== items.length
  )
    fail(`Empty or duplicate ${label} identity.`);
};
const reserved = new Set(["property", "foundationScale", "scaleIndex"]);

function validateSource(source: DimensionArtifactSource) {
  if (source.taxonomy !== undefined && !isTaxonomyDocument(source.taxonomy))
    fail("Invalid dimension taxonomy source.");
  if (!isBrowserTokenEdits(source.edits))
    fail("Invalid dimension browser-edit source.");
  unique(source.formulas, "formula");
  unique(source.rules, "rule");
  unique(source.modeSets, "mode set");
  unique(
    source.modeSets.map((axis) => ({ id: axis.key })),
    "mode key",
  );
  unique(
    source.modeSets.flatMap((axis) => axis.modes),
    "mode",
  );
  for (const axis of source.modeSets) {
    if (
      reserved.has(axis.key) ||
      source.taxonomy?.categories.some(
        (category) => category.key === axis.key,
      ) ||
      !axis.modes.length ||
      axis.modes.length > 16 ||
      !axis.modes.some((mode) => mode.id === axis.defaultModeId)
    )
      fail(`Unsupported mode declaration: ${axis.key}.`);
    unique(
      axis.modes.map((mode) => ({ id: mode.key })),
      "mode value",
    );
  }
  for (const formula of source.formulas)
    if (scaleTypeIssues(formula).length)
      fail(
        `Invalid formula ${formula.id}: ${scaleTypeIssues(formula).join(" ")}`,
      );
  const owners = parameterOwners(source.modeSets);
  for (const plan of source.plans) {
    const scale =
      source[plan.domain].scales.find((item) => item.id === plan.scaleId) ??
      fail("Generation plan has an unresolved scale.");
    if (
      Object.keys(plan.selection).length !== source.modeSets.length ||
      source.modeSets.some(
        (axis) =>
          !axis.modes.some((mode) => mode.id === plan.selection[axis.id]),
      )
    )
      fail("Generation plan has an invalid mode selection.");
    const dependencyIds = new Set(
      Object.values(scale.bindings ?? {}).map(
        (binding) => owners[binding.modeParameterId],
      ),
    );
    const axes =
      plan.kind === "baseline"
        ? []
        : plan.kind === "override"
          ? source.modeSets
          : source.modeSets.filter((axis) => dependencyIds.has(axis.id));
    const expectedContext = Object.fromEntries(
      axes.map((axis) => [
        axis.key,
        axis.modes.find((mode) => mode.id === plan.selection[axis.id])!.key,
      ]),
    );
    if (canonicalJson(plan.context) !== canonicalJson(expectedContext))
      fail(
        "Generation context does not match its declared binding/assignment scope.",
      );
    if (
      plan.kind === "baseline" &&
      source.modeSets.some(
        (axis) => plan.selection[axis.id] !== axis.defaultModeId,
      )
    )
      fail("Baseline plan is not evaluated at declared defaults.");
    if (
      Object.keys(plan.parameters).length !==
        Object.keys(BINDABLE_PARAMETER_RANGES).length ||
      Object.keys(BINDABLE_PARAMETER_RANGES).some(
        (id) => !Number.isFinite(plan.parameters[id]),
      )
    )
      fail("Missing or invalid captured generator inputs.");
  }
  for (const domain of DIMENSION_SCOPES) {
    unique(source[domain].scales, `${domain} scale`);
    if (source[domain].scales.length > 32)
      fail("Dimension artifact limit is 32 scales per domain.");
    const rules = [...source.rules, ...(source[domain].pendingRules ?? [])];
    unique(rules, `${domain} rounding rule`);
    for (const scale of source[domain].scales) {
      const formula =
        source.formulas.find((item) => item.id === scale.scaleTypeId) ??
        fail(`Unresolved formula: ${scale.scaleTypeId}.`);
      if (!rules.some((item) => item.id === scale.roundingRuleId))
        fail(`Unresolved rounding rule: ${scale.roundingRuleId}.`);
      for (const [part, binding] of Object.entries(scale.bindings ?? {})) {
        const policy =
          (part === "base"
            ? formula.base
            : formula.parameters.find((item) => item.id === part)) ??
          fail(`Unknown binding part: ${scale.id}/${part}.`);
        const range = BINDABLE_PARAMETER_RANGES[binding.modeParameterId];
        if (!policy?.adaptable || !range || !isParameterBinding(binding))
          fail(`Unsupported binding ${domain}/${scale.id}/${part}.`);
        if (
          !policy.overridable &&
          resolveBinding(binding, range.neutral) !== policy.default
        )
          fail(
            `Locked binding has a non-neutral baseline: ${scale.id}/${part}.`,
          );
      }
    }
  }
}

export function captureDimensionSource(
  snapshot: DimensionAuthoringSource,
  options: {
    includeUnpublished?: boolean;
    sourceIds?: ReadonlySet<string>;
  } = {},
): DimensionArtifactSource {
  const scoped = <T extends { scales: { id: string }[] }>(document: T): T =>
    options.sourceIds
      ? {
          ...document,
          scales: document.scales.filter((scale) =>
            options.sourceIds!.has(scale.id),
          ),
        }
      : document;
  const spacing = scoped(
    snapshot.spacing ?? designSystemDefaults.system.foundations.spacing,
  );
  const size = scoped(
    snapshot.size ?? designSystemDefaults.system.foundations.size,
  );
  const radius = scoped(
    snapshot.radius ?? designSystemDefaults.system.foundations.radius,
  );
  const formulaIds = new Set(
    [...spacing.scales, ...size.scales, ...radius.scales].map(
      (scale) => scale.scaleTypeId,
    ),
  );
  const ruleIds = new Set(
    [...spacing.scales, ...size.scales, ...radius.scales].map(
      (scale) => scale.roundingRuleId,
    ),
  );
  const source: DimensionArtifactSource = structuredClone({
    unit: "px",
    spacing: canonicalDimensionDocument(spacing),
    size: canonicalDimensionDocument(size),
    radius: canonicalDimensionDocument(radius),
    taxonomy: snapshot.taxonomy ?? designSystemDefaults.system.taxonomy,
    formulas: (
      snapshot.scaleTypes ?? designSystemDefaults.system.scaleTypes
    ).filter((item) => formulaIds.has(item.id)),
    rules: (snapshot.rules ?? designSystemDefaults.system.rules).filter(
      (item) => ruleIds.has(item.id),
    ),
    modeSets: snapshot.modeSets,
    edits: Object.fromEntries(
      Object.entries(snapshot.browserTokenEdits ?? {}).filter(([id]) =>
        DIMENSION_SCOPES.some((domain) => id.startsWith(`${domain}-`)),
      ),
    ),
    plans: [],
  });
  // Shape validation precedes reference traversal and generation, including cache input.
  const provisional = {
    $schema: DIMENSION_FOUNDATION_SCHEMA,
    schemaVersion: 3,
    source,
    references: [],
  };
  if (!validateFoundation(provisional))
    fail(
      `Invalid dimension source: ${ajv.errorsText(validateFoundation.errors)}`,
    );
  validateSource(source);
  const defaults = Object.fromEntries(
    source.modeSets.map((axis) => [axis.id, modeSetDefaultMode(axis)!.id]),
  );
  const owners = parameterOwners(source.modeSets);
  const makePlan = (
    domain: Domain,
    scaleId: string,
    kind: GenerationPlan["kind"],
    selection: Record<string, string>,
    axes: ModeSet[],
  ) => {
    const modes = source.modeSets.map(
      (axis) =>
        axis.modes.find((mode) => mode.id === selection[axis.id]) ??
        fail(`Unknown mode selection for ${axis.key}.`),
    );
    const context = Object.fromEntries(
      axes.map((axis) => [
        axis.key,
        modes.find((mode) =>
          axis.modes.some((candidate) => candidate.id === mode.id),
        )!.key,
      ]),
    );
    source.plans.push({
      domain,
      scaleId,
      kind,
      selection: { ...selection },
      context,
      parameters: resolveModeParameterValues(
        { color: snapshot.colorSystem, typography: snapshot.typography },
        modes,
        undefined,
        { modeSets: source.modeSets },
      ),
    });
  };
  for (const domain of DIMENSION_SCOPES)
    for (const scale of source[domain].scales.filter(
      (scale) => options.includeUnpublished || isFoundationPublished(scale),
    )) {
      makePlan(domain, scale.id, "baseline", defaults, []);
      const dependencyIds = new Set(
        Object.values(scale.bindings ?? {})
          .map((binding) => owners[binding.modeParameterId])
          .filter(Boolean),
      );
      const axes = source.modeSets.filter((axis) => dependencyIds.has(axis.id));
      const count = modeCombinationCount(axes);
      if (count > 256)
        fail(
          `Recipe ${scale.id} requires ${count} bound scenarios; limit is 256.`,
        );
      const selections = modeSelections(axes, defaults);
      for (const selection of selections)
        if (axes.some((axis) => selection[axis.id] !== defaults[axis.id]))
          makePlan(domain, scale.id, "binding", selection, axes);
      const overrideSelections = new Map<string, Record<string, string>>();
      for (const [id, edit] of Object.entries(source.edits))
        if (id.startsWith(`${domain}-${scale.id}-`))
          for (const key of Object.keys(edit.values)) {
            const pairs = JSON.parse(key) as [string, string][];
            const selection = Object.fromEntries(pairs);
            if (
              Object.keys(selection).length !== pairs.length ||
              canonicalTokenModeKey(selection) !== key
            )
              fail(`Ambiguous or noncanonical mode assignment: ${id}.`);
            if (
              Object.keys(selection).length !== source.modeSets.length ||
              source.modeSets.some(
                (axis) =>
                  !axis.modes.some((mode) => mode.id === selection[axis.id]),
              )
            )
              fail(`Stale explicit mode assignment: ${id}.`);
            overrideSelections.set(key, selection);
          }
      if (overrideSelections.size > 256)
        fail(`Recipe ${scale.id} has too many explicit assignments.`);
      for (const selection of overrideSelections.values())
        makePlan(domain, scale.id, "override", selection, source.modeSets);
    }
  return source;
}

export async function dimensionSourceHash(
  source: DimensionArtifactSource,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(source)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function emit(source: DimensionArtifactSource) {
  const rows = new Map<
    string,
    { token: DimensionToken; lineage: DimensionLineage }
  >();
  const observedEdits = new Set<string>();
  const namesOnly = Object.fromEntries(
    Object.entries(source.edits).map(([id, edit]) => [
      id,
      { ...edit, values: {} },
    ]),
  );
  for (const plan of source.plans) {
    const registeredScale =
      source[plan.domain].scales.find((item) => item.id === plan.scaleId) ??
      fail("Generation plan has an unresolved recipe.");
    const scale = resolveNamedSource(
      registeredScale,
      source.taxonomy ?? fail("Dimension source must include its registry."),
      plan.domain,
    );
    if (!isFoundationPublished(scale))
      fail("Generation plan targets unpublished data.");
    const rules = [
      ...source.rules,
      ...(source[plan.domain].pendingRules ?? []),
    ];
    const values = generateDimensionScale(
      plan.domain,
      scale,
      rules,
      source.formulas,
      plan.parameters,
    );
    if (
      plan.domain === "radius" &&
      dimensionIssues(values, "non-negative").issues.some(
        (issue) => issue !== "duplicate",
      )
    )
      fail(`Invalid generated radius values in ${scale.id}.`);
    if (values.some((item) => !Number.isFinite(item.value)))
      fail(`Invalid generated ${plan.domain} values in ${scale.id}.`);
    const browserSources = browserSourcesFromOutputs(
      [],
      [],
      plan.domain === "spacing" ? [{ scale, values }] : [],
      plan.domain === "size" ? [{ scale, values }] : [],
      {
        names: undefined,
        registry:
          source.taxonomy ??
          fail("Dimension source must include its registry."),
      },
      undefined,
      plan.domain === "radius" ? [{ scale, values }] : [],
    );
    const modeKey = canonicalTokenModeKey(plan.selection);
    const legacyResolved = resolveBrowserTokens(
      browserSources,
      plan.kind === "override" ? source.edits : namesOnly,
      modeKey,
    );
    const resolved = source.taxonomy
      ? projectBrowserTokens(legacyResolved, source.taxonomy)
      : legacyResolved;
    resolved.forEach((row, index) => {
      const edit =
        plan.kind === "override"
          ? source.edits[row.id]?.values[modeKey]
          : undefined;
      if (plan.kind === "override" && !edit) return;
      if (edit) observedEdits.add(`${row.id}\0${modeKey}`);
      if (
        typeof row.value !== "number" ||
        !Number.isFinite(row.value) ||
        (plan.domain === "radius" && row.value < 0)
      )
        fail(`Invalid dimension override ${row.id}.`);
      const step = values[index].step;
      const conceptId = tokenUuid(
        `dimension-concept:${plan.domain}:${scale.id}:${step}`,
      );
      const uuid = tokenUuid(
        `dimension-row:${conceptId}:${canonicalJson(plan.context)}`,
      );
      const projection =
        row.projection ?? fail(`Unresolved dimension taxonomy for ${row.id}.`);
      if (projection.issues.length)
        fail(`Unresolved dimension taxonomy for ${row.id}.`);
      const fields = Object.fromEntries(
        Object.entries(projection.flat).map(([key, value]) => {
          if (Array.isArray(value))
            fail("Only one term per dimension name group is supported.");
          return [key, value];
        }),
      );
      const token: DimensionToken = {
        $schema: DIMENSION_TOKEN_SCHEMA,
        uuid,
        conceptId,
        name: { ...fields, scaleIndex: step, ...plan.context },
        value: `${row.value}px`,
      };
      if (!validateToken(token))
        fail(`Invalid proposed token: ${ajv.errorsText(validateToken.errors)}`);
      rows.set(uuid, {
        token,
        lineage: {
          uuid,
          domain: plan.domain,
          scaleId: scale.id,
          step,
          kind: plan.kind,
          selection: plan.selection,
          generatedValue: values[index].value,
          displayName: row.name,
          ...(row.projection && { taxonomy: row.projection }),
          ...(edit
            ? {
                edit: {
                  tokenId: row.id,
                  modeKey,
                  assignedValue: edit.value,
                  authoredBaseline: edit.baseline,
                },
              }
            : {}),
        },
      });
    });
    if (rows.size > 20000) fail("Dimension artifact token limit is 20,000.");
  }
  for (const [id, edit] of Object.entries(source.edits))
    if (Object.keys(edit.values).length) {
      const domain =
        DIMENSION_SCOPES.find((domain) => id.startsWith(`${domain}-`)) ??
        fail(`Unknown dimension assignment ${id}.`);
      const scale = source[domain].scales.find((item) =>
        id.startsWith(`${domain}-${item.id}-`),
      );
      if (scale && !isFoundationPublished(scale)) continue;
      if (
        !scale ||
        Object.keys(edit.values).some(
          (key) => !observedEdits.has(`${id}\0${key}`),
        )
      )
        fail(`Unmaterialized explicit dimension assignment: ${id}.`);
    }
  const sorted = [...rows.values()].sort((left, right) =>
    left.token.uuid.localeCompare(right.token.uuid, "en"),
  );
  return {
    tokens: sorted.map((row) => row.token),
    lineage: sorted.map((row) => row.lineage),
  };
}

export function materializeDimensionTokens(source: DimensionArtifactSource) {
  validateSource(source);
  return emit(source);
}

export async function buildDimensionArtifacts(
  source: DimensionArtifactSource,
): Promise<DimensionArtifactBundle> {
  const sourceHash = await dimensionSourceHash(source);
  const foundation: DimensionArtifactBundle["foundation"] = {
    $schema: DIMENSION_FOUNDATION_SCHEMA,
    schemaVersion: 3,
    source,
    references: [
      ...source.formulas.map((item) => ({
        kind: "formula" as const,
        owner: "library" as const,
        id: item.id,
        revision: sourceHash,
      })),
      ...source.rules.map((item) => ({
        kind: "rounding-rule" as const,
        owner: "library" as const,
        id: item.id,
        revision: sourceHash,
      })),
      ...DIMENSION_SCOPES.flatMap((domain) =>
        (source[domain].pendingRules ?? []).map((item) => ({
          kind: "rounding-rule" as const,
          owner: domain,
          id: item.id,
          revision: sourceHash,
        })),
      ),
    ],
  };
  if (!validateFoundation(foundation))
    fail(
      `Invalid foundation artifact: ${ajv.errorsText(validateFoundation.errors)}`,
    );
  return {
    schemaVersion: 3,
    profileId: DIMENSION_PROFILE,
    sourceHash,
    foundation,
    ...materializeDimensionTokens(source),
  };
}

/** Untrusted caches are checked against schema, fingerprint and reproduced output; never hydrated as source. */
export async function validateDimensionBundle(
  value: unknown,
): Promise<DimensionArtifactBundle> {
  if (!value || typeof value !== "object") fail("Invalid artifact cache.");
  const candidate = value as DimensionArtifactBundle;
  if (
    candidate.schemaVersion !== 3 ||
    candidate.profileId !== DIMENSION_PROFILE ||
    !candidate.foundation ||
    !validateFoundation(candidate.foundation)
  )
    fail("Unsupported or malformed artifact cache.");
  const rebuilt = await buildDimensionArtifacts(candidate.foundation.source);
  if (canonicalJson(candidate) !== canonicalJson(rebuilt))
    fail("Artifact cache fingerprint, references or tokens do not reproduce.");
  return rebuilt;
}
