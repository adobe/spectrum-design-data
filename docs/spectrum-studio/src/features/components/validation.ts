// Copyright 2026 Adobe. All rights reserved.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import bundle from "../../data/design-data-component-profile/bundle.json" with { type: "json" };
import type { TaxonomyDocument } from "../taxonomy/model";
import { canonicalJson } from "../design-data/canonicalJson";
import type {
  ComponentAssignment,
  ComponentDeclaration,
  ComponentOption,
  ComponentRecord,
  ComponentRelationship,
  ComponentsDocument,
} from "./model";
import { isJsonValue } from "./model";
import { componentRelationships } from "./projection";

export const COMPONENT_PROFILE = "spectrum-design-data-components-ctr-v1";
export const COMPONENT_REFERENCE = bundle.metadata.sourceCommit;
const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});
addFormats(ajv);
for (const schema of bundle.schemas) ajv.addSchema(schema.document);
const schema = (name: string) => {
  const source = bundle.schemas.find((schema) =>
    schema.sourcePath.endsWith(`/${name}`),
  );
  if (!source) throw new Error(`The component profile is missing ${name}.`);
  return source.id;
};
const declarationValidator = ajv.getSchema<ComponentDeclaration>(
  schema("component.schema.json"),
)!;
const relationshipsValidator = ajv.getSchema<ComponentRelationship[]>(
  schema("relationship.schema.json"),
)!;
const partValidator = ajv.getSchema(schema("anatomy-part.schema.json"))!;
const stateValidator = ajv.getSchema(schema("state-declaration.schema.json"))!;
const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const identities = (value: unknown): value is Record<string, string> =>
  object(value) &&
  Object.values(value).every(
    (id) => typeof id === "string" && idPattern.test(id),
  );
export const isComponentDeclaration = (
  value: unknown,
): value is ComponentDeclaration => declarationValidator(value) === true;

export function assertComponentValueType(valueType: string, value: unknown) {
  const id = new URL(valueType, schema("relationship.schema.json")).href;
  const validate = ajv.getSchema(id);
  if (!validate) throw new Error("This value type schema is unavailable.");
  if (!validate(value))
    throw new Error(
      `The value does not match its value type. ${ajv.errorsText(validate.errors)}`,
    );
}

function isAssignment(value: unknown): value is ComponentAssignment {
  if (
    !object(value) ||
    !exact(value, [
      "id",
      "partId",
      "property",
      "options",
      "description",
      "context",
      "$valueType",
      "value",
      "$ref",
    ]) ||
    typeof value.id !== "string" ||
    !idPattern.test(value.id) ||
    !object(value.property) ||
    !exact(value.property, ["categoryId", "termId"]) ||
    typeof value.property.categoryId !== "string" ||
    typeof value.property.termId !== "string" ||
    (value.partId !== undefined && typeof value.partId !== "string") ||
    ["description", "context", "$valueType"].some(
      (key) => value[key] !== undefined && typeof value[key] !== "string",
    )
  )
    return false;
  if (
    value.options !== undefined &&
    (!object(value.options) ||
      Object.entries(value.options).some(([key, option]) =>
        key === "state"
          ? !Array.isArray(option) ||
            !option.length ||
            !option.every((state) => typeof state === "string")
          : typeof option !== "string",
      ))
  )
    return false;
  return (
    "value" in value !== "$ref" in value &&
    ("value" in value
      ? value.value !== null && isJsonValue(value.value)
      : typeof value.$ref === "string" && idPattern.test(value.$ref))
  );
}
function isRecord(value: unknown): value is ComponentRecord {
  if (
    !(
      object(value) &&
      exact(value, [
        "id",
        "catalogId",
        "declaration",
        "identities",
        "optionOrder",
        "assignments",
      ]) &&
      (value.catalogId === undefined || typeof value.catalogId === "string") &&
      typeof value.id === "string" &&
      idPattern.test(value.id) &&
      isComponentDeclaration(value.declaration) &&
      object(value.identities) &&
      exact(value.identities, ["parts", "options", "states"]) &&
      identities(value.identities.parts) &&
      identities(value.identities.options) &&
      identities(value.identities.states)
    )
  )
    return false;
  const options = value.identities.options;
  return (
    Array.isArray(value.optionOrder) &&
    value.optionOrder.every(
      (id) => typeof id === "string" && idPattern.test(id),
    ) &&
    new Set(value.optionOrder).size === value.optionOrder.length &&
    value.optionOrder.length === Object.keys(options).length &&
    value.optionOrder.every((id) => Object.values(options).includes(id)) &&
    Array.isArray(value.assignments) &&
    value.assignments.every(isAssignment)
  );
}
export function isComponentsDocument(
  value: unknown,
): value is ComponentsDocument {
  return (
    object(value) &&
    exact(value, ["schemaVersion", "components"]) &&
    value.schemaVersion === 2 &&
    Array.isArray(value.components) &&
    value.components.every(isRecord)
  );
}

export function optionValueIssues(
  option: ComponentOption,
  value: unknown,
): string[] {
  const { values, lifecycle, description, ...constraint } = option;
  void lifecycle;
  void description;
  if (option.$ref && !ajv.getSchema(option.$ref))
    return ["The option type schema is unavailable."];
  const validate = ajv.compile({
    ...constraint,
    ...(values && { enum: values.map((entry) => entry.value) }),
  });
  return validate(value)
    ? []
    : [ajv.errorsText(validate.errors, { separator: ". " })];
}
export function assertComponentDocument(
  document: ComponentsDocument,
  taxonomy?: TaxonomyDocument,
) {
  if (!isComponentsDocument(document))
    throw new Error(
      "The component data has an invalid declaration, identity or value assignment.",
    );
  const claimed = new Set<string>();
  const claim = (value: string, kind: string) => {
    if (!value.trim() || claimed.has(`${kind}:${value}`))
      throw new Error(`Duplicate or empty ${kind}: ${value}.`);
    claimed.add(`${kind}:${value}`);
  };
  for (const component of document.components) {
    const declaration = component.declaration;
    claim(declaration.name.toLowerCase(), "component name");
    claim(declaration.$id, "document URI");
    claim(component.id, "UUID");
    if (component.catalogId) claim(component.catalogId, "catalog entry");
    const names = {
      parts: declaration.anatomy?.map((part) => part.name) ?? [],
      options: Object.keys(declaration.options ?? {}),
      states: declaration.states?.map((state) => state.name) ?? [],
    };
    for (const kind of ["parts", "options", "states"] as const) {
      if (
        new Set(names[kind]).size !== names[kind].length ||
        canonicalJson([...names[kind]].sort()) !==
          canonicalJson(Object.keys(component.identities[kind]).sort())
      )
        throw new Error(
          `Each ${kind} declaration needs a unique, stable identity.`,
        );
      for (const id of Object.values(component.identities[kind]))
        claim(id, "UUID");
    }
    const visited = new Set<string>(),
      active = new Set<string>();
    const visit = (name: string) => {
      if (active.has(name))
        throw new Error("Parts cannot contain themselves or form a cycle.");
      if (visited.has(name)) return;
      const part = declaration.anatomy?.find((part) => part.name === name);
      if (!part)
        throw new Error(`Contains references an unavailable part: ${name}.`);
      active.add(name);
      for (const child of part.contains ?? []) visit(child);
      active.delete(name);
      visited.add(name);
    };
    for (const part of declaration.anatomy ?? []) {
      if (!partValidator(part))
        throw new Error(ajv.errorsText(partValidator.errors));
      visit(part.name);
    }
    for (const state of declaration.states ?? [])
      if (!stateValidator(state))
        throw new Error(ajv.errorsText(stateValidator.errors));
    for (const option of Object.values(declaration.options ?? {})) {
      if (
        option.values &&
        new Set(option.values.map((entry) => canonicalJson(entry.value)))
          .size !== option.values.length
      )
        throw new Error("Allowed option values must be unique.");
      if ("default" in option) {
        const issues = optionValueIssues(option, option.default);
        if (issues.length)
          throw new Error(`The option default is invalid. ${issues.join(" ")}`);
      }
      for (const value of option.values ?? []) {
        const issues = optionValueIssues(option, value.value);
        if (issues.length)
          throw new Error(
            `An allowed option value is invalid. ${issues.join(" ")}`,
          );
      }
    }
    for (const row of component.assignments) {
      claim(row.id, "UUID");
      if (
        row.partId &&
        !Object.values(component.identities.parts).includes(row.partId)
      )
        throw new Error(
          "This part is used by a property assignment. Remove or remap the assignment first.",
        );
      for (const [key, value] of Object.entries(row.options ?? {})) {
        if (key === "state") {
          if (
            !Array.isArray(value) ||
            new Set(value).size !== value.length ||
            value.some((name) => !names.states.includes(name))
          )
            throw new Error(
              "Choose declared, distinct states in the order you need.",
            );
        } else {
          const option = declaration.options?.[key];
          if (option?.type === "boolean")
            throw new Error(
              "Boolean API options do not have an automatic relationship condition mapping. Use a declared state where appropriate.",
            );
          if (
            option?.values &&
            !option.values.some((entry) => entry.value === value)
          )
            throw new Error(`Choose a declared value for ${key}.`);
        }
      }
    }
    if (taxonomy) {
      const rows = componentRelationships(component, taxonomy);
      if (!relationshipsValidator(rows))
        throw new Error(
          `Invalid component relationships. ${ajv.errorsText(relationshipsValidator.errors)}`,
        );
      for (const row of rows)
        if (row.$valueType) {
          if (row.value !== undefined)
            assertComponentValueType(row.$valueType, row.value);
        }
    }
  }
}
