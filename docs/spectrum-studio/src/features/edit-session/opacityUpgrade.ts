// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import type { ElevationDocument, ShadowLayer } from "../elevation/model";
import { modeCombinations, selectionForModes } from "../modes/combinations";
import type { Mode, ModeSet } from "../modes/model";
import { OPACITY_DEFAULTS } from "../opacity/defaults";
import {
  opacityAxes,
  opacityContexts,
  resolveOpacity,
} from "../opacity/generation";
import type { OpacityDocument } from "../opacity/model";
import {
  canonicalTokenModeKey,
  type BrowserTokenEdits,
} from "../tokens/browserModel";
import type { EditSessionSnapshot } from "./state";

export interface OpacityUpgradeSource {
  colorSystem: ColorSystemDocument;
  modeSets: ModeSet[];
  elevation?: ElevationDocument;
  opacity?: OpacityDocument;
  browserTokenEdits?: BrowserTokenEdits;
}

/** Share one map (or allocator) across the working and saved snapshots. */
export type OpacityUpgradeIdentities =
  | Map<string, string>
  | ((key: string) => string);

function identity(owner: OpacityUpgradeIdentities, key: string): string {
  if (typeof owner === "function") return owner(key);
  const existing = owner.get(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  owner.set(key, id);
  return id;
}

function legacyAlpha(
  layer: ShadowLayer,
  modes: readonly Mode[],
  sets: ModeSet[],
): number {
  const owner = sets.find((set) =>
    (set.authoringCapabilities as readonly string[] | undefined)?.includes(
      "elevation.layerOpacities",
    ),
  );
  const mode =
    owner &&
    modes.find((mode) => owner.modes.some((item) => item.id === mode.id));
  const percentage =
    mode && mode.id !== owner?.defaultModeId
      ? (mode.foundations.elevation?.layerOpacities?.[layer.id] ??
        layer.opacity)
      : layer.opacity;
  const alpha =
    layer.manualOpacity ??
    (percentage === undefined ? undefined : percentage / 100);
  if (alpha === undefined || !Number.isFinite(alpha) || alpha < 0 || alpha > 1)
    throw new Error(`${layer.label}: the saved shadow opacity is invalid.`);
  return alpha;
}

/**
 * Upgrades an already historically-upgraded version-14 snapshot, without
 * mutating it or running any historical upgrade chain.
 */
export function upgradeOpacitySnapshot(
  input: EditSessionSnapshot,
  identities?: Map<string, string>,
): EditSessionSnapshot;
export function upgradeOpacitySnapshot<T extends OpacityUpgradeSource>(
  input: T,
  identities?: OpacityUpgradeIdentities,
): T & { opacity: OpacityDocument };
export function upgradeOpacitySnapshot<T extends OpacityUpgradeSource>(
  input: T,
  identities: OpacityUpgradeIdentities = new Map(),
): T & { opacity: OpacityDocument } {
  const source = structuredClone(input) as T & { opacity: OpacityDocument };
  source.opacity ??= structuredClone(OPACITY_DEFAULTS);
  const axisIds = new Set(opacityAxes(source).map((set) => set.id));
  for (const set of source.modeSets)
    if (
      (set.authoringCapabilities as readonly string[] | undefined)?.includes(
        "elevation.layerOpacities",
      )
    )
      axisIds.add(set.id);
  const axes = source.modeSets.filter((set) => axisIds.has(set.id));
  const contexts = modeCombinations(axes).map((modes) => ({
    modes,
    key: canonicalTokenModeKey(selectionForModes(axes, modes)),
  }));
  for (const layer of source.elevation?.layers ?? []) {
    if (layer.opacityTokenId) continue;
    const vector = contexts.map(({ modes }) =>
      legacyAlpha(layer, modes, source.modeSets),
    );
    const outputs = contexts.map(({ modes }) => resolveOpacity(source, modes));
    const issues = outputs.flatMap((output) => output.issues);
    if (issues.length) throw new Error(issues.join(" "));
    let match = source.opacity.levels.find((level) =>
      outputs.every(
        (output, index) =>
          output.levels.find((item) => item.id === level.id)?.value ===
          vector[index],
      ),
    );
    if (!match) {
      match = {
        id: identity(identities, `opacity:shadow:${layer.id}`),
        value: layer.manualOpacity ?? layer.opacity! / 100,
        rows: {},
      };
      source.opacity.levels.push(match);
      for (const [index, { modes, key }] of contexts.entries()) {
        const generated = resolveOpacity(source, modes).levels.find(
          (level) => level.id === match!.id,
        );
        if (!generated)
          throw new Error(`${layer.label}: its opacity could not be upgraded.`);
        if (generated.value !== vector[index]) {
          source.browserTokenEdits ??= {};
          const edit = source.browserTokenEdits[match.id] ?? { values: {} };
          source.browserTokenEdits[match.id] = {
            ...edit,
            values: {
              ...edit.values,
              [key]: {
                value: vector[index],
                baseline: generated.generatedValue,
              },
            },
          };
        }
      }
    }
    layer.opacityTokenId = match.id;
    delete layer.opacity;
    delete layer.manualOpacity;
  }
  for (const set of source.modeSets) {
    if (set.authoringCapabilities)
      set.authoringCapabilities = set.authoringCapabilities.filter(
        (capability) => (capability as string) !== "elevation.layerOpacities",
      );
    for (const mode of set.modes)
      if (mode.foundations.elevation)
        delete mode.foundations.elevation.layerOpacities;
  }
  for (const level of source.opacity.levels)
    for (const { key } of opacityContexts(source))
      level.rows[key] ??= identity(
        identities,
        `opacity:row:${level.id}:${key}`,
      );
  return source;
}
