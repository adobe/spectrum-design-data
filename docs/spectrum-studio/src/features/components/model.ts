// Copyright 2026 Adobe. All rights reserved.
import { v4 as uuid } from "uuid";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type LiteralValue = Exclude<JsonValue, null>;
export type JsonObject = { [key: string]: JsonValue };
export type OptionType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";
export interface ComponentOption {
  type?: OptionType | OptionType[];
  values?: { value: JsonValue; description?: string; lifecycle?: JsonObject }[];
  default?: JsonValue;
  description?: string;
  $ref?: string;
  [key: string]: JsonValue | undefined;
}
export interface ComponentOptions {
  [name: string]: ComponentOption;
}
export interface DeclarationIdentities {
  [name: string]: string;
}
export interface ComponentPart {
  name: string;
  description?: string;
  required?: boolean;
  contains?: string[];
  documentBlocks?: JsonObject[];
  lifecycle?: JsonObject;
}
export interface ComponentState {
  name: string;
  description?: string;
  trigger?: "prop" | "interaction";
  precedence?: number;
  layered?: boolean;
  lifecycle?: JsonObject;
  announce?: string;
  communicates?: string;
  blocksInteraction?: boolean;
}
export interface ComponentDeclaration {
  $id: string;
  name: string;
  displayName: string;
  meta: { category: string; documentationUrl: string };
  $schema?: string;
  specVersion?: string;
  description?: string;
  implementations?: JsonObject[];
  options?: ComponentOptions;
  slots?: JsonObject[];
  anatomy?: ComponentPart[];
  states?: ComponentState[];
  lifecycle?: JsonObject;
  tokenBindings?: JsonObject[];
  documentBlocks?: JsonObject[];
  accessibility?: JsonObject;
}
export interface AssignmentScope {
  [key: string]: string | string[];
}
export interface AssignmentFields {
  id: string;
  partId?: string;
  property: TaxonomyNameReference;
  options?: AssignmentScope;
  description?: string;
  context?: string;
  $valueType?: string;
}
export type ComponentAssignment = AssignmentFields &
  ({ value: LiteralValue; $ref?: never } | { $ref: string; value?: never });
export interface ComponentRecord {
  id: string;
  catalogId?: string;
  declaration: ComponentDeclaration;
  identities: {
    parts: DeclarationIdentities;
    options: DeclarationIdentities;
    states: DeclarationIdentities;
  };
  optionOrder: string[];
  assignments: ComponentAssignment[];
}
export interface ComponentsDocument {
  schemaVersion: 2;
  components: ComponentRecord[];
}
export interface ComponentRelationship {
  uuid: string;
  scope: {
    component: string;
    property: string;
    part?: string;
    options?: AssignmentScope;
  };
  description?: string;
  context?: string;
  $valueType?: string;
  value?: LiteralValue;
  $ref?: string;
}

export const EMPTY_COMPONENTS: ComponentsDocument = {
  schemaVersion: 2,
  components: [],
};
export const componentKey = (name: string) =>
  kebabCaseNameFormatter.formatValue(name);
export function createComponent(
  declaration: ComponentDeclaration,
  id = uuid(),
): ComponentRecord {
  const identities = (names: string[]) =>
    Object.fromEntries(names.map((name) => [name, uuid()]));
  const options = identities(Object.keys(declaration.options ?? {}));
  return {
    id,
    declaration: structuredClone(declaration),
    assignments: [],
    optionOrder: Object.values(options),
    identities: {
      parts: identities(declaration.anatomy?.map((part) => part.name) ?? []),
      options,
      states: identities(declaration.states?.map((state) => state.name) ?? []),
    },
  };
}

export function renamePart(
  component: ComponentRecord,
  previous: string,
  next: string,
): ComponentRecord {
  if (!component.identities.parts[previous])
    throw new Error("This part is no longer available.");
  if (previous !== next && component.identities.parts[next])
    throw new Error("A part already uses this name.");
  const result = structuredClone(component);
  const id = result.identities.parts[previous];
  delete result.identities.parts[previous];
  result.identities.parts[next] = id;
  result.declaration.anatomy = result.declaration.anatomy?.map((part) => ({
    ...part,
    name: part.name === previous ? next : part.name,
    ...(part.contains && {
      contains: part.contains.map((name) => (name === previous ? next : name)),
    }),
  }));
  return result;
}

export function renameCondition(
  component: ComponentRecord,
  kind: "options" | "states",
  previous: string,
  next: string,
): ComponentRecord {
  const result = structuredClone(component);
  const identities = result.identities[kind];
  if (!identities[previous])
    throw new Error("This declaration is no longer available.");
  if (previous !== next && identities[next])
    throw new Error("A declaration already uses this name.");
  const id = identities[previous];
  delete identities[previous];
  identities[next] = id;
  if (kind === "states") {
    result.declaration.states = result.declaration.states?.map((state) => ({
      ...state,
      name: state.name === previous ? next : state.name,
    }));
    result.assignments = result.assignments.map((row) => ({
      ...row,
      ...(row.options?.state && {
        options: {
          ...row.options,
          state: (row.options.state as string[]).map((name) =>
            name === previous ? next : name,
          ),
        },
      }),
    }));
  } else {
    const descriptor = result.declaration.options?.[previous];
    if (!descriptor) throw new Error("This option is no longer available.");
    result.declaration.options = Object.fromEntries(
      Object.entries(result.declaration.options ?? {}).map(([name, value]) => [
        name === previous ? next : name,
        value,
      ]),
    );
    result.assignments = result.assignments.map((row) => ({
      ...row,
      ...(row.options && {
        options: Object.fromEntries(
          Object.entries(row.options).map(([name, value]) => [
            name === previous ? next : name,
            value,
          ]),
        ),
      }),
    }));
  }
  return result;
}

export function parseLiteral(
  text: string,
  type: "string" | "number" | "boolean" | "json",
): LiteralValue {
  if (type === "string") {
    if (!text.trim()) throw new Error("Enter a value.");
    return text;
  }
  if (type === "number") {
    if (!text.trim() || !Number.isFinite(Number(text)))
      throw new Error("Enter a finite number.");
    return Number(text);
  }
  const value: unknown = JSON.parse(text);
  if (type === "boolean" && typeof value !== "boolean")
    throw new Error("Enter true or false.");
  if (!isJsonValue(value) || value === null)
    throw new Error("Enter a non-null JSON value.");
  return value;
}

export function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every(isJsonValue)) ||
    (typeof value === "object" &&
      value !== null &&
      Object.values(value).every(isJsonValue))
  );
}
