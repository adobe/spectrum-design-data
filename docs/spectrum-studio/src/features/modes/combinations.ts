// Copyright 2026 Adobe. All rights reserved.
import type { Mode, ModeSet } from "./model";

/**
 * The one place that lists every combination of modes. Callers choose which mode
 * sets (axes) to include and apply their own limits; this file only enumerates.
 * Order is fixed: the first axis varies slowest, so combinations line up with
 * `axes` by index. Token edit keys use ids (`selectionForModes`); generation
 * contexts use keys (`contextForModes`).
 */
export type ModeSelection = Record<string, string>;
type Axis = Pick<ModeSet, "id" | "key" | "modes">;

/** How many combinations the axes produce: the product of each axis's mode count (1 for no axes). */
export function modeCombinationCount(
  axes: readonly Pick<ModeSet, "modes">[],
): number {
  return axes.reduce((count, axis) => count * axis.modes.length, 1);
}

/** Every combination, one mode per axis, as lists that line up with `axes`. */
export function modeCombinations<A extends Pick<ModeSet, "modes">>(
  axes: readonly A[],
): A["modes"][number][][] {
  return axes.reduce<A["modes"][number][][]>(
    (rows, axis) =>
      rows.flatMap((row) => axis.modes.map((mode) => [...row, mode])),
    [[]],
  );
}

/** Every combination as `{ axisId: modeId }`. `seed` entries are copied into each selection first. */
export function modeSelections(
  axes: readonly Axis[],
  seed: ModeSelection = {},
): ModeSelection[] {
  return axes.reduce<ModeSelection[]>(
    (items, axis) =>
      items.flatMap((selection) =>
        axis.modes.map((mode) => ({ ...selection, [axis.id]: mode.id })),
      ),
    [{ ...seed }],
  );
}

/** `{ axisId: modeId }` for one combination; the shape token edit keys are built from. */
export function selectionForModes(
  axes: readonly Pick<ModeSet, "id">[],
  modes: readonly Pick<Mode, "id">[],
): ModeSelection {
  return Object.fromEntries(
    axes.map((axis, index) => [axis.id, modes[index].id]),
  );
}

/** `{ axisKey: modeKey }` for one combination; the shape generated token contexts use. */
export function contextForModes(
  axes: readonly Pick<ModeSet, "key">[],
  modes: readonly Pick<Mode, "key">[],
): ModeSelection {
  return Object.fromEntries(
    axes.map((axis, index) => [axis.key, modes[index].key]),
  );
}

/** The modes a selection names, one per axis. An axis the selection does not name gets `undefined`, as the inline code did. */
export function modesForSelection(
  axes: readonly Pick<ModeSet, "id" | "modes">[],
  selection: ModeSelection,
): Mode[] {
  return axes.map(
    (axis) => axis.modes.find((mode) => mode.id === selection[axis.id])!,
  );
}
