// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { contrastStepIndex } from "../color-system/contrastSteps";
import type { ColorScale } from "../color-system/model";
import {
  assertSwatchIndices,
  swatchIndex,
  type IndexedSwatch,
} from "../scales/swatchIndices";
import { pathId, type AuthoredAddress, type SourcePath } from "./contract";

export function swatchIndexAt(
  snapshot: EditSessionSnapshot,
  path: SourcePath,
): number | undefined {
  const identity = path.at(-2);
  if (
    path.at(-1) !== "scaleIndex" ||
    !identity ||
    typeof identity !== "object" ||
    !("id" in identity)
  )
    return undefined;
  if (path[0] === "opacity" && path[1] === "levels" && path.length === 4) {
    const position =
      snapshot.opacity?.levels.findIndex((level) => level.id === identity.id) ??
      -1;
    return position < 0
      ? undefined
      : swatchIndex(snapshot.opacity!.levels[position], position);
  }
  if (path[0] !== "colorSystem") return undefined;
  const color = snapshot.colorSystem;
  if (path[1] === "contrasts" && path.length === 4) {
    const position = color.contrasts.findIndex(
      (step) => step.id === identity.id,
    );
    return position < 0
      ? undefined
      : swatchIndex(color.contrasts[position], position);
  }
  const scaleIdentity = path[2];
  const key = path[3];
  if (
    path[1] !== "scales" ||
    path.length !== 7 ||
    path[4] !== "steps" ||
    !scaleIdentity ||
    typeof scaleIdentity !== "object" ||
    !("id" in scaleIdentity) ||
    (key !== "customContrasts" && key !== "disabledCustomContrasts")
  )
    return undefined;
  const scale = color.scales.find((item) => item.id === scaleIdentity.id);
  const custom = scale?.[key];
  const position =
    custom?.steps.findIndex((step) => step.id === identity.id) ?? -1;
  return position < 0 || !scale
    ? undefined
    : contrastStepIndex(
        position,
        { ...scale, customContrasts: custom },
        snapshot.rules,
      );
}

/** Reset a label to its shipped index, not its new position after a reorder. */
export function restoreSwatchIndexAssignments<T extends EditSessionSnapshot>(
  candidate: T,
  shipped: EditSessionSnapshot,
  addresses: readonly AuthoredAddress[],
): T {
  const resets = new Map<string, Set<string>>();
  for (const { path } of addresses) {
    const identity = path.at(-2);
    if (
      path.at(-1) !== "scaleIndex" ||
      !identity ||
      typeof identity !== "object" ||
      !("id" in identity)
    )
      continue;
    const key = pathId(path.slice(0, -2));
    const ids = resets.get(key) ?? new Set<string>();
    ids.add(identity.id);
    resets.set(key, ids);
  }
  function restore<TSwatch extends IndexedSwatch>(
    swatches: TSwatch[],
    baseline: readonly TSwatch[],
    path: SourcePath,
    index: (swatch: TSwatch, position: number) => number = swatchIndex,
  ): TSwatch[] {
    const ids = resets.get(pathId(path));
    if (!ids) return swatches;
    const next = swatches.map((swatch) => {
      if (!ids.has(swatch.id)) return swatch;
      const position = baseline.findIndex((item) => item.id === swatch.id);
      if (position < 0)
        throw new Error(
          "This swatch has no shipped scale index. Edit its index or remove the added swatch instead.",
        );
      return { ...swatch, scaleIndex: index(baseline[position], position) };
    });
    const indexed = next.map((swatch, position) => ({
      ...swatch,
      scaleIndex: swatchIndex(swatch, position),
    }));
    assertSwatchIndices(indexed.map((swatch) => swatch.scaleIndex));
    return indexed.sort((a, b) => a.scaleIndex - b.scaleIndex);
  }
  const color = candidate.colorSystem;
  return {
    ...candidate,
    ...(candidate.opacity && {
      opacity: {
        ...candidate.opacity,
        levels: restore(
          candidate.opacity.levels,
          shipped.opacity?.levels ?? [],
          ["opacity", "levels"],
        ),
      },
    }),
    colorSystem: {
      ...color,
      contrasts: restore(color.contrasts, shipped.colorSystem.contrasts, [
        "colorSystem",
        "contrasts",
      ]),
      scales: color.scales.map((scale) => {
        const baseline = shipped.colorSystem.scales.find(
          (item) => item.id === scale.id,
        );
        const next = { ...scale };
        for (const key of [
          "customContrasts",
          "disabledCustomContrasts",
        ] as const) {
          const custom = scale[key];
          if (!custom) continue;
          const original = baseline?.[key];
          next[key] = {
            ...custom,
            steps: restore(
              custom.steps,
              original?.steps ?? [],
              [
                "colorSystem",
                "scales",
                { key: "id", id: scale.id },
                key,
                "steps",
              ],
              (_, position) =>
                contrastStepIndex(
                  position,
                  baseline &&
                    ({
                      ...baseline,
                      customContrasts: original,
                    } satisfies ColorScale),
                  shipped.rules,
                ),
            ),
          };
        }
        return next;
      }),
    },
  };
}
