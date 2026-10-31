// Copyright 2026 Adobe. All rights reserved.
import type { TshirtVariantMapping } from "../logic/tshirt";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import type { Classification } from "../taxonomy/model";
import type {
  TSHIRT_PROFILE,
  TSHIRT_COMPOSITION_PROFILE,
  TshirtTokenRecord,
} from "./tshirtProfile";

export interface TshirtDiagnostic {
  severity: "warning";
  code: "nearest";
  message: string;
  structureId: string;
  bindingIds: string[];
  ruleIds: string[];
  size: string;
  requested: number;
  actual: number;
  targetId: string;
  context: Record<string, string>;
}

export interface TshirtSemanticRow {
  propertyId?: string;
  optionId?: string;
  canonicalName?: string;
  token: TshirtTokenRecord;
  conceptId: string;
  classification: Classification;
  structureId: string;
  structureName: string;
  bindingIds: string[];
  applicationIds: string[];
  ruleIds: string[];
  size: string;
  target: PrimitiveReference;
  context: Record<string, string>;
  selection: Record<string, string>;
  kind: "baseline" | "binding" | "override";
  mapping: Omit<TshirtVariantMapping, "target">;
}

export interface TshirtArtifactBundle {
  profile:
    | typeof TSHIRT_PROFILE
    | typeof TSHIRT_COMPOSITION_PROFILE
    | typeof import("./tshirtProfile").GENERATOR_PROFILE
    | typeof import("./tshirtProfile").TSHIRT_VARIANTS_PROFILE;
  sourceKind: "shipped" | "saved" | "working";
  tokens: TshirtTokenRecord[];
  semantics: TshirtSemanticRow[];
  primitiveLineage: {
    uuid: string;
    conceptId: string;
    nativeReference: string;
    nativeId: string;
    sourceId: string;
    index: number;
    step: number;
    context: Record<string, string>;
    selection: Record<string, string>;
  }[];
  diagnostics: TshirtDiagnostic[];
  fields: object[];
  vocabulary: {
    structures: { id: string; label: string; value: string }[];
    elements?: { id: string; label: string; value: string }[];
    sizes?: { id: string; label: string; value: string }[];
    foundationScales: { sourceId: string; label: string; value: string }[];
    physicalPositions: string[];
  };
  modeSets: {
    id: string;
    key: string;
    defaultModeId: string;
    modes: { id: string; key: string }[];
  }[];
}
