// Copyright 2026 Adobe. All rights reserved.
import { taxonomyIdPattern } from "../taxonomy/model";
import type { TaxonomyDocument } from "../taxonomy/model";
import type { PortableStructuresDocument } from "./portableModel";
import type { StructureContractIssue } from "./portableConversion";

export function portableStructureIssues(
  document: PortableStructuresDocument,
  taxonomy: TaxonomyDocument,
): StructureContractIssue[] {
  const issues: StructureContractIssue[] = [];
  const definitions = new Map(
    document.structures.map((structure) => [structure.conceptId, structure]),
  );
  const identities = new Set<string>();
  const checkId = (id: string, owner: string) => {
    if (!taxonomyIdPattern.test(id) || identities.has(id))
      issues.push({
        structureId: owner,
        message: "Authored identities must be distinct UUID-v4 values.",
      });
    identities.add(id);
  };
  for (const target of [
    ...document.structures.flatMap((structure) =>
      structure.configuration.map((entry) => entry.target),
    ),
    ...document.publications.map((publication) => publication.target),
    ...document.examples.map((example) => example.target),
  ])
    if (
      !definitions.has(target.structureId) ||
      target.path.some((id) => !taxonomyIdPattern.test(id))
    )
      issues.push({
        structureId: target.structureId,
        message:
          "Targets need an available owner and a path of occurrence UUIDs.",
      });
  for (const structure of document.structures) {
    const owner = structure.conceptId;
    const issue = (message: string) =>
      issues.push({ structureId: owner, message });
    checkId(owner, owner);
    if (
      typeof structure.name === "string" &&
      (!structure.parentStructureId || !structure.name.trim())
    )
      issue("Only owned Layouts may use local names.");
    if (
      structure.parentStructureId &&
      !definitions.has(structure.parentStructureId)
    )
      issue("The containing Structure is unavailable.");
    for (const child of structure.elements ?? []) {
      checkId(child.id, owner);
      if (
        child.kind === "structureReference" &&
        !definitions.has(child.structureId)
      )
        issue("A referenced Structure is unavailable.");
    }
    for (const option of structure.options) {
      checkId(option.id, owner);
      if (option.kind === "boolean") {
        if (!option.name.trim()) issue("Give the local Boolean a name.");
        continue;
      }
      if (!option.values.some((value) => value.id === option.defaultOptionId))
        issue("The default option value is unavailable.");
      const categoryId =
        "categoryId" in option.name ? option.name.categoryId : undefined;
      if (
        categoryId !== undefined &&
        !taxonomy.categories.some(
          (category) =>
            category.id === categoryId &&
            category.scopes.includes("structures"),
        )
      )
        issue("An option references an unavailable Registry category.");
      for (const value of option.values) {
        checkId(value.id, owner);
        if (value.name.categoryId !== undefined) {
          if (
            !taxonomy.terms.some(
              (term) =>
                term.id === value.name.termId &&
                term.categoryId === value.name.categoryId,
            ) ||
            (categoryId !== undefined && categoryId !== value.name.categoryId)
          )
            issue("An option value references an incompatible Registry term.");
          if (value.classification[value.name.categoryId] !== undefined)
            issue(
              "An option value must not duplicate its Registry name assignment.",
            );
        } else if (!value.name.name.trim())
          issue("Give the local option value a name.");
      }
    }
    const writes = new Set<string>();
    for (const configuration of structure.configuration) {
      const { effect, when, target } = configuration;
      if (target.structureId !== owner)
        issue("Configuration must belong to its owning Structure.");
      if (when) {
        const option = structure.options.find(
          (option) => option.id === when.optionId,
        );
        if (
          option?.kind !== "variant" ||
          !option.values.some((value) => value.id === when.valueId) ||
          option.defaultOptionId === when.valueId
        )
          issue("Differences need an available nondefault option value.");
      }
      if (effect.kind === "elementFields") {
        if (
          !Array.isArray(effect.fields.bindings) ||
          ["orientation", "name"].some(
            (key) =>
              Object.hasOwn(effect.fields, key) ===
              effect.unset.some((field) => field === key),
          )
        )
          issue(
            "Leaf overrides must retain complete snapshots: bindings and an explicit value or removal for each optional field.",
          );
        if (
          !document.examples.some(
            (example) =>
              example.target.structureId === target.structureId &&
              JSON.stringify(example.target.path) ===
                JSON.stringify(target.path) &&
              example.elementId === effect.elementId &&
              example.when?.optionId === when?.optionId &&
              example.when?.valueId === when?.valueId,
          )
        )
          issue("A leaf snapshot needs an explicit glyph resource or null.");
      }
      if (
        effect.kind === "visibilityBinding" &&
        !structure.options.some(
          (option) =>
            option.kind === "boolean" && option.id === effect.optionId,
        )
      )
        issue("Visibility must reference an available Boolean.");
      const field =
        effect.kind === "binding" || effect.kind === "size"
          ? effect.bindingId
          : effect.kind === "order"
            ? ""
            : effect.elementId;
      const key = JSON.stringify([
        target.path,
        when ?? null,
        effect.kind,
        field,
      ]);
      if (writes.has(key))
        issue("A configuration field has duplicate assignments.");
      writes.add(key);
    }
  }
  const active = new Set<string>();
  const complete = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      issues.push({
        structureId: id,
        message:
          "Structures cannot reference themselves, directly or indirectly.",
      });
      return;
    }
    if (complete.has(id)) return;
    active.add(id);
    for (const child of definitions.get(id)?.elements ?? [])
      if (child.kind === "structureReference") visit(child.structureId);
    active.delete(id);
    complete.add(id);
  };
  for (const id of definitions.keys()) visit(id);
  const publicationTargets = new Set<string>();
  for (const publication of document.publications) {
    const key = JSON.stringify(publication.target);
    if (publicationTargets.has(key))
      issues.push({
        structureId: publication.target.structureId,
        message: "A publication target has duplicate identity records.",
      });
    publicationTargets.add(key);
  }
  const examples = new Set<string>();
  for (const example of document.examples) {
    if (
      example.when &&
      !definitions
        .get(example.target.structureId)
        ?.configuration.some(
          (entry) =>
            entry.effect.kind === "elementFields" &&
            entry.effect.elementId === example.elementId &&
            JSON.stringify(entry.target.path) ===
              JSON.stringify(example.target.path) &&
            entry.when?.optionId === example.when?.optionId &&
            entry.when?.valueId === example.when?.valueId,
        )
    )
      issues.push({
        structureId: example.target.structureId,
        message: "An option resource must belong to a complete leaf snapshot.",
      });
    const key = JSON.stringify([
      example.target,
      example.elementId,
      example.when ?? null,
    ]);
    if (examples.has(key))
      issues.push({
        structureId: example.target.structureId,
        message: "An example has duplicate resource assignments.",
      });
    examples.add(key);
  }
  return issues;
}
