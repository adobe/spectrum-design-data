// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../../modes/model";
import type { DataVisScale } from "./model";
import { capabilityOwners } from "../../modes/ownership";

export function dataVisModeOwnershipIssues(sets: readonly ModeSet[]): string[] {
  const owners = capabilityOwners([...sets]),
    issues: string[] = [];
  for (const axis of sets)
    for (const mode of axis.modes) {
      if (
        !Object.values(mode.foundations.color?.dataVisContrasts ?? {}).some(
          (points) => Object.keys(points).length,
        )
      )
        continue;
      if (mode.id === axis.defaultModeId)
        issues.push(
          `${mode.name}: clear its data vis contrast overrides before making it the default mode.`,
        );
      if (owners["color.contrastMultiplier"] !== axis.id)
        issues.push(
          `${mode.name}: clear its data vis contrast overrides before removing their contrast owner.`,
        );
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
      if (!color?.dataVisContrasts) return mode;
      const next = { ...color };
      const kept = Object.fromEntries(
        Object.entries(color.dataVisContrasts).flatMap(([id, patches]) => {
          const values = Object.fromEntries(
            Object.entries(patches).filter(([pointId]) =>
              points
                .get(id)
                ?.some((point) => point.id === pointId && !!point.contrast),
            ),
          );
          return Object.keys(values).length ? [[id, values]] : [];
        }),
      );
      if (Object.keys(kept).length) next.dataVisContrasts = kept;
      else delete next.dataVisContrasts;
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
  for (const axis of previous)
    for (const mode of axis.modes)
      if (
        mode.foundations.color?.dataVisContrasts?.[scaleId] &&
        (pointId === undefined ||
          mode.foundations.color.dataVisContrasts[scaleId][pointId] !==
            undefined)
      ) {
        const destination = current.find((axis) =>
          axis.modes.some((candidate) => candidate.id === mode.id),
        );
        if (!destination)
          throw new Error(
            "A mode containing these contrast overrides was removed. Undo cannot recreate that mode.",
          );
        if (
          destination.id !== owners["color.contrastMultiplier"] ||
          destination.defaultModeId === mode.id
        ) {
          throw new Error(
            "Mode ownership or its default changed. Undo cannot restore the original contrast overrides.",
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
      const patches = before?.dataVisContrasts?.[scaleId];
      if (
        patches &&
        (pointId === undefined || patches[pointId] !== undefined)
      ) {
        const restored =
          pointId === undefined
            ? patches
            : {
                ...color.dataVisContrasts?.[scaleId],
                [pointId]: patches[pointId],
              };
        color.dataVisContrasts = {
          ...color.dataVisContrasts,
          [scaleId]: restored,
        };
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
