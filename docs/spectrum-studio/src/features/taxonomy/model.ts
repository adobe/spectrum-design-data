// Copyright 2026 Adobe. All rights reserved.
import { kebabCaseNameFormatter, serializeTaxonomyPath } from "./formatting";
import { numericValuesMayBeShared, taxonomyValueIssue } from "./valueDomains";

export type DimensionScope = "spacing" | "size" | "radius";
export const DIMENSION_SCOPES = ["spacing", "size", "radius"] as const;
export type TaxonomyScope =
  | "colors"
  | "typography"
  | "elevation"
  | "opacity"
  | "structures"
  | DimensionScope;
export type TaxonomyValue = string | number;
export interface TaxonomyCategory {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  id: string;
  key: string;
  name: string;
  description: string;
  valueType: "string" | "number";
  cardinality: "one" | "ordered";
  scopes: TaxonomyScope[];
  required: boolean;
  includeInProjections: boolean;
}
export interface TaxonomyTerm {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  id: string;
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  categoryId: string;
  value: TaxonomyValue;
  description: string;
}
export interface Classification {
  [categoryId: string]: string | string[];
}
export interface TaxonomySourceContext {
  id: string;
  stepId?: string;
  governed?: Classification;
}
export interface TaxonomyDocument {
  schemaVersion: 1;
  categories: TaxonomyCategory[];
  terms: TaxonomyTerm[];
  order: string[];
  classifications: { [tokenId: string]: Classification };
}
export interface TaxonomySegment {
  categoryId: string;
  categoryName: string;
  key: string;
  termIds: string[];
  values: TaxonomyValue[];
}
export interface TaxonomyProjection {
  classification: Classification;
  segments: TaxonomySegment[];
  name: string;
  flat: Record<string, TaxonomyValue | TaxonomyValue[]>;
  issues: string[];
}
export const taxonomyValueKey = (value: TaxonomyValue) =>
  String(value).trim().toLowerCase();
export const taxonomySurfaceSourceId = (id: string) => `surface:${id}`;
export const taxonomyColorSourceId = (id: string) => `color-scale:${id}`;
export const taxonomyPaletteSourceId = (id: string) => `palette:${id}`;
export const taxonomyDimensionSourceId = (scope: DimensionScope, id: string) =>
  `${scope}:${id}`;
const scopes: TaxonomyScope[] = [
  "colors",
  "typography",
  "elevation",
  "opacity",
  "structures",
  ...DIMENSION_SCOPES,
];
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const knownFields = (value: Record<string, unknown>, fields: string[]) =>
  Object.keys(value).every((key) => fields.includes(key));
export const taxonomyIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const taxonomyEmissionKey = (id: string) =>
  `taxonomy${id.replaceAll("-", "")}`;

export function taxonomyIssues(value: unknown): string[] {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.terms) ||
    !Array.isArray(value.order) ||
    !object(value.classifications)
  )
    return ["Unsupported or malformed taxonomy document."];
  const issues: string[] = [];
  if (
    !knownFields(value, [
      "schemaVersion",
      "categories",
      "terms",
      "order",
      "classifications",
    ])
  )
    issues.push("Unknown taxonomy document fields.");
  const termEntries = value.terms;
  const ids = new Set<string>(),
    keys = new Set<string>();
  for (const category of value.categories) {
    if (
      !object(category) ||
      !knownFields(category, [
        "id",
        "key",
        "name",
        "description",
        "valueType",
        "cardinality",
        "scopes",
        "required",
        "includeInProjections",
      ]) ||
      typeof category.id !== "string" ||
      !taxonomyIdPattern.test(category.id) ||
      typeof category.key !== "string" ||
      !/^[a-z][a-zA-Z0-9]*$/.test(category.key) ||
      typeof category.name !== "string" ||
      !category.name.trim() ||
      typeof category.description !== "string" ||
      !["string", "number"].includes(String(category.valueType)) ||
      !["one", "ordered"].includes(String(category.cardinality)) ||
      !Array.isArray(category.scopes) ||
      !category.scopes.length ||
      category.scopes.some((scope) => !scopes.includes(scope)) ||
      new Set(category.scopes).size !== category.scopes.length ||
      typeof category.required !== "boolean" ||
      typeof category.includeInProjections !== "boolean"
    ) {
      issues.push("Malformed category, field key, type, cardinality or scope.");
      continue;
    }
    if (ids.has(category.id) || keys.has(category.key))
      issues.push(`Duplicate category ID or field key: ${category.key}.`);
    ids.add(category.id);
    keys.add(category.key);
  }
  if (
    value.order.length !== ids.size ||
    new Set(value.order).size !== ids.size ||
    value.order.some((id) => typeof id !== "string" || !ids.has(id))
  )
    issues.push("Global order must contain every category exactly once.");
  const terms = new Set<string>(),
    values = new Map<
      string,
      { categoryId: string; value: TaxonomyValue; owner: string }[]
    >();
  const categoryDescriptors: Pick<
    TaxonomyCategory,
    "id" | "key" | "valueType"
  >[] = value.categories.flatMap(
    (category): Pick<TaxonomyCategory, "id" | "key" | "valueType">[] =>
      object(category) &&
      typeof category.id === "string" &&
      typeof category.key === "string" &&
      (category.valueType === "number" || category.valueType === "string")
        ? [
            {
              id: category.id,
              key: category.key,
              valueType: category.valueType,
            },
          ]
        : [],
  );
  for (const term of value.terms) {
    if (
      !object(term) ||
      !knownFields(term, ["id", "categoryId", "value", "description"]) ||
      typeof term.id !== "string" ||
      !taxonomyIdPattern.test(term.id) ||
      typeof term.categoryId !== "string" ||
      !taxonomyIdPattern.test(term.categoryId) ||
      typeof term.description !== "string" ||
      !["string", "number"].includes(typeof term.value) ||
      (typeof term.value === "number" && !Number.isFinite(term.value)) ||
      !String(term.value).trim()
    ) {
      issues.push("Malformed term or typed value.");
      continue;
    }
    const category = value.categories.find(
      (item) => object(item) && item.id === term.categoryId,
    );
    if (!category || typeof term.value !== category.valueType)
      issues.push(
        `Unresolved category or incompatible type for term ${term.id}.`,
      );
    if (
      category &&
      (category.valueType === "number" || category.valueType === "string") &&
      typeof category.key === "string"
    ) {
      const issue = taxonomyValueIssue(
        { key: category.key, valueType: category.valueType },
        term.value as TaxonomyValue,
      );
      if (issue) issues.push(`${term.id}: ${issue}`);
    }
    if (terms.has(term.id) || ids.has(term.id))
      issues.push(`Duplicate taxonomy ID: ${term.id}.`);
    terms.add(term.id);
    const key = taxonomyValueKey(term.value as TaxonomyValue);
    const record = {
      categoryId: term.categoryId,
      value: term.value as TaxonomyValue,
      owner: String(category?.name ?? term.categoryId),
    };
    const prior = values.get(key) ?? [];
    for (const owner of prior)
      if (!numericValuesMayBeShared(record, owner, categoryDescriptors)) {
        issues.push(
          `"${String(term.value).trim()}" is already owned by category ${owner.owner}.`,
        );
      }
    values.set(key, [...prior, record]);
  }
  const assignments: [string, unknown][] = Object.entries(
    value.classifications,
  );
  for (const [tokenId, classification] of assignments) {
    if (!tokenId.trim() || !object(classification)) {
      issues.push("Malformed token classification.");
      continue;
    }
    for (const [categoryId, assignment] of Object.entries(classification)) {
      const category = value.categories.find(
        (item) => object(item) && item.id === categoryId,
      );
      const references = Array.isArray(assignment) ? assignment : [assignment];
      if (
        !category ||
        (category.cardinality === "one"
          ? typeof assignment !== "string"
          : !Array.isArray(assignment)) ||
        !references.length ||
        new Set(references).size !== references.length ||
        references.some(
          (id) =>
            typeof id !== "string" ||
            !termEntries.some(
              (term) =>
                object(term) &&
                term.id === id &&
                term.categoryId === categoryId,
            ),
        )
      )
        issues.push(
          `${tokenId}: unresolved or incompatible classification in ${categoryId}.`,
        );
    }
  }
  return issues;
}
export const isTaxonomyDocument = (value: unknown): value is TaxonomyDocument =>
  taxonomyIssues(value).length === 0;
export function assertTaxonomy(
  value: unknown,
): asserts value is TaxonomyDocument {
  const issues = taxonomyIssues(value);
  if (issues.length) throw new Error(issues.join("\n"));
}

interface ProjectionContext {
  issues: string[];
  categories: Map<string, TaxonomyCategory>;
  terms: Map<string, Map<string, TaxonomyTerm>>;
  projections: Map<string, TaxonomyProjection>;
}
const projectionContexts = new WeakMap<TaxonomyDocument, ProjectionContext>();

/** Reuse validation/indexes during a synchronous, read-only projection batch. */
export function withTaxonomyProjection<T>(
  document: TaxonomyDocument,
  project: () => T,
): T {
  if (projectionContexts.has(document)) return project();
  const categories = new Map<string, TaxonomyCategory>();
  const terms = new Map<string, Map<string, TaxonomyTerm>>();
  for (const category of document.categories)
    if (!categories.has(category.id)) categories.set(category.id, category);
  for (const term of document.terms) {
    const categoryTerms =
      terms.get(term.categoryId) ?? new Map<string, TaxonomyTerm>();
    if (!categoryTerms.has(term.id)) categoryTerms.set(term.id, term);
    terms.set(term.categoryId, categoryTerms);
  }
  projectionContexts.set(document, {
    issues: taxonomyIssues(document),
    categories,
    terms,
    projections: new Map(),
  });
  try {
    return project();
  } finally {
    projectionContexts.delete(document);
  }
}

function copyProjection(
  projection: TaxonomyProjection,
  classification: Classification,
): TaxonomyProjection {
  return {
    ...projection,
    classification,
    issues: [...projection.issues],
    segments: projection.segments.map((segment) => ({
      ...segment,
      termIds: [...segment.termIds],
      values: [...segment.values],
    })),
    flat: Object.fromEntries(
      Object.entries(projection.flat).map(([key, value]) => [
        key,
        Array.isArray(value) ? [...value] : value,
      ]),
    ),
  };
}

export function projectClassification(
  document: TaxonomyDocument,
  classification: Classification,
  scope: TaxonomyScope,
): TaxonomyProjection {
  const context = projectionContexts.get(document);
  const key =
    context && JSON.stringify([scope, Object.entries(classification)]);
  const cached = key && context?.projections.get(key);
  if (cached) return copyProjection(cached, classification);
  const issues = context ? [...context.issues] : taxonomyIssues(document);
  const segments: TaxonomySegment[] = [],
    flat: TaxonomyProjection["flat"] = {};
  for (const id of Object.keys(classification))
    if (
      context
        ? !context.categories.has(id)
        : !document.categories.some((category) => category.id === id)
    )
      issues.push(`Unknown category ${id}.`);
  for (const id of document.order) {
    const category = context
      ? context.categories.get(id)
      : document.categories.find((item) => item.id === id);
    if (!category) continue;
    const assignment = classification[id];
    if (assignment === undefined) {
      if (category.required && category.scopes.includes(scope))
        issues.push(`Missing required ${category.name}.`);
      continue;
    }
    if (!category.scopes.includes(scope))
      issues.push(`${category.name} does not apply to ${scope}.`);
    if (category.cardinality !== "one" || Array.isArray(assignment))
      issues.push(
        `Only one term per group is supported. Review ${category.name} without discarding its existing assignments.`,
      );
    const termIds = Array.isArray(assignment) ? [...assignment] : [assignment];
    if (new Set(termIds).size !== termIds.length)
      issues.push(`Duplicate ${category.name} term references.`);
    if (
      category.cardinality === "one"
        ? Array.isArray(assignment)
        : !Array.isArray(assignment)
    )
      issues.push(`Invalid cardinality for ${category.name}.`);
    const values = termIds.flatMap((termId) => {
      const term = context
        ? context.terms.get(id)?.get(termId)
        : document.terms.find(
            (item) => item.id === termId && item.categoryId === id,
          );
      if (!term) {
        issues.push(`Unresolved ${category.name} term ${termId}.`);
        return [];
      }
      return [term.value];
    });
    if (!values.length) {
      issues.push(`Empty ${category.name} assignment.`);
      continue;
    }
    flat[category.key] = category.cardinality === "one" ? values[0] : values;
    if (category.includeInProjections)
      segments.push({
        categoryId: id,
        categoryName: category.name,
        key: category.key,
        termIds,
        values,
      });
  }
  if (!segments.length) issues.push("No included classification segments.");
  for (const segment of segments)
    if (
      segment.values.some((value) => !kebabCaseNameFormatter.formatValue(value))
    ) {
      issues.push(
        `${segment.categoryName} contains a term that cannot generate a token-name segment.`,
      );
    }
  const projection = {
    classification,
    segments,
    flat,
    name: serializeTaxonomyPath(segments),
    issues,
  };
  if (context && key && context.projections.size < 2048)
    context.projections.set(key, copyProjection(projection, classification));
  return projection;
}

export function resolveEvidence(
  document: TaxonomyDocument,
  evidence: Record<string, TaxonomyValue>,
  scope: TaxonomyScope,
): TaxonomyProjection {
  const classification: Classification = {};
  const issues: string[] = [];
  for (const [key, value] of Object.entries(evidence)) {
    const category = document.categories.find((item) => item.key === key);
    const term = document.terms.find(
      (item) =>
        item.categoryId === category?.id &&
        taxonomyValueKey(item.value) === taxonomyValueKey(value),
    );
    if (
      !category ||
      !term ||
      term.categoryId !== category.id ||
      typeof term.value !== typeof value
    )
      issues.push(
        `Unmapped ${key}: ${value}. Review and select a registered term.`,
      );
    else
      classification[category.id] =
        category.cardinality === "ordered" ? [term.id] : term.id;
  }
  const projection = projectClassification(document, classification, scope);
  return { ...projection, issues: [...issues, ...projection.issues] };
}

export function resolveSourceClassification(
  document: TaxonomyDocument,
  sourceId: string,
  evidence: Record<string, TaxonomyValue>,
  scope: TaxonomyScope,
  context?: TaxonomySourceContext,
): TaxonomyProjection {
  if (context?.governed) {
    const projection = projectClassification(document, context.governed, scope);
    if (document.classifications[sourceId]) {
      projection.issues.push(
        "Generated classification is governed by the foundation; remove token overrides.",
      );
    }
    return projection;
  }
  const explicit = document.classifications[sourceId];
  if (explicit) return projectClassification(document, explicit, scope);
  return resolveEvidence(document, evidence, scope);
}

export function registerTerm(
  document: TaxonomyDocument,
  categoryId: string,
  value: TaxonomyValue,
  id: string,
): TaxonomyDocument {
  const category = document.categories.find((item) => item.id === categoryId);
  if (!category) throw new Error("Choose an available Registry category.");
  const issue = taxonomyValueIssue(category, value);
  if (issue) throw new Error(issue);
  const existing = document.terms.find(
    (term) =>
      term.categoryId === categoryId &&
      taxonomyValueKey(term.value) === taxonomyValueKey(value),
  );
  if (existing) {
    if (
      existing.categoryId !== categoryId ||
      typeof existing.value !== typeof value
    )
      throw new Error(
        `"${value}" is already owned by ${document.categories.find((category) => category.id === existing.categoryId)?.name}. Explicit remapping is required.`,
      );
    return document;
  }
  const conflict = document.terms.find(
    (term) =>
      taxonomyValueKey(term.value) === taxonomyValueKey(value) &&
      !numericValuesMayBeShared(
        { categoryId, value },
        term,
        document.categories,
      ),
  );
  if (conflict)
    throw new Error(
      `"${value}" is already owned by ${document.categories.find((item) => item.id === conflict.categoryId)?.name}. Explicit remapping is required.`,
    );
  const next = {
    ...document,
    terms: [
      ...document.terms,
      {
        id,
        categoryId,
        value: typeof value === "string" ? value.trim() : value,
        description: "",
      },
    ],
  };
  assertTaxonomy(next);
  return next;
}

export function updateTaxonomy(
  previous: TaxonomyDocument,
  next: TaxonomyDocument,
): TaxonomyDocument {
  assertTaxonomy(next);
  if (next.categories.some((category) => category.cardinality !== "one"))
    throw new Error(
      "Use one term per category. Imported ordered assignments must be reviewed before editing.",
    );
  for (const collection of ["categories", "terms"] as const) {
    const removed = previous[collection].some(
      (entry) =>
        !next[collection].some((candidate) => candidate.id === entry.id),
    );
    const added = next[collection].some(
      (entry) =>
        !previous[collection].some((candidate) => candidate.id === entry.id),
    );
    if (removed && added)
      throw new Error(
        "Registry identities are immutable. Add new entries and remove unused entries as separate changes.",
      );
  }
  for (const category of previous.categories) {
    const after = next.categories.find(
      (candidate) => candidate.id === category.id,
    );
    if (after && after.key !== category.key)
      throw new Error(
        "Category field mapping is immutable. Rename the category without changing its internal field.",
      );
    if (
      !after &&
      next.categories.some((candidate) => candidate.key === category.key)
    )
      throw new Error("Category identity is immutable.");
  }
  for (const term of previous.terms) {
    const after = next.terms.find((candidate) => candidate.id === term.id);
    if (after && after.categoryId !== term.categoryId)
      throw new Error(
        "Term ownership is immutable. Remap references to a new registered term before removing the old term.",
      );
  }
  for (const [tokenId, classification] of Object.entries(
    previous.classifications,
  )) {
    for (const categoryId of Object.keys(classification)) {
      const before = previous.categories.find(
        (category) => category.id === categoryId,
      );
      const after = next.categories.find(
        (category) => category.id === categoryId,
      );
      if (
        next.classifications[tokenId]?.[categoryId] &&
        before &&
        after &&
        (before.valueType !== after.valueType ||
          before.cardinality !== after.cardinality)
      )
        throw new Error(
          "Remap referenced classifications before changing type or cardinality.",
        );
    }
  }
  return structuredClone(next);
}
