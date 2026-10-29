// Copyright 2026 Adobe. All rights reserved.
import Ajv from "ajv";
import contractData from "../../data/classification-standard.json" with { type: "json" };
import contractSchema from "../../data/classification-standard.schema.json" with { type: "json" };
import { taxonomyValueKey } from "./model";

export interface ClassificationStandard {
  schemaVersion: 1;
  profileId: "spectrum-classification-v1-proposed";
  adoption: "proposed";
  gapId: "LTAX-011";
  representation: {
    profileId: "leonardo-flat-taxonomy-v1";
    normalization: "trim-lowercase-whole-value";
    textBinding: "registered-field-and-value-with-shared-definition";
    numericBinding: "typed-category-domain";
    termCardinality: "one";
    numericSharing: ["scaleIndex", "number"];
  };
  reference: { repository: "adobe/spectrum-design-data"; revision: string };
  facets: {
    key: string;
    name: string;
    sourceKeys: string[];
    question: string;
    valueType: "string" | "number";
    appliesTo: (
      | "token"
      | "component-part"
      | "relationship"
      | "source-reference"
    )[];
    review: "accepted-direction" | "provisional";
  }[];
  concepts: {
    id: string;
    facet: string;
    value: string;
    definition: string;
    examples: string[];
    counterexamples: string[];
  }[];
  components: {
    id: string;
    name: string;
    group: string;
    elementIds: string[];
  }[];
  retired: { value: string; reason: string }[];
  sourceReferenceKeys: string[];
  limitations: string[];
}

const validate = new Ajv({
  allErrors: true,
  strict: true,
}).compile<ClassificationStandard>(contractSchema);
export function classificationStandardIssues(value: unknown): string[] {
  if (!validate(value))
    return (validate.errors ?? []).map(
      (error) => `${error.instancePath}: ${error.message}`,
    );
  const issues: string[] = [];
  const ids = new Set<string>(),
    owners = new Map<string, string>(),
    keys = new Set<string>(),
    sourceKeys = new Set<string>();
  for (const facet of value.facets) {
    if (keys.has(facet.key)) issues.push(`Duplicate facet key: ${facet.key}.`);
    keys.add(facet.key);
    if (!facet.sourceKeys.length)
      issues.push(`${facet.key}: declare a source binding.`);
    for (const key of facet.sourceKeys) {
      if (sourceKeys.has(key))
        issues.push(`Competing source field owner: ${key}.`);
      sourceKeys.add(key);
    }
  }
  for (const concept of value.concepts) {
    if (!keys.has(concept.facet))
      issues.push(`${concept.id}: unresolved facet.`);
    if (ids.has(concept.id))
      issues.push(`Duplicate concept identity: ${concept.id}.`);
    ids.add(concept.id);
    const key = taxonomyValueKey(concept.value);
    if (owners.has(key))
      issues.push(`"${concept.value}" already belongs to ${owners.get(key)}.`);
    owners.set(key, concept.facet);
  }
  for (const component of value.components) {
    if (ids.has(component.id))
      issues.push(`Duplicate component identity: ${component.id}.`);
    ids.add(component.id);
    const key = taxonomyValueKey(component.name);
    if (owners.has(key))
      issues.push(`"${component.name}" already belongs to ${owners.get(key)}.`);
    owners.set(key, "component catalog");
    for (const id of component.elementIds) {
      if (
        !value.concepts.some(
          (concept) => concept.id === id && concept.facet === "element",
        )
      )
        issues.push(`${component.id}: unresolved abstract Element ${id}.`);
    }
  }
  for (const key of value.sourceReferenceKeys) {
    const facet = value.facets.find((entry) => entry.key === key);
    if (
      !facet ||
      facet.review !== "provisional" ||
      !facet.appliesTo.includes("source-reference")
    )
      issues.push(`Unresolved provisional source-reference facet: ${key}.`);
  }
  for (const key of value.representation.numericSharing) {
    if (value.facets.find((facet) => facet.key === key)?.valueType !== "number")
      issues.push(`${key}: numeric domain must retain its type.`);
  }
  for (const retired of value.retired)
    if (owners.has(taxonomyValueKey(retired.value)))
      issues.push(
        `Retired concept still has a standard owner: ${retired.value}.`,
      );
  return issues;
}

export function assertClassificationStandard(
  value: unknown,
): asserts value is ClassificationStandard {
  const issues = classificationStandardIssues(value);
  if (issues.length)
    throw new Error(`Invalid classification standard.\n${issues.join("\n")}`);
}

assertClassificationStandard(contractData);
export const classificationStandard: ClassificationStandard = contractData;
