// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import type { ModeSet } from "../../modes/model";
import type { Rule } from "../../logic/model";
import type { TokenOverrideMap } from "../../tokens/model";
import {
  PALETTE_SCALE_ID,
  tokenStableKey,
  tokenUuid,
} from "../../tokens/model";
import type { BrowserTokenEdits } from "../../tokens/browserEditTypes";
import { isFoundationPublished } from "../../foundations/types";
import { dataVisConsumers, dataVisSourceIssues } from "./references";
import { dataVisMemberId } from "./identity";
import type { DataVisSourcePacket } from "./adapter";
import { primitiveColorIdentities } from "./primitiveColors";

export function buildDataVisSourcePacket(source: {
  colorSystem: ColorSystemDocument;
  modeSets: ModeSet[];
  rules?: Rule[];
  tokenOverrides: TokenOverrideMap;
  browserTokenEdits?: BrowserTokenEdits;
}): DataVisSourcePacket {
  if (!source.rules || !source.browserTokenEdits)
    throw new Error(
      "Data vis export requires the authoritative rule library and token edits.",
    );
  const color = {
    ...source.colorSystem,
    dataVisScales: source.colorSystem.dataVisScales.filter(
      isFoundationPublished,
    ),
  };
  const ids = new Set(color.dataVisScales.map((scale) => scale.id));
  const modeSets = source.modeSets.map((axis) => ({
    ...axis,
    authoringCapabilities: axis.authoringCapabilities?.filter((capability) =>
      capability.startsWith("color."),
    ),
    modes: axis.modes.map((mode) => {
      const patches = mode.foundations.color;
      return {
        ...mode,
        platformIds: [],
        foundations: patches
          ? {
              color: {
                ...patches,
                dataVisSources: Object.fromEntries(
                  Object.entries(patches.dataVisSources ?? {}).filter(([id]) =>
                    ids.has(id),
                  ),
                ),
                dataVisContrasts: Object.fromEntries(
                  Object.entries(patches.dataVisContrasts ?? {}).filter(
                    ([id]) => ids.has(id),
                  ),
                ),
              },
            }
          : {},
      };
    }),
  }));
  const primitives = new Map(
    primitiveColorIdentities(color).map((color) => [color.id, color]),
  );
  const references = dataVisConsumers(color, modeSets);
  const required = new Set([
    color.backgroundScaleId,
    ...references.flatMap((consumer) => {
      if (consumer.source.kind !== "primitive-token")
        return [consumer.source.scaleId];
      const origin = primitives.get(consumer.source.tokenId)?.origin;
      return origin?.kind === "ui-swatch" ? [origin.scaleId] : [];
    }),
    ...modeSets.flatMap((axis) =>
      axis.modes.flatMap((mode) =>
        mode.foundations.color?.backgroundScaleId
          ? [mode.foundations.color.backgroundScaleId]
          : [],
      ),
    ),
  ]);
  color.scales = color.scales.filter((scale) => required.has(scale.id));
  const paletteIds = new Set(
    color.scales.flatMap((scale) =>
      scale.stops.flatMap((stop) =>
        stop.paletteColorId ? [stop.paletteColorId] : [],
      ),
    ),
  );
  for (const consumer of references)
    if (consumer.source.kind === "primitive-token") {
      const origin = primitives.get(consumer.source.tokenId)?.origin;
      if (origin?.kind === "palette") paletteIds.add(origin.paletteColorId);
    }
  for (const axis of modeSets)
    for (const mode of axis.modes)
      if (mode.foundations.color) {
        const patches = mode.foundations.color;
        patches.scaleStops = Object.fromEntries(
          Object.entries(patches.scaleStops ?? {}).filter(([id]) =>
            required.has(id),
          ),
        );
        patches.scaleContrasts = Object.fromEntries(
          Object.entries(patches.scaleContrasts ?? {}).filter(([id]) =>
            required.has(id),
          ),
        );
        for (const stops of Object.values(patches.scaleStops))
          for (const stop of Object.values(stops))
            if (stop.paletteColorId) paletteIds.add(stop.paletteColorId);
      }
  color.palette = color.palette.filter((entry) => paletteIds.has(entry.id));
  color.surfaces = [];
  const issues = dataVisSourceIssues(color, modeSets);
  if (issues.length)
    throw new Error(
      `Data vis export needs complete sources. ${issues.join(" ")}`,
    );
  const tokenIds = new Set([
    ...color.scales.flatMap((scale) =>
      (scale.customContrasts?.steps ?? color.contrasts).map((contrast) =>
        tokenUuid(tokenStableKey(scale.id, contrast.id)),
      ),
    ),
    ...color.palette.map((color) =>
      tokenUuid(tokenStableKey(PALETTE_SCALE_ID, color.id)),
    ),
    ...color.dataVisScales.flatMap((scale) =>
      scale.kind === "categorical"
        ? scale.members.map((member) => dataVisMemberId(scale.id, member.id))
        : [],
    ),
  ]);
  const namingIds = new Set(
    color.scales.flatMap((scale) =>
      scale.customContrasts ? [scale.customContrasts.namingRuleId] : [],
    ),
  );
  return structuredClone({
    schemaVersion: 3,
    color,
    modeSets,
    namingRules: source.rules
      .filter((rule) => rule.type === "scale-naming")
      .filter((rule) => namingIds.has(rule.id)),
    tokenOverrides: Object.fromEntries(
      Object.entries(source.tokenOverrides).filter(([id]) => tokenIds.has(id)),
    ),
    browserTokenEdits: Object.fromEntries(
      Object.entries(source.browserTokenEdits).filter(([id]) =>
        tokenIds.has(id),
      ),
    ),
  });
}
