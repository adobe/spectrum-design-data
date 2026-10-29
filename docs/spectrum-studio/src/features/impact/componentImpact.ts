// Copyright 2026 Adobe. All rights reserved.
import type {
  ComponentAssignment,
  ComponentsDocument,
} from "../components/model";
import {
  componentTokenCatalog,
  type ComponentToken,
} from "../components/references";
import { canonicalJson } from "../design-data/canonicalJson";
import type { EditSessionSnapshot } from "../edit-session/state";
import type { Ratio } from "./model";
import { ratio } from "./summaries";

export interface ComponentImpactRow {
  id: string;
  name: string;
  /** Assignments in this component whose effective value changed, out of all of its assignments. */
  affected: Ratio;
}
export interface ComponentImpactSummary {
  /** Assignments whose effective value changed, out of all assignments in all components. */
  affected: Ratio;
  components: ComponentImpactRow[];
}
export type ComponentImpactResult =
  | { status: "ready"; summary: ComponentImpactSummary }
  | { status: "unavailable"; error: string };

const MISSING = "\u0000missing";
const UNAVAILABLE = "\u0000unavailable";

/** The value an assignment gives its component: its literal, or the value of the token it references. */
function effectiveValue(
  row: ComponentAssignment,
  tokens: ReadonlyMap<string, ComponentToken>,
): string {
  if ("$ref" in row && row.$ref !== undefined) {
    const token = tokens.get(row.$ref);
    if (!token) return MISSING;
    return token.outputError ? UNAVAILABLE : canonicalJson(token.value);
  }
  return canonicalJson("value" in row ? row.value : null);
}

interface Entry {
  component: string;
  name: string;
  value: string;
}
function entries(
  document: ComponentsDocument | undefined,
  tokens: ReadonlyMap<string, ComponentToken>,
) {
  const result = new Map<string, Entry>();
  for (const component of document?.components ?? []) {
    for (const row of component.assignments) {
      result.set(`${component.id}/${row.id}`, {
        component: component.id,
        name: component.declaration.displayName,
        value: effectiveValue(row, tokens),
      });
    }
  }
  return result;
}

/**
 * Component impact counts assignments, not components. Every assignment counts once, so twenty references to one
 * token in one component weigh twenty. The denominator is every assignment in every component, in either the
 * shipped or the working data (additions and removals use the union). An assignment is affected when it exists on
 * only one side or its effective value differs. Literal values are included in the denominator.
 */
export function summarizeComponentImpact(
  shipped: ComponentsDocument | undefined,
  working: ComponentsDocument | undefined,
  shippedTokens: ReadonlyMap<string, ComponentToken>,
  workingTokens: ReadonlyMap<string, ComponentToken>,
): ComponentImpactSummary {
  const before = entries(shipped, shippedTokens),
    after = entries(working, workingTokens);
  const rows = new Map<
    string,
    { name: string; affected: number; total: number }
  >();
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(key),
      next = after.get(key);
    const owner = next ?? old!;
    const row = rows.get(owner.component) ?? {
      name: owner.name,
      affected: 0,
      total: 0,
    };
    row.total += 1;
    if (!old || !next || old.value !== next.value) row.affected += 1;
    rows.set(owner.component, row);
  }
  const all = [...rows.values()];
  return {
    affected: ratio(
      all.reduce((sum, row) => sum + row.affected, 0),
      all.reduce((sum, row) => sum + row.total, 0),
    ),
    components: [...rows].map(([id, row]) => ({
      id,
      name: row.name,
      affected: ratio(row.affected, row.total),
    })),
  };
}

function catalog(
  snapshot: EditSessionSnapshot,
  document: ComponentsDocument | undefined,
): ReadonlyMap<string, ComponentToken> {
  // Only build the token list when a component actually references a token.
  const referencesToken = document?.components.some((component) =>
    component.assignments.some(
      (row) => "$ref" in row && row.$ref !== undefined,
    ),
  );
  return referencesToken
    ? new Map(componentTokenCatalog(snapshot).map((token) => [token.id, token]))
    : new Map();
}

/** Missing or unbuildable token data makes the result unavailable; it is never reported as zero impact. */
export function componentImpactForSnapshots(
  shipped: EditSessionSnapshot,
  working: EditSessionSnapshot,
): ComponentImpactResult {
  try {
    return {
      status: "ready",
      summary: summarizeComponentImpact(
        shipped.components,
        working.components,
        catalog(shipped, shipped.components),
        catalog(working, working.components),
      ),
    };
  } catch (failure) {
    return {
      status: "unavailable",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
}
