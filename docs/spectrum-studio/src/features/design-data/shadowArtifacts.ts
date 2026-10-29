// Copyright 2026 Adobe. All rights reserved.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import tokenSchema from "../../data/design-data-shadow-profile/token.schema.json" with { type: "json" };
import colorSchema from "../../data/design-data-shadow-profile/value-types/color.schema.json" with { type: "json" };
import documentSchema from "../../data/design-data-shadow-profile/document-block.schema.json" with { type: "json" };
import shadowSchema from "../../data/design-data-shadow-profile/value-types/drop-shadow.schema.json" with { type: "json" };
import provenance from "../../data/design-data-shadow-profile/provenance.json" with { type: "json" };
import { generateElevation } from "../elevation/generate";
import {
  isElevationDocument,
  type ElevationDocument,
} from "../elevation/model";
import { elevationOwnerIds } from "../elevation/output";
import { resolveElevationDocument } from "../elevation/resolution";
import { isFoundationPublished } from "../foundations/types";
import { normalizeModeState } from "../modes/integrity";
import { isModeSetList, type ModeSet } from "../modes/model";
import { modeOverridesCapability } from "../modes/parameters";
import {
  contextForModes,
  modeCombinationCount,
  modeCombinations,
  selectionForModes,
} from "../modes/combinations";
import type { ScaleType } from "../scales/scaleType";
import { governedFoundationContext } from "../taxonomy/foundationGovernance";
import type { TaxonomyDocument } from "../taxonomy/model";
import { registeredSourceName } from "../taxonomy/naming";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { tokenUuid } from "../tokens/model";
import { canonicalJson } from "./canonicalJson";
import {
  SHADOW_VALUE_TYPE,
  ShadowArtifactError,
  assertShadowValue,
  projectShadowValue,
  type DraftShadowLayer,
} from "./shadowValue";
import type { ColorOutputSettings } from "../color-system/outputSettings";
import type { OpacitySource } from "../opacity/generation";
export {
  SHADOW_VALUE_TYPE,
  ShadowArtifactError,
  projectShadowValue,
  type DraftShadowLayer,
} from "./shadowValue";
export const SHADOW_PROFILE = {
  ...provenance,
  tokenSchemaId: tokenSchema.$id,
  valueSchemaId: shadowSchema.$id,
  gapId: "LTAX-007",
  limitations: [
    "Literal outset shadows only; no inset, empty-valued stacks, aliases or per-layer references.",
    "Schema and local value checks do not establish registry, resolver, DTCG or full-dataset conformance.",
    "String scaleIndex matches the draft schema but differs from the numeric field catalog and SDK slug reconstruction.",
    "Legacy schema dispatch and mode-aware reference materialization remain upstream interoperability boundaries.",
    "Modern shadow color literals are preserved; the narrower standalone color schema is not a shadow-field validator.",
  ],
} as const;

export interface DraftShadowToken {
  uuid: string;
  name: { property: "shadow"; scaleIndex: string } & Record<string, string>;
  $valueType: typeof SHADOW_VALUE_TYPE;
  value: DraftShadowLayer[];
}
export interface ShadowArtifactSource {
  sourceKind: "shipped" | "saved" | "working";
  elevation: ElevationDocument;
  taxonomy: TaxonomyDocument;
  formulas: readonly ScaleType[];
  modeSets: readonly ModeSet[];
  colorOutput?: ColorOutputSettings;
  opacitySource?: OpacitySource;
}
export interface ShadowLineage {
  uuid: string;
  conceptId: string;
  foundationId: string;
  foundationName: string;
  index: number;
  step: number;
  selection: Record<string, string>;
  layers: { id: string; opacity: number }[];
}
export interface ShadowArtifactBundle {
  profile: typeof SHADOW_PROFILE;
  sourceKind: ShadowArtifactSource["sourceKind"];
  modeSets: {
    id: string;
    key: string;
    defaultModeId: string;
    modes: { id: string; key: string }[];
  }[];
  tokens: DraftShadowToken[];
  lineage: ShadowLineage[];
}

function fail(message: string): never {
  throw new ShadowArtifactError(message);
}
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
});
addFormats(ajv);
// Upstream annotates field intent; this keyword does not resolve references.
ajv.addKeyword({
  keyword: "x-valueType",
  schemaType: ["string", "array"],
  valid: true,
});
for (const schema of [colorSchema, documentSchema, shadowSchema, tokenSchema])
  ajv.addSchema(schema);
const validateToken = ajv.compile<DraftShadowToken>(tokenSchema);
const reservedNameFields = new Set([
  ...Object.keys(tokenSchema.$defs.nameObject.properties).filter(
    (key) => !["colorScheme", "scale", "contrast"].includes(key),
  ),
  "scaleIndex",
]);
export function assertDraftShadowToken(
  value: unknown,
): asserts value is DraftShadowToken {
  if (!validateToken(value))
    fail(`invalid token envelope: ${ajv.errorsText(validateToken.errors)}`);
  if (
    value.$valueType !== SHADOW_VALUE_TYPE ||
    !value.uuid ||
    !value.name ||
    typeof value.name !== "object" ||
    !Object.values(value.name).every((field) => typeof field === "string") ||
    value.name.property !== "shadow" ||
    !/^(?:0|[1-9]\d*)$/.test(value.name.scaleIndex ?? "")
  ) {
    fail(
      "expected a literal shadow token with UUID and decimal string scaleIndex.",
    );
  }
  assertShadowValue(value.value);
}
function unique(values: readonly string[], path: string) {
  if (
    values.some((value) => !value.trim()) ||
    new Set(values).size !== values.length
  )
    fail(`${path}: empty or duplicate identity.`);
}
function sourceAxes(source: ShadowArtifactSource): ModeSet[] {
  if (!isModeSetList(source.modeSets)) fail("invalid mode-set source.");
  unique(
    source.modeSets.map((set) => set.id),
    "/modeSets/id",
  );
  unique(
    source.modeSets.map((set) => set.key),
    "/modeSets/key",
  );
  unique(
    source.modeSets.flatMap((set) => set.modes.map((mode) => mode.id)),
    "/modeSets/modes/id",
  );
  for (const set of source.modeSets) {
    unique(set.authoringCapabilities ?? [], `/modeSets/${set.id}/capabilities`);
    for (const mode of set.modes) {
      for (const capability of [
        "elevation.depth",
        "elevation.color",
      ] as const) {
        if (
          modeOverridesCapability(mode, capability) &&
          (mode.id === set.defaultModeId ||
            !set.authoringCapabilities?.includes(capability))
        ) {
          fail(
            `${set.key}/${mode.key}: ${capability} override requires a nondefault mode of its declared owner.`,
          );
        }
      }
    }
  }
  const normalized = normalizeModeState({
    modeSets: [...source.modeSets],
    selection: {},
    claims: {},
  });
  if (normalized.corrections.length)
    fail(`invalid mode ownership: ${normalized.corrections.join("; ")}`);
  const owners = elevationOwnerIds(
    source.modeSets,
    source.elevation.layers.some((layer) => layer.opacityTokenId)
      ? source.opacitySource && {
          ...source.opacitySource,
          modeSets: [...source.modeSets],
        }
      : undefined,
    source.elevation,
  );
  const axes = source.modeSets.filter((set) => owners.has(set.id));
  for (const axis of axes) {
    if (reservedNameFields.has(axis.key))
      fail(`mode key "${axis.key}" conflicts with a semantic name field.`);
    if (
      !axis.modes.length ||
      !axis.modes.some((mode) => mode.id === axis.defaultModeId)
    )
      fail(`${axis.key}: missing declared default mode.`);
    unique(
      axis.modes.map((mode) => mode.key),
      `/modeSets/${axis.id}/modes/key`,
    );
  }
  return axes;
}

export function buildShadowArtifacts(
  source: ShadowArtifactSource,
): ShadowArtifactBundle {
  if (!["shipped", "saved", "working"].includes(source.sourceKind))
    fail("declare whether the supplied source is shipped, saved or working.");
  if (!isElevationDocument(source.elevation)) fail("invalid Elevation source.");
  const foundationName = registeredSourceName(
    source.taxonomy,
    source.elevation.name,
    "elevation",
  );
  governedFoundationContext(
    source.taxonomy,
    "elevation",
    source.elevation.name,
    `elevation:${source.elevation.id}`,
  );
  const axes = sourceAxes(source);
  const count = modeCombinationCount(axes);
  if (count > 256)
    fail(
      `generation requires ${count} owning-mode combinations; limit is 256.`,
    );
  const bundle: ShadowArtifactBundle = {
    profile: structuredClone(SHADOW_PROFILE),
    sourceKind: source.sourceKind,
    modeSets: axes.map((axis) => ({
      id: axis.id,
      key: axis.key,
      defaultModeId: axis.defaultModeId,
      modes: axis.modes.map(({ id, key }) => ({ id, key })),
    })),
    tokens: [],
    lineage: [],
  };
  if (!isFoundationPublished(source.elevation)) return bundle;
  const combinations = modeCombinations(axes);
  const identities = new Set<string>();
  const names = new Set<string>();
  for (const modes of combinations) {
    const selection = selectionForModes(axes, modes);
    const context = contextForModes(axes, modes);
    const resolved = resolveElevationDocument(
      source.elevation,
      modes,
      source.modeSets,
      {},
      source.opacitySource && {
        ...source.opacitySource,
        modeSets: [...source.modeSets],
      },
    );
    for (const level of generateElevation(
      resolved,
      source.formulas,
      source.colorOutput,
    )) {
      governedFoundationContext(
        source.taxonomy,
        "elevation",
        source.elevation.name,
        `elevation:${source.elevation.id}`,
        level.step,
      );
      const uuid = tokenUuid(
        `elevation-shadow:${level.id}:${canonicalTokenModeKey(selection)}`,
      );
      const token: DraftShadowToken = {
        uuid,
        name: {
          property: "shadow",
          scaleIndex: String(level.step),
          ...context,
        },
        $valueType: SHADOW_VALUE_TYPE,
        value: projectShadowValue(level.shadows),
      };
      assertDraftShadowToken(token);
      const name = canonicalJson(token.name);
      if (identities.has(uuid) || names.has(name))
        fail("duplicate published shadow identity or name.");
      identities.add(uuid);
      names.add(name);
      bundle.tokens.push(token);
      bundle.lineage.push({
        uuid,
        conceptId: level.id,
        foundationId: source.elevation.id,
        foundationName,
        index: level.index,
        step: level.step,
        selection,
        layers: level.shadows.map((shadow) => ({
          id: shadow.layerId,
          opacity: shadow.opacity,
        })),
      });
    }
  }
  return bundle;
}
