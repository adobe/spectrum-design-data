// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../../modes/model";
import type { DataVisScale } from "./model";
import { capabilityOwners } from "../../modes/ownership";

export function dataVisModeOwnershipIssues(sets: readonly ModeSet[]): string[] {
  const owners = capabilityOwners([...sets]),
    issues: string[] = [];
  for (const axis of sets)
    for (const mode of axis.modes) {
      for (const [field, capability] of [
        ["dataVisSources", "color.scales"],
        ["dataVisContrasts", "color.contrastMultiplier"],
      ] as const) {
        if (
          !Object.values(mode.foundations.color?.[field] ?? {}).some(
            (points) => Object.keys(points).length,
          )
        )
          continue;
        if (mode.id === axis.defaultModeId)
          issues.push(
            `${mode.name}: clear its data vis overrides before making it the default mode.`,
          );
        if (owners[capability] !== axis.id)
          issues.push(
            `${mode.name}: clear its data vis overrides before removing their ${capability === "color.scales" ? "source" : "contrast"} owner.`,
          );
      }
    }
  return issues;
}

export function pruneDataVisPatches(
  sets: ModeSet[],
  scales: readonly DataVisScale[],
): ModeSet[] {
  const points = new Map(
    scales
      .filter((scale) => scale.kind !== "categorical")
      .map((scale) => [scale.id, scale.points]),
  );
  return sets.map((axis) => ({
    ...axis,
    modes: axis.modes.map((mode) => {
      const color = mode.foundations.color;
      if (!color?.dataVisSources && !color?.dataVisContrasts) return mode;
      const next = { ...color };
      for (const field of ["dataVisSources", "dataVisContrasts"] as const) {
        const kept = Object.fromEntries(
          Object.entries(color[field] ?? {}).flatMap(([id, patches]) => {
            const values = Object.fromEntries(
              Object.entries(patches).filter(([pointId]) =>
                points
                  .get(id)
                  ?.some(
                    (point) =>
                      point.id === pointId &&
                      (field === "dataVisSources" || !!point.contrast),
                  ),
              ),
            );
            return Object.keys(values).length ? [[id, values]] : [];
          }),
        );
        if (Object.keys(kept).length) Object.assign(next, { [field]: kept });
        else delete next[field];
      }

      return { ...mode, foundations: { ...mode.foundations, color: next } };
    }),
  }));
}

export function restoreDataVisPatches(
  current: ModeSet[],
  previous: readonly ModeSet[],
  scaleId: string,
  pointId?: string,
): ModeSet[] {
  const owners = capabilityOwners(current);
  const fields = [
    ["dataVisSources", "color.scales"],
    ["dataVisContrasts", "color.contrastMultiplier"],
  ] as const;
  for (const axis of previous)
    for (const mode of axis.modes)
      for (const [field, capability] of fields) {
        const patches = mode.foundations.color?.[field]?.[scaleId];
        if (
          !patches ||
          (pointId !== undefined && patches[pointId] === undefined)
        )
          continue;
        const destination = current.find((axis) =>
          axis.modes.some((candidate) => candidate.id === mode.id),
        );
        if (!destination)
          throw new Error(
            "A mode containing these overrides was removed. Undo cannot recreate that mode.",
          );
        if (
          destination.id !== owners[capability] ||
          destination.defaultModeId === mode.id
        ) {
          throw new Error(
            "Mode ownership or its default changed. Undo cannot restore the original overrides.",
          );
        }
      }
  return current.map((axis) => ({
    ...axis,
    modes: axis.modes.map((mode) => {
      const before = previous
        .flatMap((axis) => axis.modes)
        .find((candidate) => candidate.id === mode.id)?.foundations.color;
      const color = { ...mode.foundations.color };
      for (const [field] of fields) {
        const patches = before?.[field]?.[scaleId];
        if (
          !patches ||
          (pointId !== undefined && patches[pointId] === undefined)
        )
          continue;
        const restored =
          pointId === undefined
            ? patches
            : { ...color[field]?.[scaleId], [pointId]: patches[pointId] };
        Object.assign(color, {
          [field]: { ...color[field], [scaleId]: restored },
        });
      }
      return {
        ...mode,
        foundations: {
          ...mode.foundations,
          ...(Object.keys(color).length && { color }),
        },
      };
    }),
  }));
}
