// Copyright 2026 Adobe. All rights reserved.
import type { ColorAnchor } from "./scaleGeneration";
import type { ColorSystemDocument } from "./model";
import { buildScaleData } from "./scaleGeneration";
import {
  linearToXyzD65,
  renderGamutForOutput,
  xyzD65ToLinear,
} from "./colorMath";
import { outputGamut, type ColorOutputSettings } from "./outputSettings";
import { resolvedBackgroundLinear, surfaceLinear } from "./surfaceGeneration";
import { generateColors } from "./dynamicGeneration";
import { multiplyContrast } from "./polarity";
import { outputColorCss } from "./colorMath";
import { paletteColorCss } from "./paletteValue";
import {
  foundationNameSegment,
  kebabCaseNameFormatter,
} from "../taxonomy/formatting";
import {
  projectClassification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import {
  governedColorContext,
  governedSurfaceContext,
} from "../taxonomy/colorGovernance";
import { contrastStepIndex, scaleContrasts } from "./contrastSteps";
import type { Rule } from "../logic/model";
import { STANDARD_SCALE_NAMING_RULE } from "../logic/scaleNaming";

export function sanitizeTokenName(value: string) {
  return foundationNameSegment(value);
}

function fixed(value: number) {
  return value.toFixed(12);
}

function channelExpression(
  anchors: ColorAnchor[],
  channel: number,
  luminanceVariable: string,
) {
  return anchors
    .slice(0, -1)
    .map((anchor, index) => {
      const next = anchors[index + 1];
      const slope =
        (next.linear[channel] - anchor.linear[channel]) /
        (next.luminance - anchor.luminance || 1);
      return `${fixed(slope)} * (clamp(${fixed(anchor.luminance)}, var(${luminanceVariable}), ${fixed(next.luminance)}) - ${fixed(anchor.luminance)})`;
    })
    .join("\n             + ");
}

function sideExpression(side: ColorSystemDocument["settings"]["side"]) {
  if (side === "dark") return "1";
  if (side === "light") return "0";
  return "clamp(0, round(up, calc(var(--_luma) - 0.1791), 1), 1)";
}

function formattedExpression(reference: string, settings: ColorOutputSettings) {
  if (settings.outputFormat === "oklch")
    return `oklch(from ${reference} l c h)`;
  if (settings.outputFormat === "hsl") return `hsl(from ${reference} h s l)`;
  const gamut = outputGamut(settings);
  return gamut === "srgb"
    ? `rgb(from ${reference} r g b)`
    : `color(from ${reference} ${gamut} r g b)`;
}

function contrastLuminanceExpression(contrast: string, dark: boolean) {
  const target = dark
    ? `((var(--_luma) + 0.05) / ${contrast} - 0.05)`
    : `(${contrast} * (var(--_luma) + 0.05) - 0.05)`;
  // Relative-color conversion is approximate in browsers. Keep a small margin, bounded by the feasible endpoint.
  return `(${target} ${dark ? "-" : "+"} min(0.0001, max(0, ${dark ? target : `(1 - ${target})`})))`;
}

function dynamicTintDeclarations({
  anchors,
  offset,
  steepness,
  contrast,
  dark,
  reference,
  output,
  gamut,
}: {
  anchors: ColorAnchor[];
  offset: number;
  steepness: number;
  contrast: string;
  dark: string;
  reference: string;
  output: string;
  gamut: ColorSystemDocument["settings"]["colorOutput"];
}) {
  const resolvedGamut = outputGamut(gamut);
  const colorSpace = resolvedGamut !== "srgb" ? "xyz-d65" : "srgb-linear";
  const cssAnchors =
    resolvedGamut !== "srgb"
      ? anchors.map((anchor) => ({
          ...anchor,
          linear: linearToXyzD65(anchor.linear, resolvedGamut),
        }))
      : anchors;
  const channels = resolvedGamut !== "srgb" ? ["x", "y", "z"] : ["r", "g", "b"];
  const white =
    resolvedGamut !== "srgb"
      ? linearToXyzD65([1, 1, 1], resolvedGamut)
      : [1, 1, 1];
  const luma =
    resolvedGamut !== "srgb" ? "y" : "0.2126*r + 0.7152*g + 0.0722*b";
  const channelValues = channels
    .map(
      (channel, index) => `
    calc(var(--_interior) * (var(--_a) * (${channelExpression(cssAnchors, index, "--_lsrc")})
      + (1 - var(--_a)) * ${channel}) + var(--_white) * ${fixed(white[index])})`,
    )
    .join("");
  const outputColor = `--_linear-color: color(from ${reference} ${colorSpace}${channelValues});
  ${output}: ${formattedExpression("var(--_linear-color)", gamut)};`;
  return `  --_c: ${contrast};
  --_luma: (${luma});
  --_dark: ${dark};
  --_lov: calc(var(--_dark) * ${contrastLuminanceExpression("var(--_c)", true)}
            + (1 - var(--_dark)) * ${contrastLuminanceExpression("var(--_c)", false)});
  --_black: calc(1 - clamp(0, round(up, var(--_lov), 1), 1));
  --_white: clamp(0, round(down, var(--_lov), 1), 1);
  --_interior: calc(1 - var(--_black) - var(--_white));
  --_ext: clamp(0, calc(${offset.toFixed(3)} + ${steepness.toFixed(3)} * (var(--_c) - 1) / 11), 1);
  --_lend: calc(1 - var(--_dark));
  --_lsrc: clamp(0, calc(var(--_lov) + var(--_ext) * (var(--_lend) - var(--_lov))), 1);
  --_dn: calc(var(--_dark) * min(var(--_lsrc) - var(--_luma), -0.0001)
            + (1 - var(--_dark)) * max(var(--_lsrc) - var(--_luma), 0.0001));
  --_a: clamp(0, calc((var(--_lov) - var(--_luma)) / var(--_dn)), 1);
  ${outputColor}`;
}

function baseTintDeclarations(
  contrast: string,
  forceDark: boolean,
  reference: string,
  output: string,
  gamut: ColorSystemDocument["settings"]["colorOutput"],
) {
  const goLight = forceDark
    ? "0"
    : `(1 - clamp(0, round(up, calc(${contrast} - 1.05/(var(--_luma) + 0.05)), 1), 1))`;
  const lighten = (channel: string) =>
    `(${channel} + var(--_al) * (${channel}/var(--_maxc) - ${channel}))`;
  const darken = (channel: string) => `(var(--_f) * ${channel})`;
  const channel = (
    value: string,
  ) => `calc((1 - var(--_repair)) * (var(--_gl) * ${lighten(value)}
    + (1 - var(--_gl)) * ${darken(value)}) + var(--_repair))`;
  const resolvedGamut = outputGamut(gamut);
  const wide = resolvedGamut !== "srgb";
  const coordinates = wide ? ["x", "y", "z"] : ["r", "g", "b"];
  const toRgb = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ].map(([x, y, z]) => xyzD65ToLinear([x, y, z], resolvedGamut));
  const rgb = ["r", "g", "b"].map((name, index) =>
    wide
      ? `(${fixed(toRgb[0][index])}*${coordinates[0]} + ${fixed(toRgb[1][index])}*${coordinates[1]} + ${fixed(toRgb[2][index])}*${coordinates[2]})`
      : name,
  );
  const toXyz = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ].map(([r, g, b]) => linearToXyzD65([r, g, b], resolvedGamut));
  const channels = rgb.map(channel);
  const outputChannels = wide
    ? [0, 1, 2].map(
        (index) =>
          `calc(${fixed(toXyz[0][index])}*${channels[0]} + ${fixed(toXyz[1][index])}*${channels[1]} + ${fixed(toXyz[2][index])}*${channels[2]})`,
      )
    : channels;
  const formattedOutput = `${output}: ${formattedExpression("var(--_linear-color)", gamut)};`;
  return `  --_luma: (${wide ? "y" : "0.2126*r + 0.7152*g + 0.0722*b"});
  --_maxc: max(0.000001, ${rgb[0]}, ${rgb[1]}, ${rgb[2]});
  --_al: clamp(0, calc((${contrastLuminanceExpression(contrast, false)} - var(--_luma))
            / max(var(--_luma)/var(--_maxc) - var(--_luma), 0.000001)), 1);
  --_f: calc(${contrastLuminanceExpression(contrast, true)} / max(var(--_luma), 0.000001));
  --_gl: ${goLight};
  --_candidate-luma: calc(var(--_luma) + var(--_al) * (var(--_luma)/var(--_maxc) - var(--_luma)));
  --_repair: calc(var(--_gl) * clamp(0, (${contrastLuminanceExpression(contrast, false)} - var(--_candidate-luma))
    / max(1 - var(--_candidate-luma), 0.000001), 1));
  --_linear-color: color(from ${reference} ${wide ? "xyz-d65" : "srgb-linear"}
    ${outputChannels.join("\n    ")});
  ${formattedOutput}`;
}

export interface ColorLibraryMode {
  key: string;
  isDefault: boolean;
  document: ColorSystemDocument;
}

function surfaceContrastVariable(name: string) {
  return `--surface-contrast-${name}`;
}

// Precomputed per mode so explicit opposite values survive; see docs/contrast-polarity-compensation.md for the runtime alternative.
function modeDeclarations(
  document: ColorSystemDocument,
  taxonomy?: TaxonomyDocument,
) {
  const background = outputColorCss(
    resolvedBackgroundLinear(document),
    document.settings.colorOutput,
    renderGamutForOutput(document.settings.colorOutput),
  );
  return [
    `  --bg: ${background};`,
    `  --surface-base: ${background};`,
    ...document.surfaces
      .filter((surface) => surface.base && taxonomy)
      .map((surface) => {
        const projection = projectClassification(
          taxonomy!,
          governedSurfaceContext(document, taxonomy!, surface.id).governed!,
          "colors",
        );
        if (projection.issues.length)
          throw new Error(projection.issues.join(" "));
        return `  --${projection.name}: var(--surface-base);`;
      }),
    ...document.contrasts.map(
      (contrast, index) =>
        `  --contrast-${(index + 1) * 100}: ${Number(contrast.value.toFixed(3))};`,
    ),
    ...document.surfaces
      .filter((surface) => !surface.base)
      .map(
        (surface) =>
          `  ${surfaceContrastVariable(sanitizeTokenName(surface.name))}: ${(surface.contrast ?? 1).toFixed(3)};`,
      ),
  ];
}

export interface ContrastLibraryMode {
  modeSetKey: string;
  key: string;
  isDefault: boolean;
  multiplier: number;
}

export interface ScaleLibraryMode extends ColorLibraryMode {
  modeSetKey: string;
}

export interface CustomContrastLibraryMode {
  selector: string;
  document: ColorSystemDocument;
  prefersContrast?: boolean;
}

function customContrastVariable(scaleName: string, index: number) {
  return `--contrast-${sanitizeTokenName(scaleName)}-${kebabCaseNameFormatter.formatValue(index)}`;
}

function customContrastDeclarations(
  document: ColorSystemDocument,
  rules: readonly Rule[],
) {
  return document.scales.flatMap(
    (scale) =>
      scale.customContrasts?.steps.map(
        (step, position) =>
          `  ${customContrastVariable(scale.name, contrastStepIndex(position, scale, rules))}: ${Number(step.value.toFixed(6))};`,
      ) ?? [],
  );
}

/** Palette colors are fixed, so they are declared once on :root and never per mode. */
export function paletteDeclarations(
  document: ColorSystemDocument,
  taxonomy?: TaxonomyDocument,
) {
  return document.palette.flatMap((color) => {
    const legacy = `--color-palette-${sanitizeTokenName(color.name)}`;
    if (!taxonomy)
      return [
        `  ${legacy}: ${paletteColorCss(color, document.settings.colorOutput)};`,
      ];
    const context = governedColorContext(
      document,
      taxonomy,
      "palette",
      color.id,
    );
    const projection = projectClassification(
      taxonomy,
      context.governed!,
      "colors",
    );
    if (projection.issues.length) throw new Error(projection.issues.join(" "));
    return [
      `  --${projection.name}: ${paletteColorCss(color, document.settings.colorOutput)};`,
      `  ${legacy}: var(--${projection.name});`,
    ];
  });
}

function multiplied(contrast: string) {
  return `min(21, calc((${contrast} - 1) * var(--contrast-multiplier) + 1))`;
}

export function dataAttribute(modeSetKey: string) {
  return `data-${modeSetKey.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

function colorRules(
  document: ColorSystemDocument,
  scope = "",
  taxonomy?: TaxonomyDocument,
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
) {
  const scaleRules = document.scales.flatMap((scale) => {
    const data = buildScaleData(scale, document.settings.colorOutput);
    const name = sanitizeTokenName(scale.name);
    const offset = data.neutral ? 1 : document.settings.extOffset;
    const steepness = data.neutral ? 0 : document.settings.extSteep;
    return scaleContrasts(document, scale).map((contrast, index) => {
      const label = contrastStepIndex(index, scale, rules);
      const variable = scale.customContrasts
        ? customContrastVariable(scale.name, label)
        : `--contrast-${label}`;
      const projection = taxonomy
        ? projectClassification(
            taxonomy,
            governedColorContext(
              document,
              taxonomy,
              scale.id,
              contrast.id,
              rules,
            ).governed!,
            "colors",
          )
        : undefined;
      if (projection?.issues.length)
        throw new Error(projection.issues.join(" "));
      return [
        `${scope}.color-scale-${name}.color-contrast-${kebabCaseNameFormatter.formatValue(label)} {`,
        dynamicTintDeclarations({
          anchors: data.anchors,
          offset,
          steepness,
          contrast: multiplied(`var(${variable})`),
          dark: sideExpression(document.settings.side),
          reference: "var(--bg)",
          output: "--color-system-tint",
          gamut: document.settings.colorOutput,
        }),
        ...(projection
          ? [`  --${projection.name}: var(--color-system-tint);`]
          : []),
        "}",
      ].join("\n");
    });
  });
  const surfaceRules = document.surfaces
    .filter((surface) => !surface.base)
    .map((surface) => {
      const name = sanitizeTokenName(surface.name);
      const contrast = multiplied(`var(${surfaceContrastVariable(name)})`);
      const scale = document.scales.find((candidate) =>
        surface.sourceScaleId
          ? candidate.id === surface.sourceScaleId
          : surface.source !== "base" && candidate.name === surface.source,
      );
      const reference =
        surface.reference === "base" ? "var(--surface-base)" : "var(--bg)";
      const declarations = scale
        ? (() => {
            const data = buildScaleData(scale, document.settings.colorOutput);
            return dynamicTintDeclarations({
              anchors: data.anchors,
              offset: data.neutral ? 1 : document.settings.extOffset,
              steepness: data.neutral ? 0 : document.settings.extSteep,
              contrast,
              dark: surface.forceDark
                ? "1"
                : `clamp(0, round(up, calc(${contrast} - 1.05/(var(--_luma) + 0.05)), 1), 1)`,
              reference,
              output: "--surface-color",
              gamut: document.settings.colorOutput,
            });
          })()
        : baseTintDeclarations(
            contrast,
            !!surface.forceDark,
            reference,
            "--surface-color",
            document.settings.colorOutput,
          );
      const publish =
        surface.reference === "base"
          ? "  background: var(--surface-color);\n  --bg: var(--surface-color);"
          : "  background: var(--surface-color);";
      const projection = taxonomy
        ? projectClassification(
            taxonomy,
            governedSurfaceContext(document, taxonomy, surface.id).governed!,
            "colors",
          )
        : undefined;
      if (projection?.issues.length)
        throw new Error(projection.issues.join(" "));
      const canonical = projection
        ? `\n  --${projection.name}: var(--surface-color);`
        : "";
      return `${scope}.surface-${name} {\n${declarations}\n${publish}${canonical}\n}`;
    });
  return [...scaleRules, ...surfaceRules];
}

export function buildColorLibrary(
  document: ColorSystemDocument,
  modes: ColorLibraryMode[] = [],
  contrastModes: ContrastLibraryMode[] = [],
  scaleModes: ScaleLibraryMode[] = [],
  taxonomy?: TaxonomyDocument,
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
  customModes: CustomContrastLibraryMode[] = [],
) {
  const documents = new Set([
    document,
    ...modes.map((mode) => mode.document),
    ...scaleModes.map((mode) => mode.document),
    ...customModes.map((mode) => mode.document),
  ]);
  for (const source of documents) {
    const multipliers = new Set([
      source.settings.contrastMultiplier ?? 1,
      ...contrastModes.map((mode) => mode.multiplier),
    ]);
    for (const multiplier of multipliers) {
      const resolved = {
        ...source,
        contrasts: source.contrasts.map((contrast) => ({
          ...contrast,
          value: multiplyContrast(contrast.value, multiplier),
        })),
        scales: source.scales.map((scale) => ({
          ...scale,
          ...(scale.customContrasts && {
            customContrasts: {
              ...scale.customContrasts,
              steps: scale.customContrasts.steps.map((step) => ({
                ...step,
                value: multiplyContrast(step.value, multiplier),
              })),
            },
          }),
        })),
        surfaces: source.surfaces.map((surface) => ({
          ...surface,
          ...(!surface.base && {
            contrast: multiplyContrast(surface.contrast ?? 1, multiplier),
          }),
        })),
      };
      const backgrounds = [
        resolvedBackgroundLinear(resolved),
        ...modes.map((mode) => resolvedBackgroundLinear(mode.document)),
      ];
      for (const scale of resolved.scales) {
        const data = buildScaleData(scale, resolved.settings.colorOutput);
        for (const background of backgrounds)
          for (const contrast of scaleContrasts(resolved, scale)) {
            generateColors(data, background, contrast.value, resolved.settings);
          }
      }
      for (const surface of resolved.surfaces) surfaceLinear(surface, resolved);
    }
  }
  const rootDocument =
    modes.find((mode) => mode.isDefault)?.document ?? document;
  const defaultScaleDocument =
    scaleModes.find((mode) => mode.isDefault)?.document ?? rootDocument;
  const defaultContrast = contrastModes.find((mode) => mode.isDefault);
  const rootMultiplier =
    defaultContrast?.multiplier ??
    rootDocument.settings.contrastMultiplier ??
    1;
  const rootBlock = [
    ":root {",
    `  --contrast-multiplier: ${rootMultiplier};`,
    ...modeDeclarations(rootDocument, taxonomy),
    ...paletteDeclarations(rootDocument, taxonomy),
    "}",
  ].join("\n");
  const modeBlocks = modes
    .filter((mode) => !mode.isDefault)
    .map((mode) =>
      [
        `[data-color-scheme="${sanitizeTokenName(mode.key)}"] {`,
        ...modeDeclarations(mode.document, taxonomy),
        "}",
      ].join("\n"),
    );
  const contrastBlocks = contrastModes.map(
    (mode) =>
      `[${dataAttribute(mode.modeSetKey)}="${sanitizeTokenName(mode.key)}"] {\n  --contrast-multiplier: ${mode.multiplier};\n}`,
  );
  const moreContrast = contrastModes.find(
    (mode) => mode.key === "high" || mode.key === "more",
  );
  // An explicit data attribute always wins over the OS preference.
  const preferenceBlock = moreContrast
    ? `@media (prefers-contrast: more) {\n  :root:not([${dataAttribute(moreContrast.modeSetKey)}]) {\n    --contrast-multiplier: ${moreContrast.multiplier};\n  }\n}`
    : undefined;

  return [
    rootBlock,
    ...modeBlocks,
    ...contrastBlocks,
    ...(preferenceBlock ? [preferenceBlock] : []),
    ...(document.scales.some((scale) => scale.customContrasts)
      ? [
          [
            ":root {",
            ...customContrastDeclarations(rootDocument, rules),
            "}",
          ].join("\n"),
          ...customModes.map((mode) => {
            const block = [
              mode.selector + " {",
              ...customContrastDeclarations(mode.document, rules),
              "}",
            ].join("\n");
            return mode.prefersContrast
              ? `@media (prefers-contrast: more) {\n${block}\n}`
              : block;
          }),
        ]
      : []),
    ".color-system-tint-bg { background-color: var(--color-system-tint); }",
    ".color-system-tint-fg { color: var(--color-system-tint); }",
    ".s-content { --bg: var(--surface-color); }",
    ...colorRules(defaultScaleDocument, "", taxonomy, rules),
    ...scaleModes
      .filter((mode) => !mode.isDefault)
      .flatMap((mode) =>
        colorRules(
          mode.document,
          `[${dataAttribute(mode.modeSetKey)}="${sanitizeTokenName(mode.key)}"] `,
          taxonomy,
          rules,
        ),
      ),
  ].join("\n\n");
}
