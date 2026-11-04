// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { modeSetsAtom } from "../features/modes/state";
import type { Mode, ModeSet } from "../features/modes/model";
import { colorSystemDocumentAtom } from "../features/color-system/state";
import { resolveColorScaleDocument as resolveColorDocument } from "../features/color-system/colorScaleResolution";
import {
  buildScaleData,
  scaleHueChromaAt,
} from "../features/color-system/scaleGeneration";
import { generateSelectedColor } from "../features/color-system/colorScaleType";
import { scaleContrasts } from "../features/color-system/contrastSteps";
import {
  paletteColorLinear,
  paletteColorCss,
} from "../features/color-system/paletteValue";
import { outputGamut } from "../features/color-system/outputSettings";
import { MODE_ICONS } from "../features/modes/icons";
import {
  modeSetPreviewFoundation,
  previewContrastIndices,
  typographyPreviewPositions,
} from "../features/modes/presentation";
import { typographyDocumentAtom } from "../features/typography/state";
import { resolveTypographyDocument } from "../features/typography/resolution";
import { generateTypography } from "../features/typography/typographyGeneration";
import { elevationDocumentAtom } from "../features/elevation/state";
import { resolveElevationDocument } from "../features/elevation/resolution";
import { generateElevation, shadowCss } from "../features/elevation/generate";
import { opacitySourceAtom } from "../features/opacity/state";
import { rulesAtom } from "../features/logic/library";
import {
  scaleTypesAtom,
  interpolationsAtom,
} from "../features/logic/scaleTypeLibrary";
import { colorOutputSettingsAtom } from "../features/color-system/state";
import type { FoundationId } from "../features/modes/parameters";

const previewStyles = style({
  display: "flex",
  flexDirection: "column",
  width: 194,
  minWidth: 194,
  alignSelf: "stretch",
  paddingTop: 8,
  paddingBottom: 8,
  paddingStart: 8,
});
const previewContentStyles = style({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  borderStartRadius: "[8px]",
  overflow: "hidden",
});
const rowStyles = style<{ isColor: boolean }>({
  display: "flex",
  flexGrow: 1,
  flexBasis: 0,
  alignItems: "center",
  justifyContent: "center",
  gap: { default: 4, isColor: 0 },
  minHeight: 34,
});
const swatchStyles = style({
  width: 34,
  alignSelf: "stretch",
  marginY: 8,
});
const typeSampleStyles = style({
  color: "neutral",
  font: "title-sm",
});
const elevationSampleStyles = style({
  width: 28,
  height: 20,
  backgroundColor: "layer-2",
});
const fallbackStyles = style({
  display: "flex",
  flexGrow: 1,
  flexBasis: 0,
  justifyContent: "center",
  alignItems: "center",
  color: "neutral-subdued",
});

function ColorPreview({ mode }: { mode: Mode }) {
  const base = useAtomValue(colorSystemDocumentAtom);
  const sets = useAtomValue(modeSetsAtom);
  const opacity = useAtomValue(opacitySourceAtom);
  const resolved = resolveColorDocument(base, [mode], undefined, {
    modeSets: sets,
    opacity: opacity.opacity,
    browserTokenEdits: opacity.browserTokenEdits,
  });
  const scale = resolved.scales[0];
  if (!scale) return null;
  const contrastSteps = scaleContrasts(resolved, scale);
  const selectedContrasts = previewContrastIndices(contrastSteps.length).map(
    (index) => contrastSteps[index],
  );
  const backgroundScale = resolved.scales.find(
    (candidate) => candidate.id === resolved.backgroundScaleId,
  );
  const gamut = outputGamut(resolved.settings.colorOutput);
  const backgroundColor = backgroundScale
    ? scaleHueChromaAt(backgroundScale.stops, resolved.backgroundLightness)
    : { chroma: 0, hue: 0 };
  const background = paletteColorCss(
    { ...backgroundColor, lightness: resolved.backgroundLightness },
    gamut,
  );
  const scaleData = buildScaleData(scale, resolved.settings.colorOutput);
  const colors = selectedContrasts.map(
    (contrast) =>
      generateSelectedColor(
        scaleData,
        paletteColorLinear(
          { ...backgroundColor, lightness: resolved.backgroundLightness },
          gamut,
        ),
        contrast,
        resolved.settings,
      ).css,
  );
  return (
    <div
      className={rowStyles({ isColor: true })}
      style={{ backgroundColor: background }}
    >
      {colors.map((color, index) => (
        <span
          key={`${scale.id}-${index}`}
          className={swatchStyles}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function TypographyPreview({ mode }: { mode: Mode }) {
  const base = useAtomValue(typographyDocumentAtom);
  const sets = useAtomValue(modeSetsAtom);
  const rules = useAtomValue(rulesAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const resolved = resolveTypographyDocument(base, [mode], undefined, {
    modeSets: sets,
  });
  const samples = generateTypography(
    resolved,
    resolved.textZoom,
    rules,
    scaleTypes,
    interpolations,
  ).sort((first, second) => first.fontSize - second.fontSize);
  const sampleByPosition = new Map(
    samples.map((sample) => [sample.position, sample]),
  );
  const sizes = typographyPreviewPositions(
    samples.map((sample) => sample.position),
  ).flatMap((position) => {
    const sample = sampleByPosition.get(position);
    return sample ? [sample] : [];
  });
  return (
    <div
      className={rowStyles({ isColor: false })}
      aria-label={`${mode.name} text size preview`}
    >
      {sizes.map((sample) => (
        <span
          key={sample.position}
          className={typeSampleStyles}
          style={{ fontSize: `${sample.fontSize}px` }}
        >
          Ag
        </span>
      ))}
    </div>
  );
}

function ElevationPreview({ mode }: { mode: Mode }) {
  const document = useAtomValue(elevationDocumentAtom);
  const sets = useAtomValue(modeSetsAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const colorOutput = useAtomValue(colorOutputSettingsAtom);
  const opacitySource = useAtomValue(opacitySourceAtom);
  const resolved = resolveElevationDocument(
    document,
    [mode],
    sets,
    {},
    opacitySource,
  );
  const levels = generateElevation(resolved, scaleTypes, colorOutput);
  const indices = previewContrastIndices(levels.length);
  return (
    <div
      className={rowStyles({ isColor: false })}
      aria-label={`${mode.name} elevation preview`}
    >
      {indices.map((index) => (
        <span
          key={levels[index].id}
          className={elevationSampleStyles}
          style={{ boxShadow: shadowCss(levels[index]) }}
        />
      ))}
    </div>
  );
}

function PreviewRow({
  mode,
  modeSet,
  foundation,
}: {
  mode: Mode;
  modeSet: ModeSet;
  foundation: FoundationId | undefined;
}) {
  if (foundation === "color") return <ColorPreview mode={mode} />;
  if (foundation === "typography") return <TypographyPreview mode={mode} />;
  if (foundation === "elevation") return <ElevationPreview mode={mode} />;
  const icon =
    modeSet.iconId && modeSet.iconId !== "none"
      ? MODE_ICONS[modeSet.iconId]
      : MODE_ICONS[mode.iconId];
  return <div className={fallbackStyles}>{icon}</div>;
}

export function ModeSetPreview({
  modeSet,
  foundations = [],
}: {
  modeSet: ModeSet;
  foundations?: readonly FoundationId[];
}) {
  const foundation = modeSetPreviewFoundation(modeSet, foundations);
  return (
    <div className={previewStyles} aria-label={`${modeSet.name} previews`}>
      <div className={previewContentStyles}>
        {modeSet.modes.map((mode) => (
          <PreviewRow
            key={mode.id}
            mode={mode}
            modeSet={modeSet}
            foundation={foundation}
          />
        ))}
      </div>
    </div>
  );
}
