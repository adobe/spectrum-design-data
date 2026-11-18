// Copyright 2026 Adobe. All rights reserved.
import {
  colorOpacityTree,
  type ColorOpacityTreeRow,
} from "./colorOpacityPresentation";
import type {
  ColorOpacityAssessment,
  ColorOpacityConcept,
  ColorOpacityEnhancement,
} from "../../features/design-data/colorOpacityAssessment";
import { canonicalJson } from "../../features/design-data/canonicalJson";
import type {
  ModeSelection,
  ModeResultSummary,
} from "../../features/design-data/modeResults";
import type { BarSegment } from "../../features/impact/segments";
import type { TokenPanelId } from "../../features/tokens/view/tokenPanelRegistry";
import type { ModeSet } from "../../features/modes/model";
import { fieldLabel } from "./palettePresentation";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { matchesModeSelection } from "../../features/design-data/modeResults";
import {
  isDeprecatedInventoryToken,
  type TokenInventoryEntry,
} from "../../features/design-data/tokenInventory";

export interface InventoryComparisonRow {
  id: string;
  label: string;
  inventory: TokenInventoryEntry;
  sample?: TokenInventoryEntry["values"][number];
  children: InventoryComparisonRow[];
}
export type TokenComparisonTreeRow =
  | ColorOpacityTreeRow
  | InventoryComparisonRow;

export function inventoryComparisonRows(
  entries: readonly TokenInventoryEntry[],
  query: string,
  verdict: string,
  modes: ModeSelection,
  valueResult: string,
  type: TokenPanelId | "all",
  enhancements: readonly ColorOpacityEnhancement[],
): InventoryComparisonRow[] {
  if (verdict !== "all" || valueResult !== "all") return [];
  const search = query.trim().toLowerCase();
  const confirmedExtras = new Set(
    enhancements.flatMap((row) =>
      row.app && !row.issue ? [canonicalJson([row.app.id, row.context])] : [],
    ),
  );
  const groups = new Map<string, InventoryComparisonRow>();
  for (const entry of entries) {
    if (
      isDeprecatedInventoryToken(entry.record) ||
      entry.requiredRowIds.length ||
      (type !== "all" &&
        (entry.type === "color" ? "colors" : entry.type) !== type) ||
      (search &&
        !`${entry.label} ${entry.type ?? "unclassified"} ${JSON.stringify(entry.record.structuredName)} ${entry.record.reference ?? ""}`
          .toLowerCase()
          .includes(search))
    )
      continue;
    const id = JSON.stringify([
      "inventory",
      entry.side,
      entry.record.conceptId ?? entry.record.identity ?? entry.id,
    ]);
    const group = groups.get(id) ?? {
      id,
      label: `${entry.side === "app" ? "App" : "Design data"}: ${entry.label}`,
      inventory: entry,
      children: [],
    };
    for (const [index, sample] of entry.values.entries()) {
      if (!matchesModeSelection(sample.context, modes)) continue;
      if (
        entry.side === "app" &&
        entry.presence === "app-only" &&
        !sample.issue &&
        confirmedExtras.has(canonicalJson([entry.record.id, sample.context]))
      )
        continue;
      group.children.push({
        id: `${entry.id}:${index}`,
        label:
          Object.entries(sample.context)
            .map(([axis, mode]) => `${fieldLabel(axis)}: ${termLabel(mode)}`)
            .join(", ") || "All modes",
        inventory: entry,
        sample,
        children: [],
      });
    }
    if (group.children.length) groups.set(id, group);
  }
  const tree = [...groups.values()];
  return Object.keys(modes).length
    ? tree.flatMap((parent) =>
        parent.children.map((child) => ({
          ...child,
          label: `${parent.label} — ${child.label}`,
        })),
      )
    : tree;
}

const labelOrder = new Intl.Collator();

/** Combined comparison and inventory rows, sorted once by label. */
export function sortedComparisonTree(
  comparison: readonly TokenComparisonTreeRow[],
  inventory: readonly TokenComparisonTreeRow[],
): TokenComparisonTreeRow[] {
  return [...comparison, ...inventory].sort((a, b) =>
    labelOrder.compare(a.label, b.label),
  );
}

const collapsedRows = new WeakMap<
  TokenComparisonTreeRow,
  TokenComparisonTreeRow
>();

/**
 * Table items for the current expansion, limited to the first `limit` rows so
 * large comparisons render in pages. A collapsed row keeps only its first
 * child, so it still shows an expand control without building every hidden
 * child. Unchanged rows keep their identity, letting the table reuse them.
 */
export function visibleComparisonTree(
  tree: readonly TokenComparisonTreeRow[],
  expanded: ReadonlySet<string>,
  limit = Infinity,
): TokenComparisonTreeRow[] {
  return tree.slice(0, limit).map((row) => {
    if (row.children.length <= 1 || expanded.has(row.id)) return row;
    let collapsed = collapsedRows.get(row);
    if (!collapsed) {
      collapsed = {
        ...row,
        children: row.children.slice(0, 1),
      } as TokenComparisonTreeRow;
      collapsedRows.set(row, collapsed);
    }
    return collapsed;
  });
}

/** Every row and child by ID, for details lookup. */
export function comparisonRowIndex(
  tree: readonly TokenComparisonTreeRow[],
): Map<string, TokenComparisonTreeRow> {
  const index = new Map<string, TokenComparisonTreeRow>();
  for (const row of tree) {
    index.set(row.id, row);
    for (const child of row.children) index.set(child.id, child);
  }
  return index;
}

const valuesByContext = new WeakMap<
  TokenInventoryEntry,
  Map<string, TokenInventoryEntry["values"][number]>
>();

/** The counterpart sample with the same mode context, looked up once per entry. */
export function counterpartSample(
  counterpart: TokenInventoryEntry,
  context: TokenInventoryEntry["values"][number]["context"] | undefined,
) {
  let values = valuesByContext.get(counterpart);
  if (!values) {
    values = new Map(
      counterpart.values.map((value) => [canonicalJson(value.context), value]),
    );
    valuesByContext.set(counterpart, values);
  }
  return values.get(canonicalJson(context));
}

/** Distinct tokens represented by the given rows. */
export function comparisonTokenCount(
  rows: readonly TokenComparisonTreeRow[],
): number {
  return new Set(
    rows.map((row) =>
      "inventory" in row
        ? canonicalJson([
            row.inventory.side,
            row.inventory.record.conceptId ??
              row.inventory.record.identity ??
              row.inventory.id,
          ])
        : row.concept.id,
    ),
  ).size;
}

export function tokenComparisonRows(
  concepts: readonly ColorOpacityConcept[],
  query: string,
  verdict: string,
  modes: ModeSelection,
  valueResult: string,
  type: TokenPanelId | "all",
): ColorOpacityTreeRow[] {
  const tree = colorOpacityTree(
    concepts.filter(
      (concept) =>
        type === "all" ||
        (concept.type === "color" ? "colors" : concept.type) === type,
    ),
    query,
    verdict,
    modes,
    valueResult,
  );
  return Object.keys(modes).length
    ? tree.flatMap((parent) =>
        parent.children.map((child) => ({
          ...child,
          label: `${parent.label} — ${child.label}`,
        })),
      )
    : tree;
}

export function comparisonSelectionIndex(
  rows: readonly ColorOpacityTreeRow[],
  eligible: ReadonlySet<string>,
) {
  const index = new Map<string, Set<string>>();
  function visit(row: ColorOpacityTreeRow): Set<string> {
    const ids = new Set(
      row.value && eligible.has(row.value.id) ? [row.value.id] : [],
    );
    for (const child of row.children)
      for (const id of visit(child)) ids.add(id);
    index.set(row.id, ids);
    return ids;
  }
  const all = new Set<string>();
  for (const row of rows) for (const id of visit(row)) all.add(id);
  return { rows: index, all };
}

export function modeResultSegments(row: ModeResultSummary): BarSegment[] {
  if (!row.values) return [];
  return (
    [
      ["acceptable", "Acceptable", "orange"],
      ["fail", "Fail", "red"],
      ["pass", "Pass", "green"],
      ["unassessable", "Unable to evaluate", "gray"],
    ] as const
  ).flatMap(([id, label, tone]) =>
    row.counts[id] > 0
      ? [{ id, label, tone, fraction: row.counts[id] / row.values }]
      : [],
  );
}

export function comparisonModeSets(
  assessment: ColorOpacityAssessment,
  authored: readonly ModeSet[],
): ModeSet[] {
  const required = [
    ...new Set(assessment.modeBreakdown.map((row) => row.axis)),
  ].map((axis) => {
    const coverage = assessment.modeCoverage.sets.find(
      (set) => set.reference?.key === axis,
    );
    const source = authored.find((set) => set.key === coverage?.app?.key);
    const modes = assessment.modeBreakdown
      .filter((row) => row.axis === axis)
      .map((row) => {
        const pair = coverage?.modes.find(
          (pair) => pair.reference === row.mode,
        );
        const mode = source?.modes.find((mode) => mode.key === pair?.app);
        return {
          id: JSON.stringify(row.mode),
          key: row.mode ?? "",
          name: row.mode === null ? "Not mode-specific" : termLabel(row.mode),
          description: "",
          iconId: mode?.iconId ?? ("none" as const),
          platformIds: [],
          foundations: {},
        };
      });
    return {
      id: axis,
      key: axis,
      name: source?.name ?? fieldLabel(axis),
      description: "",
      iconId: source?.iconId,
      defaultModeId: "",
      modes,
    };
  });
  const axes = new Map<string, Set<string>>();
  for (const entry of assessment.inventory?.entries ?? []) {
    if (isDeprecatedInventoryToken(entry.record)) continue;
    for (const value of entry.values)
      for (const [axis, mode] of Object.entries(value.context)) {
        const values = axes.get(axis) ?? new Set<string>();
        values.add(mode);
        axes.set(axis, values);
      }
  }
  for (const [axis, values] of axes) {
    const existing = required.find((set) => set.key === axis);
    const source = authored.find((set) => set.key === axis);
    const modes = [...values]
      .filter((mode) => !existing?.modes.some((item) => item.key === mode))
      .map((mode) => ({
        id: JSON.stringify(mode),
        key: mode,
        name: termLabel(mode),
        description: "",
        iconId: "none" as const,
        platformIds: [],
        foundations: {},
      }));
    if (existing) existing.modes.push(...modes);
    else
      required.push({
        id: axis,
        key: axis,
        name: source?.name ?? fieldLabel(axis),
        description: "",
        iconId: source?.iconId,
        defaultModeId: "",
        modes,
      });
  }
  return required;
}
