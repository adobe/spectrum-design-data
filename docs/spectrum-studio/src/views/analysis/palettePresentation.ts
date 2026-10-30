// Copyright 2026 Adobe. All rights reserved.
import type { ChangeField, ChangeItem } from "../../features/changelog/changes";
import type {
  PaletteConceptAssessment,
  PaletteDifference,
} from "../../features/design-data/paletteAssessment";
import { canonicalJson } from "../../features/design-data/canonicalJson";
import { createValuePreview } from "../../features/tokens/valuePreview";

const fieldLabel = (key: string) => {
  const words = key.replace(
    /([a-z])([A-Z])/g,
    (_, before: string, after: string) => `${before} ${after.toLowerCase()}`,
  );
  return words.charAt(0).toUpperCase() + words.slice(1);
};
export const paletteContextLabel = (context: Record<string, string>) =>
  Object.entries(context)
    .map(([key, value]) =>
      ["colorScheme", "contrast"].includes(key)
        ? fieldLabel(value)
        : `${fieldLabel(key)}: ${value}`,
    )
    .join(" / ") || "Context unavailable";

interface PropertyValue {
  value?: unknown;
  container?: "Object" | "List";
}

function properties(value: unknown, path = ""): Map<string, PropertyValue> {
  if (value !== null && typeof value === "object") {
    return new Map([
      [path, { container: Array.isArray(value) ? "List" : "Object" }],
      ...Object.entries(value).flatMap(([key, member]) => [
        ...properties(
          member,
          `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`,
        ),
      ]),
    ]);
  }
  return new Map([[path, { value }]]);
}

function display(value: unknown, other?: unknown): string {
  if (value === undefined) return "Not set";
  if (value === null) return "None";
  if (typeof value === "object")
    return "Structured value (not a concrete color)";
  if (value === "") return "Empty text";
  if (typeof value !== typeof other && other !== undefined) {
    if (typeof value === "string") return `${value} (text)`;
    if (typeof value === "number") return `${value} (number)`;
  }
  return String(value);
}

export function paletteDifferenceFields(
  difference: PaletteDifference,
): ChangeField[] {
  const fields: ChangeField[] = [];
  const label = fieldLabel(difference.field);
  if (difference.appField !== difference.field)
    fields.push({
      key: `${label} field`,
      before: difference.appField,
      after: difference.field,
    });
  const before = properties(difference.app);
  const after = properties(difference.reference);
  for (const path of new Set([...before.keys(), ...after.keys()])) {
    const left = before.get(path);
    const right = after.get(path);
    if (left?.container && left.container === right?.container) continue;
    if (
      !left?.container &&
      !right?.container &&
      typeof left?.value === typeof right?.value &&
      Object.is(left?.value, right?.value)
    )
      continue;
    fields.push({
      key: `${label}${path ? ` ${path}` : ""}${left?.container || right?.container ? " type" : ""}`,
      before: left?.container ?? display(left?.value, right?.value),
      after: right?.container ?? display(right?.value, left?.value),
    });
  }
  return fields;
}

const item = (
  concept: PaletteConceptAssessment,
  kind: string,
  fields: ChangeField[],
): ChangeItem => ({
  id: `${concept.id}:${kind}`,
  title: concept.label,
  topic: "tokens",
  sourceKind: "token",
  kind: "modified",
  fields,
});

export function paletteClassificationChanges(
  concept: PaletteConceptAssessment,
): ChangeItem {
  const fields = new Map<string, ChangeField & { contexts: string[] }>();
  for (const row of concept.rows) {
    for (const difference of row.differences) {
      for (const field of paletteDifferenceFields(difference)) {
        const key = canonicalJson([field.key, field.before, field.after]);
        const previous = fields.get(key);
        const context = paletteContextLabel(row.context);
        if (previous) previous.contexts.push(context);
        else fields.set(key, { ...field, contexts: [context] });
      }
    }
  }
  return item(
    concept,
    "classification",
    [...fields].map(([key, field]) => ({
      key: field.key,
      id: key,
      before: field.before,
      after: field.after,
      ...(new Set(field.contexts).size !== concept.rows.length && {
        context: { key, label: [...new Set(field.contexts)].join(", ") },
      }),
    })),
  );
}

export function paletteValueChanges(
  concept: PaletteConceptAssessment,
): ChangeItem {
  return item(
    concept,
    "values",
    concept.rows.map(
      (row): ChangeField => ({
        id: row.reference.id,
        key: "Color value",
        context: {
          key: row.reference.id,
          label: paletteContextLabel(row.context),
        },
        before: row.app
          ? display(row.app.value)
          : row.counterpart === "ambiguous"
            ? "Multiple counterparts"
            : "No counterpart",
        after: display(row.reference.value),
        ...(row.value !== "unassessable" &&
          row.app &&
          typeof row.app.value === "string" && {
            beforePreview: createValuePreview("color", row.app.value),
          }),
        ...(typeof row.reference.value === "string" &&
          !row.reference.reference && {
            afterPreview: createValuePreview("color", row.reference.value),
          }),
      }),
    ),
  );
}
