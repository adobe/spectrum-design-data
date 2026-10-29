// Copyright 2026 Adobe. All rights reserved.
import { isRule } from "../../logic/model";
import { MAX_CONTRAST_MULTIPLIER } from "../polarity";
import {
  isDataVisContrastOverrides,
  isDataVisScaleList,
  isDataVisSourceOverrides,
  isDataVisSourcePatch,
  isKeyColor,
  isPointContrast,
  isRecord,
} from "./model";
import type { DataVisSourcePacket } from "./adapter";
import type { ColorStopOverride } from "../../modes/model";
import { isFoundationPublishingMetadata } from "../../foundations/types";
import {
  isColorOutputSettings,
  migrateLegacyColorOutput,
} from "../outputSettings";

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const range = (value: unknown, low: number, high: number) =>
  finite(value) && value >= low && value <= high;
const optional = (value: unknown, check: (value: unknown) => boolean) =>
  value === undefined || check(value);
const unique = (values: readonly string[]) =>
  new Set(values).size === values.length;
const contrastList = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (step) => isRecord(step) && text(step.id) && isPointContrast(step),
  ) &&
  unique(value.map((step) => step.id));
const colorPatch = (value: unknown): value is ColorStopOverride =>
  isRecord(value) &&
  isDataVisSourcePatch({
    color: Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "paletteColorId"),
    ),
  }) &&
  optional(value.paletteColorId, text);

export function upgradeDataVisPacket(input: unknown): DataVisSourcePacket {
  if (isRecord(input) && input.schemaVersion === 1) {
    if (
      !isRecord(input.color) ||
      input.color.schemaVersion !== 3 ||
      !isDataVisScaleList(input.color.dataVisScales) ||
      input.color.dataVisScales.some(
        (scale) =>
          scale.staticColors !== undefined ||
          (scale.kind !== "categorical" &&
            scale.points.some(
              (point) => point.source.kind === "primitive-token",
            )),
      )
    )
      throw new Error("Use an unmodified version-one packet for migration.");
    const migrated = upgradeLegacyPacket({
      ...input,
      schemaVersion: 2,
      color: { ...input.color, schemaVersion: 4 },
    });
    if (
      migrated.modeSets.some((axis) =>
        axis.modes.some((mode) =>
          Object.values(mode.foundations.color?.dataVisSources ?? {}).some(
            (points) =>
              Object.values(points).some(
                (patch) => patch.tokenId !== undefined,
              ),
          ),
        ),
      )
    )
      throw new Error(
        "Version-one packets cannot contain primitive-token patches.",
      );
    return migrated;
  }
  if (isRecord(input) && input.schemaVersion === 2)
    return upgradeLegacyPacket(input);
  assertDataVisPacket(input);
  return input;
}

function upgradeLegacyPacket(
  input: Record<string, unknown>,
): DataVisSourcePacket {
  if (
    !isRecord(input.color) ||
    input.color.schemaVersion !== 4 ||
    !isRecord(input.color.settings)
  ) {
    throw new Error(
      "Use an unmodified version-two packet with Color version four.",
    );
  }
  const { outputGamut, ...settings } = input.color.settings;
  if (
    typeof outputGamut !== "string" ||
    !["srgb", "display-p3", "oklch"].includes(outputGamut) ||
    "colorOutput" in settings
  ) {
    throw new Error("The legacy packet has invalid Color settings.");
  }
  const legacyKey = (value: unknown) =>
    isKeyColor(value) && value.chroma <= 100;
  if (
    !Array.isArray(input.color.palette) ||
    !input.color.palette.every(legacyKey) ||
    !Array.isArray(input.color.scales) ||
    !input.color.scales.every(
      (scale) =>
        isRecord(scale) &&
        Array.isArray(scale.stops) &&
        scale.stops.every(legacyKey),
    ) ||
    !isDataVisScaleList(input.color.dataVisScales) ||
    input.color.dataVisScales.some(
      (scale) =>
        scale.kind !== "categorical" &&
        scale.points.some(
          (point) =>
            point.source.kind === "key-color" && !legacyKey(point.source.color),
        ),
    )
  ) {
    throw new Error(
      "The legacy packet has invalid version-four color geometry.",
    );
  }
  const migrated = {
    ...input,
    schemaVersion: 3,
    color: {
      ...input.color,
      schemaVersion: 5,
      settings: {
        ...settings,
        colorOutput: migrateLegacyColorOutput(outputGamut),
      },
    },
  };
  assertDataVisPacket(migrated);
  for (const axis of migrated.modeSets)
    for (const mode of axis.modes) {
      const patch = mode.foundations.color;
      if (
        Object.values(patch?.scaleStops ?? {}).some((stops) =>
          Object.values(stops).some(
            (stop) => stop.chroma !== undefined && stop.chroma > 100,
          ),
        ) ||
        Object.values(patch?.dataVisSources ?? {}).some((points) =>
          Object.values(points).some(
            (point) =>
              point.color?.chroma !== undefined && point.color.chroma > 100,
          ),
        )
      ) {
        throw new Error(
          "The legacy packet has invalid version-four mode color geometry.",
        );
      }
    }
  return migrated;
}

export function assertDataVisPacket(
  input: unknown,
): asserts input is DataVisSourcePacket {
  if (
    !isRecord(input) ||
    input.schemaVersion !== 3 ||
    !isRecord(input.color) ||
    input.color.schemaVersion !== 5 ||
    !isDataVisScaleList(input.color.dataVisScales)
  )
    throw new Error(
      "Use a valid version-three data vis packet with Color version five recipes.",
    );
  const packet = input as Partial<DataVisSourcePacket>;
  const color = packet.color;
  if (!color) throw new Error("The packet has no Color foundation.");
  if (
    !text(color.backgroundScaleId) ||
    !range(color.backgroundLightness, 0, 1) ||
    !Array.isArray(color.palette) ||
    !color.palette.every(
      (entry) =>
        isRecord(entry) &&
        text(entry.id) &&
        text(entry.name) &&
        isKeyColor(entry),
    ) ||
    !unique(color.palette.map((entry) => entry.id))
  )
    throw new Error("The packet has invalid background or Palette geometry.");
  if (
    !Array.isArray(color.scales) ||
    !color.scales.length ||
    !color.scales.every(
      (scale) =>
        isRecord(scale) &&
        text(scale.id) &&
        text(scale.name) &&
        isFoundationPublishingMetadata(scale) &&
        Array.isArray(scale.stops) &&
        scale.stops.length > 0 &&
        scale.stops.every(
          (stop) =>
            isRecord(stop) &&
            text(stop.id) &&
            isKeyColor(stop) &&
            optional(stop.paletteColorId, text),
        ) &&
        unique(scale.stops.map((stop) => stop.id)) &&
        optional(
          scale.customContrasts,
          (value) =>
            isRecord(value) &&
            contrastList(value.steps) &&
            text(value.namingRuleId) &&
            text(value.baseContrastId) &&
            Array.isArray(value.steps) &&
            value.steps.some((step) => step.id === value.baseContrastId),
        ),
    ) ||
    !unique(color.scales.map((scale) => scale.id))
  )
    throw new Error(
      "The packet has invalid UI scale geometry or swatch identities.",
    );
  if (!contrastList(color.contrasts))
    throw new Error("The packet has invalid UI contrast targets.");
  const settings = color.settings;
  if (
    !isRecord(settings) ||
    !["auto", "light", "dark"].includes(settings.side) ||
    !isColorOutputSettings(settings.colorOutput) ||
    "outputGamut" in settings ||
    !finite(settings.extOffset) ||
    !finite(settings.extSteep) ||
    !finite(settings.guardThreshold) ||
    !optional(
      settings.contrastReference,
      (value) => value === "light" || value === "dark",
    ) ||
    !optional(settings.contrastMultiplier, (value) =>
      range(value, 0, MAX_CONTRAST_MULTIPLIER),
    ) ||
    !optional(settings.polarityCompensation, (value) => range(value, 0, 1))
  )
    throw new Error("The packet has invalid generation settings.");
  if (
    !Array.isArray(packet.namingRules) ||
    !packet.namingRules.every(
      (rule) => isRule(rule) && rule.type === "scale-naming",
    ) ||
    !unique(packet.namingRules.map((rule) => rule.id))
  )
    throw new Error("The packet has an invalid scale-naming library.");
  const paletteIds = new Set(color.palette.map((entry) => entry.id));
  const hasPalette = (id: string | undefined) =>
    id === undefined || paletteIds.has(id);
  const scaleById = new Map(color.scales.map((scale) => [scale.id, scale]));
  if (
    !scaleById.has(color.backgroundScaleId) ||
    color.scales.some((scale) =>
      scale.stops.some((stop) => !hasPalette(stop.paletteColorId)),
    )
  ) {
    throw new Error(
      "The packet is missing its background or linked Palette source.",
    );
  }
  if (
    !Array.isArray(packet.modeSets) ||
    !packet.modeSets.every(isRecord) ||
    !unique(packet.modeSets.map((axis) => axis.id)) ||
    !unique(packet.modeSets.map((axis) => axis.key))
  ) {
    throw new Error("The packet has duplicate or invalid mode sets.");
  }
  const capabilities = new Set<string>(),
    modeIds = new Set<string>();
  for (const axis of packet.modeSets) {
    if (
      !text(axis.id) ||
      !text(axis.key) ||
      !Array.isArray(axis.modes) ||
      !axis.modes.length ||
      !axis.modes.every(isRecord) ||
      !axis.modes.some((mode) => mode.id === axis.defaultModeId) ||
      !unique(axis.modes.map((mode) => mode.key)) ||
      !optional(axis.authoringCapabilities, Array.isArray)
    ) {
      throw new Error(
        "Each packet mode set needs unique modes and an available default.",
      );
    }
    for (const capability of axis.authoringCapabilities ?? []) {
      if (
        ![
          "color.scales",
          "color.contrastMultiplier",
          "color.backgroundScaleId",
          "color.backgroundLightness",
        ].includes(capability) ||
        capabilities.has(capability)
      )
        throw new Error(
          "Packet color capabilities require one valid owner each.",
        );
      capabilities.add(capability);
    }
    for (const mode of axis.modes) {
      if (
        !isRecord(mode) ||
        !text(mode.id) ||
        !text(mode.key) ||
        modeIds.has(mode.id) ||
        !isRecord(mode.foundations)
      ) {
        throw new Error("The packet has invalid or duplicate mode identities.");
      }
      modeIds.add(mode.id);
      const patch = mode.foundations.color;
      if (patch === undefined) continue;
      if (
        !isRecord(patch) ||
        !optional(patch.backgroundLightness, (value) => range(value, 0, 1)) ||
        !optional(patch.contrastMultiplier, (value) =>
          range(value, 0, MAX_CONTRAST_MULTIPLIER),
        ) ||
        !optional(
          patch.backgroundScaleId,
          (value) => text(value) && scaleById.has(value),
        ) ||
        !optional(patch.dataVisSources, isDataVisSourceOverrides) ||
        !optional(patch.dataVisContrasts, isDataVisContrastOverrides)
      ) {
        throw new Error(`Mode ${mode.key} has invalid color parameters.`);
      }
      if (patch.scaleStops !== undefined) {
        if (!isRecord(patch.scaleStops))
          throw new Error(`Mode ${mode.key} has invalid UI scale patches.`);
        for (const [id, stops] of Object.entries(patch.scaleStops)) {
          const scale = scaleById.get(id);
          if (
            !scale ||
            !isRecord(stops) ||
            Object.entries(stops).some(
              ([stopId, stop]) =>
                !scale.stops.some((candidate) => candidate.id === stopId) ||
                !colorPatch(stop) ||
                !hasPalette(stop.paletteColorId),
            )
          )
            throw new Error(
              `Mode ${mode.key} references invalid UI stops or Palette colors.`,
            );
        }
      }
      if (patch.scaleContrasts !== undefined) {
        if (!isRecord(patch.scaleContrasts))
          throw new Error(`Mode ${mode.key} has invalid UI contrast patches.`);
        for (const [id, contrasts] of Object.entries(patch.scaleContrasts)) {
          const scale = scaleById.get(id);
          if (
            !scale?.customContrasts ||
            !isRecord(contrasts) ||
            Object.entries(contrasts).some(
              ([contrastId, value]) =>
                !scale.customContrasts!.steps.some(
                  (step) => step.id === contrastId,
                ) || !range(value, 1, 21),
            )
          ) {
            throw new Error(
              `Mode ${mode.key} references invalid custom UI contrasts.`,
            );
          }
        }
      }
    }
  }
  if (
    !isRecord(packet.tokenOverrides) ||
    !Object.values(packet.tokenOverrides).every(
      (edit) =>
        isRecord(edit) &&
        optional(edit.value, text) &&
        optional(edit.name, isRecord),
    )
  )
    throw new Error("The packet has invalid legacy UI overrides.");
  if (
    !isRecord(packet.browserTokenEdits) ||
    !Object.values(packet.browserTokenEdits).every(
      (edit) =>
        isRecord(edit) &&
        isRecord(edit.values) &&
        Object.values(edit.values).every(
          (value) =>
            isRecord(value) && text(value.value) && text(value.baseline),
        ),
    )
  )
    throw new Error("The packet has invalid color-token edits.");
}
