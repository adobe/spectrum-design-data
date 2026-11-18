// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { ICONS_DEFAULTS } from "../../icons/defaults";
import { iconsDocumentAtom } from "../../icons/documentState";
import type { IconsDocument } from "../../icons/model";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

const SCALE_FIELDS = [
  "name",
  "source",
  "lineHeightId",
  "scaleTypeId",
  "base",
  "below",
  "above",
  "startStep",
  "parameters",
  "bindings",
] as const;

function parameters(document: IconsDocument): Map<string, unknown> {
  const values = new Map<string, unknown>([
    ["roundingRuleId", document.roundingRuleId],
    ["minIconSize", document.minIconSize],
    ["maxIconSize", document.maxIconSize],
    ["scaleOrder", document.scales.map((scale) => scale.id)],
  ]);
  for (const scale of document.scales)
    for (const field of SCALE_FIELDS)
      values.set(`${scale.id}/${field}`, scale[field]);
  return values;
}

/** Settings and each authored scale field are parameters; added or removed scales count every field. */
export function iconsFoundationParameters(
  document: IconsDocument,
  defaults: IconsDocument = ICONS_DEFAULTS,
): FoundationParameterRecord[] {
  const before = parameters(defaults),
    after = parameters(document);
  return [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
    id: `icons/${id}`,
    category: "icons",
    edited:
      before.has(id) !== after.has(id) ||
      JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)),
  }));
}

export const iconsFoundationSource: FoundationImpactSource = {
  id: "icons-foundation",
  recordsAtom: atom((get) => iconsFoundationParameters(get(iconsDocumentAtom))),
};
