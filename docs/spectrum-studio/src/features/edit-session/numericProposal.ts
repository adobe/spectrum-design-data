// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "./state";
import type { LayoutEdit } from "../structures/layoutScales";
import type { StructureRuleApplication } from "../structures/model";

export interface NumericLayoutEdit {
  edit: LayoutEdit;
  application?: StructureRuleApplication;
}

export type NumericSource = keyof EditSessionSnapshot;
export interface NumericProposal {
  source: NumericSource;
  previous: unknown;
  next: unknown;
}

export const numericSourceKeys: Partial<Record<string, NumericSource>> = {
  "foundations/color": "colorSystem",
  "foundations/typography": "typography",
  "foundations/icons": "icons",
  "foundations/spacing": "spacing",
  "foundations/size": "size",
  "foundations/radius": "radius",
  "foundations/elevation": "elevation",
  "foundations/opacity": "opacity",
  "design/styles": "styles",
  "design/structures": "structures",
  "rules/library": "rules",
  "logic/scale-types": "scaleTypes",
  "logic/interpolations": "interpolations",
  "modes/mode-sets": "modeSets",
  "registry/taxonomy": "taxonomy",
  "foundations/parameter-settings": "foundationParameterSettings",
};

let collect: ((proposal: NumericProposal) => void) | undefined;
let failures: string[] | undefined;
let layoutEdits: NumericLayoutEdit[] | undefined;

/** Only captures while an opted-in control invokes its existing authoring action. */
export function collectNumericProposals(
  run: () => void,
  interactions?: NumericLayoutEdit[],
) {
  const proposals: NumericProposal[] = [];
  const previous = collect;
  const previousFailures = failures;
  const previousLayoutEdits = layoutEdits;
  const errors: string[] = [];
  collect = (proposal) => proposals.push(proposal);
  failures = errors;
  layoutEdits = interactions;
  try {
    run();
    if (errors.length) throw new Error([...new Set(errors)].join(" "));
    return proposals;
  } finally {
    collect = previous;
    failures = previousFailures;
    layoutEdits = previousLayoutEdits;
  }
}

export function deferNumericLayoutEdit(input: NumericLayoutEdit) {
  if (!collect) return false;
  if (!layoutEdits)
    throw new Error("This numeric edit requires a layout-scale decision.");
  layoutEdits.push(input);
  return true;
}

export function reportNumericProposalFailure(message: string) {
  failures?.push(message);
}

export function deferNumericProposal(proposal: NumericProposal) {
  if (!collect) return false;
  collect(proposal);
  return true;
}

export function numericProposalCaptureActive() {
  return collect !== undefined;
}

export function deferNumericBatch(updates: ReadonlyMap<string, unknown>) {
  if (!collect || ![...updates.keys()].some((key) => numericSourceKeys[key]))
    return false;
  for (const key of updates.keys())
    if (!numericSourceKeys[key])
      throw new Error(
        `The numeric edit cannot defer the related ${key} update.`,
      );
  for (const [key, next] of updates)
    collect({ source: numericSourceKeys[key]!, previous: undefined, next });
  return true;
}

export function deferPersistedNumeric(
  key: string,
  previous: unknown,
  next: unknown,
) {
  const source = numericSourceKeys[key];
  return source ? deferNumericProposal({ source, previous, next }) : false;
}
