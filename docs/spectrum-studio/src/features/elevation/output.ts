// Copyright 2026 Adobe. All rights reserved.
import { isFoundationPublished } from "../foundations/types";
import {
  projectClassification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { governedFoundationContext } from "../taxonomy/foundationGovernance";
import { registeredSourceName } from "../taxonomy/naming";
import type { BrowserTokenSource } from "../tokens/browserModel";
import type { ModeSet } from "../modes/model";
import { capabilityOwners } from "../modes/parameters";
import { modeCombinationCount, modeCombinations } from "../modes/combinations";
import { dataAttribute } from "../color-system/cssLibrary";
import { generateElevation, shadowCss } from "./generate";
import { resolveElevationDocument } from "./resolution";
import { ELEVATION_FORMULAS } from "./formulas";
import type { ScaleType } from "../scales/scaleType";
import type { ElevationDocument, ElevationLevel } from "./model";
import type { ColorOutputSettings } from "../color-system/outputSettings";
import { opacityAxes, type OpacitySource } from "../opacity/generation";

export function elevationTokenName(
  document: ElevationDocument,
  level: ElevationLevel,
  registry: TaxonomyDocument,
) {
  const source = governedFoundationContext(
    registry,
    "elevation",
    document.name,
    `elevation:${document.id}`,
    level.step,
  );
  const projection = projectClassification(
    registry,
    source.governed!,
    "elevation",
  );
  if (projection.issues.length) throw new Error(projection.issues.join(" "));
  return projection.name;
}
export function browserElevationSources(
  document: ElevationDocument,
  levels: ElevationLevel[],
  registry: TaxonomyDocument,
  options: { includeUnpublished?: boolean } = {},
): BrowserTokenSource[] {
  if (!options.includeUnpublished && !isFoundationPublished(document))
    return [];
  const groupLabel = registeredSourceName(registry, document.name, "elevation");
  return levels.map((level) => {
    const name = elevationTokenName(document, level, registry);
    const value = shadowCss(level);
    return {
      id: level.id,
      type: "elevation",
      groupId: document.id,
      groupLabel,
      name,
      generatedName: name,
      value,
      generatedValue: value,
      unit: "",
      shadows: level.shadows,
      taxonomyEvidence: {
        property: "elevation",
        foundationScale: groupLabel,
        scaleIndex: level.step,
      },
      taxonomySource: governedFoundationContext(
        registry,
        "elevation",
        document.name,
        `elevation:${document.id}`,
        level.step,
      ),
    };
  });
}
export function elevationOwnerIds(
  sets: readonly ModeSet[],
  opacitySource?: OpacitySource,
  document?: ElevationDocument,
): Set<string> {
  const owners = capabilityOwners(sets);
  const references =
    document &&
    new Set(
      document.layers.flatMap((layer) =>
        layer.opacityTokenId ? [layer.opacityTokenId] : [],
      ),
    );
  const dependencies = opacitySource && {
    ...opacitySource,
    opacity: opacitySource.opacity && {
      ...opacitySource.opacity,
      levels: opacitySource.opacity.levels.filter(
        (level) => !references || references.has(level.id),
      ),
    },
  };
  return new Set(
    ["elevation.depth", "elevation.color"]
      .flatMap((capability) =>
        owners[capability as keyof typeof owners]
          ? [owners[capability as keyof typeof owners]!]
          : [],
      )
      .concat(
        dependencies && (!references || references.size)
          ? opacityAxes(dependencies).map((axis) => axis.id)
          : [],
      ),
  );
}
export function buildElevationCss(
  document: ElevationDocument,
  registry: TaxonomyDocument,
  sets: readonly ModeSet[],
  formulas: readonly ScaleType[] = ELEVATION_FORMULAS,
  colorOutput?: ColorOutputSettings,
  opacitySource?: OpacitySource,
): string {
  if (!isFoundationPublished(document)) return "";
  const axes = sets.filter(
    (set) =>
      elevationOwnerIds(sets, opacitySource, document).has(set.id) &&
      set.modes.length,
  );
  if (modeCombinationCount(axes) > 256)
    throw new Error("Too many Elevation mode combinations to export safely.");
  const combinations = modeCombinations(axes);
  if (combinations.length > 256)
    throw new Error("Too many Elevation mode combinations to export safely.");
  const blocks = combinations.map((modes) => {
    const levels = generateElevation(
      resolveElevationDocument(document, modes, sets, {}, opacitySource),
      formulas,
      colorOutput,
    );
    if (!levels.length) return "";
    const attributes = modes.map(
      (mode, index) =>
        `[${dataAttribute(axes[index].key)}=${JSON.stringify(mode.key)}]`,
    );
    const selectors = modes.flatMap((mode, index) =>
      mode.id === axes[index].defaultModeId ? [] : [attributes[index]],
    );
    const selector = [
      ...new Set([
        selectors.length ? selectors.join("") : ":root",
        attributes.join(""),
      ]),
    ]
      .filter(Boolean)
      .join(", ");
    const declarations = levels.map(
      (level) =>
        `  --${elevationTokenName(document, level, registry)}: ${shadowCss(level)};`,
    );
    return `${selector} {\n${declarations.join("\n")}\n}`;
  });
  return blocks.filter(Boolean).join("\n\n");
}
