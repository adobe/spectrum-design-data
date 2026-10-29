// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import { resolveColorDocument } from "../resolution";
import { resolvedBackgroundLinear } from "../surfaceGeneration";
import { MAX_CONTRAST_MULTIPLIER } from "../polarity";
import type { ModeSet } from "../../modes/model";
import type { ScaleNamingRule } from "../../logic/model";
import { generateScaleColorTokens } from "../../tokens/colorGeneration";
import { generatePaletteTokens } from "../../tokens/paletteGeneration";
import {
  canonicalTokenModeKey,
  resolveBrowserColorToken,
} from "../../tokens/colorResolution";
import { resolveToken, type TokenOverrideMap } from "../../tokens/model";
import type { BrowserTokenEdits } from "../../tokens/browserEditTypes";
import { compileContinuousScale, type ContinuousScale } from "./continuous";
import { upgradeDataVisPacket } from "./packetValidation";
import { dataVisSourceIssues } from "./references";
import { finalUiSwatches, resolveDataVisPoints } from "./resolution";
import { resolvedCategoricalColors } from "./categoricalValues";
import { publishedPrimitiveColors } from "./primitiveColors";
import { dataVisMemberId } from "./identity";

export interface DataVisSourcePacket {
  schemaVersion: 3;
  color: ColorSystemDocument;
  modeSets: ModeSet[];
  namingRules: ScaleNamingRule[];
  tokenOverrides: TokenOverrideMap;
  browserTokenEdits: BrowserTokenEdits;
}
export interface DataVisRuntimeOptions {
  modes?: Record<string, string>;
  contrastMultiplier?: number;
  backgroundLightness?: number;
  backgroundScaleId?: string;
}
export interface DataVisRuntime {
  definitions: {
    id: string;
    name: string;
    kind: "sequential" | "diverging" | "categorical";
  }[];
  continuous: (idOrName: string) => (normalizedValue: number) => string;
  categorical: (idOrName: string) => string[];
  diagnostics: (idOrName: string) => string[];
  withContext: (options: DataVisRuntimeOptions) => DataVisRuntime;
}

export function createDataVisRuntime(
  input: unknown,
  options: DataVisRuntimeOptions = {},
): DataVisRuntime {
  const packet = upgradeDataVisPacket(input);
  const issues = dataVisSourceIssues(packet.color, packet.modeSets);
  if (issues.length) throw new Error(issues.join(" "));
  for (const key of Object.keys(options.modes ?? {}))
    if (!packet.modeSets.some((axis) => axis.key === key)) {
      throw new Error(`Unknown mode set ${key}.`);
    }
  const modes = packet.modeSets.map((axis) => {
    const selected = options.modes?.[axis.key];
    const mode =
      selected === undefined
        ? axis.modes.find((mode) => mode.id === axis.defaultModeId)
        : axis.modes.find((mode) => mode.key === selected);
    if (!mode)
      throw new Error(
        `Mode ${selected ?? "(default)"} is unavailable in ${axis.key}.`,
      );
    return mode;
  });
  if (
    options.contrastMultiplier !== undefined &&
    (!Number.isFinite(options.contrastMultiplier) ||
      options.contrastMultiplier < 0 ||
      options.contrastMultiplier > MAX_CONTRAST_MULTIPLIER)
  )
    throw new Error("Choose a supported finite global contrast multiplier.");
  if (
    options.backgroundLightness !== undefined &&
    (!Number.isFinite(options.backgroundLightness) ||
      options.backgroundLightness < 0 ||
      options.backgroundLightness > 1)
  )
    throw new Error("Choose a finite background lightness from zero to one.");
  const preview = {
    ...(options.contrastMultiplier !== undefined && {
      "color.contrastMultiplier": options.contrastMultiplier,
    }),
    ...(options.backgroundLightness !== undefined && {
      "color.backgroundLightness": options.backgroundLightness,
    }),
    ...(options.backgroundScaleId !== undefined && {
      "color.backgroundScaleId": options.backgroundScaleId,
    }),
  };
  const raw = resolveColorDocument(packet.color, modes, preview, {
    modeSets: packet.modeSets,
    applyMultiplier: false,
    applyPolarity: false,
  });
  if (!raw.scales.some((scale) => scale.id === raw.backgroundScaleId))
    throw new Error(
      "The requested background scale is outside this source-closed packet.",
    );
  const document = resolveColorDocument(packet.color, modes, preview, {
    modeSets: packet.modeSets,
  });
  const modeKey = canonicalTokenModeKey(
    Object.fromEntries(
      packet.modeSets.map((axis, index) => [axis.id, modes[index].id]),
    ),
  );
  const tokens = [
    ...generatePaletteTokens(document.palette, document.settings.colorOutput),
    ...document.scales.flatMap((scale) =>
      generateScaleColorTokens(
        scale,
        document.contrasts,
        resolvedBackgroundLinear(document),
        document.settings,
        document.settings.colorOutput,
        packet.namingRules,
      ),
    ),
  ].map((token) =>
    resolveBrowserColorToken(
      resolveToken(token, packet.tokenOverrides[token.uuid]),
      packet.browserTokenEdits,
      modeKey,
      document,
    ),
  );
  const swatches = finalUiSwatches(document, tokens),
    continuous = new Map<string, ContinuousScale>(),
    categorical = new Map<string, string[]>();
  const members = resolvedCategoricalColors(
    raw,
    swatches,
    packet.browserTokenEdits,
    modeKey,
  );
  const primitives = publishedPrimitiveColors(document, tokens, members);
  for (const definition of raw.dataVisScales) {
    if (definition.kind !== "categorical") {
      continuous.set(
        definition.id,
        compileContinuousScale(
          definition,
          resolveDataVisPoints(raw, definition, swatches, primitives),
          raw.settings.colorOutput,
        ),
      );
    } else {
      categorical.set(
        definition.id,
        definition.members.map((member) => {
          const value = members.find(
            (color) => color.id === dataVisMemberId(definition.id, member.id),
          );
          if (!value)
            throw new Error("A categorical runtime color is unavailable.");
          return value.value;
        }),
      );
    }
  }
  const find = (idOrName: string) => {
    const matches = raw.dataVisScales.filter(
      (definition) =>
        definition.id === idOrName || definition.name === idOrName,
    );
    if (matches.length !== 1)
      throw new Error(
        `Choose one available data vis scale ID or unique name: ${idOrName}.`,
      );
    return matches[0];
  };
  return {
    definitions: raw.dataVisScales.map(({ id, name, kind }) => ({
      id,
      name,
      kind,
    })),
    continuous(idOrName) {
      const definition = find(idOrName),
        scale = continuous.get(definition.id);
      if (!scale)
        throw new Error(
          `${definition.name} is categorical, not a continuous function.`,
        );
      return scale.evaluate;
    },
    categorical(idOrName) {
      const definition = find(idOrName),
        colors = categorical.get(definition.id);
      if (!colors)
        throw new Error(
          `${definition.name} is continuous, not a categorical palette.`,
        );
      return [...colors];
    },
    diagnostics(idOrName) {
      const definition = find(idOrName);
      return [...(continuous.get(definition.id)?.diagnostics ?? [])];
    },
    withContext(next) {
      return createDataVisRuntime(packet, {
        ...options,
        ...next,
        modes: { ...options.modes, ...next.modes },
      });
    },
  };
}
