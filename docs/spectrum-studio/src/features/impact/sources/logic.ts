// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  INTERPOLATION_FIELDS,
  ruleFields,
  SCALE_TYPE_FIELDS,
} from "../../changelog/changes";
import { RULE_DEFAULTS } from "../../logic/defaults";
import { rulesAtom } from "../../logic/library";
import type { Rule } from "../../logic/model";
import {
  INTERPOLATION_DEFAULTS,
  SCALE_TYPE_DEFAULTS,
  interpolationsAtom,
  scaleTypesAtom,
} from "../../logic/scaleTypeLibrary";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

/** Each authored field of each library item is one parameter; added or removed items count every field. */
function libraryParameters(
  kind: string,
  defaults: readonly { id: string }[],
  items: readonly { id: string }[],
  fields: readonly string[],
): FoundationParameterRecord[] {
  const before = new Map(
    defaults.map((item) => [
      item.id,
      item as unknown as Record<string, unknown>,
    ]),
  );
  const after = new Map(
    items.map((item) => [item.id, item as unknown as Record<string, unknown>]),
  );
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((id) =>
    fields.map((field) => {
      const old = before.get(id);
      const next = after.get(id);
      return {
        id: `${kind}/${id}/${field}`,
        category: "logic" as const,
        edited:
          !old ||
          !next ||
          JSON.stringify(old[field]) !== JSON.stringify(next[field]),
      };
    }),
  );
}

export function ruleParameters(
  rules: readonly Rule[],
): FoundationParameterRecord[] {
  const ids = new Set([...RULE_DEFAULTS, ...rules].map((rule) => rule.id));
  return [...ids].flatMap((id) => {
    const original = RULE_DEFAULTS.find((rule) => rule.id === id),
      current = rules.find((rule) => rule.id === id);
    const fields = [
      ...new Set([
        ...(original ? ruleFields(original) : []),
        ...(current ? ruleFields(current) : []),
      ]),
    ];
    return libraryParameters(
      "rule",
      original ? [original] : [],
      current ? [current] : [],
      fields,
    );
  });
}

export const ruleSource: FoundationImpactSource = {
  id: "logic",
  recordsAtom: atom((get) => [
    ...ruleParameters(get(rulesAtom)),
    ...libraryParameters(
      "scale-type",
      SCALE_TYPE_DEFAULTS,
      get(scaleTypesAtom),
      SCALE_TYPE_FIELDS,
    ),
    ...libraryParameters(
      "interpolation",
      INTERPOLATION_DEFAULTS,
      get(interpolationsAtom),
      INTERPOLATION_FIELDS,
    ),
  ]),
};
