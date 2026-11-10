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
import { tokenIdentity } from "../../tokens/canonicalIdentity";
import { isFoundationPublished } from "../../foundations/types";
import { dataVisConsumers, dataVisSourceIssues } from "./references";
import type { DataVisSourcePacket } from "./adapter";
import { primitiveColorIdentities } from "./primitiveColors";
import type { OpacityDocument } from "../../opacity/model";
import {
  resolveColorScaleDocument,
  assertColorScaleOutput,
} from "../colorScaleResolution";
import { opacityStopsEnabled } from "../colorScaleType";

export function buildDataVisSourcePacket(source: {
  colorSystem: ColorSystemDocument;
  modeSets: ModeSet[];
  rules?: Rule[];
  tokenOverrides: TokenOverrideMap;
  browserTokenEdits?: BrowserTokenEdits;
  opacity?: OpacityDocument;
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
      if (!patches) return { ...mode, platformIds: [], foundations: {} };
      const { scaleStops, dataVisSources, ...retainedPatches } = patches;
      void scaleStops;
      void dataVisSources;
      return {
        ...mode,
        platformIds: [],
        foundations: {
          color: {
            ...retainedPatches,
            dataVisContrasts: Object.fromEntries(
              Object.entries(patches.dataVisContrasts ?? {}).filter(([id]) =>
                ids.has(id),
              ),
            ),
          },
        },
      };
    }),
  }));
  const resolved = resolveColorScaleDocument(color, [], undefined, {
    modeSets,
    opacity: source.opacity,
    browserTokenEdits: source.browserTokenEdits,
  });
  assertColorScaleOutput(resolved);
  const primitives = new Map(
    primitiveColorIdentities(resolved).map((color) => [color.id, color]),
  );
  const references = dataVisConsumers(color);
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
  const paletteIds = new Set(
    color.scales
      .filter((scale) => required.has(scale.id))
      .flatMap((scale) =>
        scale.stops.flatMap((stop) =>
          stop.paletteColorId ? [stop.paletteColorId] : [],
        ),
      ),
  );
  const pending = [
    ...[...primitives.values()]
      .filter(
        ({ origin }) =>
          origin.kind === "categorical" ||
          (origin.kind === "ui-swatch" && required.has(origin.scaleId)),
      )
      .map((primitive) => primitive.id),
    ...references.flatMap((consumer) =>
      consumer.source.kind === "primitive-token"
        ? [consumer.source.tokenId]
        : [],
    ),
    ...[...paletteIds].map((id) =>
      tokenUuid(tokenStableKey(PALETTE_SCALE_ID, id)),
    ),
    ...(opacityStopsEnabled(color.settings)
      ? (source.opacity?.levels.map((level) => level.id) ?? [])
      : []),
  ];
  const tokenIds = new Set<string>();
  const retainedEdits = new Set<string>();
  for (const id of pending) {
    const identity = tokenIdentity(source.browserTokenEdits, id);
    const sourceId = identity?.sourceId ?? id;
    if (tokenIds.has(sourceId)) continue;
    tokenIds.add(sourceId);
    const editId = identity?.conceptId ?? id;
    retainedEdits.add(editId);
    const origin = primitives.get(sourceId)?.origin;
    if (origin?.kind === "palette") paletteIds.add(origin.paletteColorId);
    if (origin?.kind === "ui-swatch" && !required.has(origin.scaleId)) {
      required.add(origin.scaleId);
      pending.push(
        ...[...primitives.values()]
          .filter(
            (primitive) =>
              primitive.origin.kind === "ui-swatch" &&
              primitive.origin.scaleId === origin.scaleId,
          )
          .map((primitive) => primitive.id),
      );
      const scale = color.scales.find((scale) => scale.id === origin.scaleId);
      if (!scale) throw new Error("A referenced UI scale is unavailable.");
      pending.push(
        ...scale.stops.flatMap((stop) =>
          stop.paletteColorId
            ? [tokenUuid(tokenStableKey(PALETTE_SCALE_ID, stop.paletteColorId))]
            : [],
        ),
      );
    }
    const authoring = source.browserTokenEdits[editId]?.authoring;
    const isStatic =
      origin?.kind === "categorical" &&
      color.dataVisScales.some(
        (scale) => scale.id === origin.scaleId && !!scale.staticColors,
      );
    if (!authoring || authoring.lifecycle?.frozen || isStatic) continue;
    pending.push(
      ...Object.values(authoring.assignments).flatMap((assignment) =>
        assignment.kind === "reference" ? [assignment.targetId] : [],
      ),
      ...(authoring.manual?.targetId ? [authoring.manual.targetId] : []),
    );
  }
  color.scales = color.scales.filter((scale) => required.has(scale.id));
  for (const axis of modeSets)
    for (const mode of axis.modes)
      if (mode.foundations.color) {
        const patches = mode.foundations.color;
        patches.scaleContrasts = Object.fromEntries(
          Object.entries(patches.scaleContrasts ?? {}).filter(([id]) =>
            required.has(id),
          ),
        );
      }
  color.palette = color.palette.filter((entry) => paletteIds.has(entry.id));
  color.surfaces = [];
  const issues = dataVisSourceIssues(
    { ...resolved, ...color, contrasts: resolved.contrasts },
    modeSets,
  );
  if (issues.length)
    throw new Error(
      `Data vis export needs complete sources. ${issues.join(" ")}`,
    );
  const namingIds = new Set(
    color.scales.flatMap((scale) =>
      scale.customContrasts ? [scale.customContrasts.namingRuleId] : [],
    ),
  );
  return structuredClone({
    schemaVersion: 3,
    color,
    ...(opacityStopsEnabled(color.settings) && { opacity: source.opacity }),
    modeSets,
    namingRules: source.rules
      .filter((rule) => rule.type === "scale-naming")
      .filter((rule) => namingIds.has(rule.id)),
    tokenOverrides: Object.fromEntries(
      Object.entries(source.tokenOverrides).filter(([id]) => tokenIds.has(id)),
    ),
    browserTokenEdits: Object.fromEntries(
      Object.entries(source.browserTokenEdits).filter(([id]) =>
        retainedEdits.has(id),
      ),
    ),
  });
}
