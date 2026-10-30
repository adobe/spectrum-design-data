// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  ActionButton,
  Badge,
  Header,
  Heading,
  Picker,
  PickerItem,
  PickerSection,
  Text,
  ToastQueue,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Revert from "@react-spectrum/s2/icons/Revert";
import { Focusable } from "react-aria-components";
import {
  atom,
  useAtomValue,
  useSetAtom,
  useStore,
  type ExtractAtomValue,
} from "jotai";
import type { CSSProperties } from "react";
import { Fragment, memo, useDeferredValue, useMemo } from "react";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import { renderGamutForOutput } from "../../features/color-system/colorMath";
import { generateColors } from "../../features/color-system/dynamicGeneration";
import {
  resolvedColorSystemDocumentAtom,
  colorSystemScaleDataAtom,
} from "../../features/color-system/state";
import {
  overriddenTokenCountAtom,
  overrideStatusBySourceAtom,
  resetAllTokenOverridesAtom,
  resetTokenAtom,
  staleTokenCountAtom,
  type TokenOverrideStatus,
} from "../../features/tokens/state";
import { tokenDisplayName, tokenStableKey } from "../../features/tokens/model";
import {
  rampSurfaceIdAtom,
  showColorValuesAtom,
  showContrastValuesAtom,
  showCssOpacityComparisonAtom,
  showOpaqueComparisonAtom,
} from "../../state/view/colorSystemView";
import {
  resolvedBackgroundLinear,
  surfaceCss,
  surfaceLinear,
} from "../../features/color-system/surfaceGeneration";
import { useAtom } from "jotai";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import {
  alignedSwatchCellStyles as swatchStyles,
  alignedSwatchLabelStyles as tokenStyles,
} from "./alignedSwatchStyles";
import { AlignedSwatchRow } from "./AlignedSwatchRow";
import { elementsSurfaceStyle } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";
import "./ColorEvaluation.css";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../../features/color-system/contrastSteps";
import { rulesAtom } from "../../features/logic/library";

const layoutStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  height: "full",
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
  paddingTop: 16,
  paddingStart: 16,
  paddingEnd: 16,
  paddingBottom: 8,
});
const scaleStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});
const paletteStyles = style({
  display: "flex",
  flexGrow: 1,
  flexDirection: "column",
  width: "full",
  minHeight: 0,
  minWidth: 0,
  color: "inherit",
  paddingTop: 16,
  paddingBottom: 32,
  paddingStart: 16,
  paddingEnd: 16,
  overflow: "auto",
});
const evaluationToolbarStyles = style({
  //   position: "sticky",
  display: "flex",
  //   top: -8,
  flexDirection: "column",
  gap: 0,
  flexWrap: "wrap",
  backgroundColor: "gray-25",
  zIndex: 2,
  width: "full",
  // paddingTop: 16,
  // paddingStart: 16,
  // paddingEnd: 16,
  // paddingBottom: 8,
});

function formatDeviation(measured: number, target: number) {
  const deviation = measured - target;
  return Math.abs(deviation) < 0.005
    ? null
    : `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}`;
}

function OverrideDiff({ override }: { override: TokenOverrideStatus }) {
  const rows: { property: string; original: string; edited: string }[] = [];
  if (override.overrideName) {
    rows.push({
      property: "Name",
      original: tokenDisplayName(override.baselineName),
      edited: tokenDisplayName(override.overrideName),
    });
  }
  if (override.overrideValue) {
    rows.push({
      property: "Value",
      original: override.baselineValue,
      edited: override.overrideValue,
    });
  }

  return (
    <div className="colorEvaluationOverrideDiff">
      <Text UNSAFE_className="colorEvaluationOverrideDiffHeader">Property</Text>
      <Text UNSAFE_className="colorEvaluationOverrideDiffHeader">Original</Text>
      <Text UNSAFE_className="colorEvaluationOverrideDiffHeader">Edited</Text>
      {rows.map((row) => (
        <Fragment key={row.property}>
          <Text>{row.property}</Text>
          <Text>{row.original}</Text>
          <Text>{row.edited}</Text>
        </Fragment>
      ))}
      {override.stale && (
        <Text UNSAFE_className="colorEvaluationOverrideDiffHeader">
          Out of date with current generation
        </Text>
      )}
    </div>
  );
}

type EvaluationDisplayOption =
  | "opaque"
  | "transparent"
  | "contrast"
  | "colorValue";

const evaluationDisplayOptionSections: {
  title: string;
  options: { id: EvaluationDisplayOption; label: string }[];
}[] = [
  {
    title: "Comparison",
    options: [
      { id: "opaque", label: "Opaque scale" },
      { id: "transparent", label: "CSS opacity" },
    ],
  },
  {
    title: "Values",
    options: [
      { id: "contrast", label: "Show contrast" },
      { id: "colorValue", label: "Show values" },
    ],
  },
];

function ColorChip({
  color,
  backgroundColor = color.hex,
  className,
  value,
  targetContrast,
  showColorValue,
  showContrast,
  override,
  overrideLabel,
  onResetOverride,
}: {
  color: { hex: string; measuredContrast: number };
  backgroundColor?: string;
  className?: string;
  value: string;
  targetContrast: number;
  showColorValue: boolean;
  showContrast: boolean;
  override?: TokenOverrideStatus;
  overrideLabel?: string;
  onResetOverride?: () => void;
}) {
  const deviation = formatDeviation(color.measuredContrast, targetContrast);

  return (
    <div
      className={`${swatchStyles} colorEvaluationSwatch${className ? ` ${className}` : ""}`}
      style={{ "--sw": backgroundColor } as CSSProperties}
    >
      {override && onResetOverride && (
        <div className="colorEvaluationOverride">
          <ActionButton
            size="XS"
            staticColor="black"
            aria-label={`Reset ${overrideLabel ?? "token"} to generated`}
            onPress={onResetOverride}
          >
            <Revert />
          </ActionButton>
          <TooltipTrigger delay={300}>
            <Focusable>
              <Badge
                size="S"
                variant={override.stale ? "notice" : "informative"}
              >
                {override.stale ? "Out of date" : "Edited"}
              </Badge>
            </Focusable>
            <Tooltip UNSAFE_style={{ maxWidth: 280 }}>
              <OverrideDiff override={override} />
            </Tooltip>
          </TooltipTrigger>
        </div>
      )}
      {showColorValue && (
        <Text UNSAFE_className="colorEvaluationValue colorEvaluationSwatchText">
          {value}
        </Text>
      )}
      {showContrast && deviation && (
        <Text UNSAFE_className="colorEvaluationDeviation colorEvaluationSwatchText">
          {deviation}
        </Text>
      )}
      {showContrast && (
        <Text UNSAFE_className="colorEvaluationContrast colorEvaluationSwatchText">
          {color.measuredContrast.toFixed(2)}
        </Text>
      )}
    </div>
  );
}

function PaletteRow({
  label,
  contrasts,
  render,
}: {
  label: string;
  contrasts: import("../../features/color-system/model").ContrastToken[];
  render: (
    contrast: import("../../features/color-system/model").ContrastToken,
    index: number,
  ) => React.ReactNode;
}) {
  return (
    <AlignedSwatchRow label={label} className="colorEvaluationComparisonRow">
      {contrasts.map(render)}
    </AlignedSwatchRow>
  );
}

const evaluationInputAtom = atom((get) => ({
  document: get(resolvedColorSystemDocumentAtom),
  scaleData: get(colorSystemScaleDataAtom),
  rules: get(rulesAtom),
  showOpaque: get(showOpaqueComparisonAtom),
  showTransparent: get(showCssOpacityComparisonAtom),
  showContrast: get(showContrastValuesAtom),
  showColorValue: get(showColorValuesAtom),
  surfaceId: get(rampSurfaceIdAtom),
  overrideStatuses: get(overrideStatusBySourceAtom),
}));

export function ColorEvaluation() {
  const input = useAtomValue(evaluationInputAtom);
  const deferred = useDeferredValue(input);
  const { document } = input;
  const [showOpaque, setShowOpaque] = useAtom(showOpaqueComparisonAtom);
  const [showTransparent, setShowTransparent] = useAtom(
    showCssOpacityComparisonAtom,
  );
  const [showContrast, setShowContrast] = useAtom(showContrastValuesAtom);
  const [showColorValue, setShowColorValue] = useAtom(showColorValuesAtom);
  const [surfaceId, setSurfaceId] = useAtom(rampSurfaceIdAtom);
  const overriddenCount = useAtomValue(overriddenTokenCountAtom);
  const staleCount = useAtomValue(staleTokenCountAtom);
  const resetToken = useSetAtom(resetTokenAtom);
  const resetAllOverrides = useSetAtom(resetAllTokenOverridesAtom);
  const surface =
    document.surfaces.find((item) => item.id === surfaceId) ??
    document.surfaces[0];
  const selectedDisplayOptions = useMemo(() => {
    const selected: EvaluationDisplayOption[] = [];
    if (showOpaque) selected.push("opaque");
    if (showTransparent) selected.push("transparent");
    if (showContrast) selected.push("contrast");
    if (showColorValue) selected.push("colorValue");
    return selected;
  }, [showColorValue, showContrast, showOpaque, showTransparent]);

  const handleDisplayOptionsChange = (value: (string | number)[]) => {
    const selected = new Set(value);
    setShowOpaque(selected.has("opaque"));
    setShowTransparent(selected.has("transparent"));
    setShowContrast(selected.has("contrast"));
    setShowColorValue(selected.has("colorValue"));
  };

  return (
    <div className={layoutStyles}>
      <div className={evaluationToolbarStyles}>
        <FoundationsElementsHeader
          title="Color ramps"
          controls={
            <>
              <Picker
                labelPosition="side"
                label="Show"
                selectionMode="multiple"
                value={selectedDisplayOptions}
                onChange={handleDisplayOptionsChange}
              >
                {evaluationDisplayOptionSections.map((section) => (
                  <PickerSection key={section.title} id={section.title}>
                    <Header>
                      <Heading>{section.title}</Heading>
                    </Header>
                    {section.options.map((option) => (
                      <PickerItem key={option.id} id={option.id}>
                        {option.label}
                      </PickerItem>
                    ))}
                  </PickerSection>
                ))}
              </Picker>
              <Picker
                labelPosition="side"
                label="Surface"
                value={surface.id}
                onChange={(key) => setSurfaceId(String(key))}
              >
                {document.surfaces.map((item) => (
                  <PickerItem key={item.id} id={item.id}>
                    {termLabel(item.name)}
                  </PickerItem>
                ))}
              </Picker>
              {overriddenCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge
                    size="S"
                    variant={staleCount > 0 ? "notice" : "informative"}
                  >
                    {staleCount > 0
                      ? `${overriddenCount} edited, ${staleCount} out of date`
                      : `${overriddenCount} edited`}
                  </Badge>
                  <ActionButton onPress={() => resetAllOverrides()}>
                    <Revert />
                    <Text>Reset all edits</Text>
                  </ActionButton>
                </div>
              )}
            </>
          }
        />
      </div>
      <DerivedContentBoundary
        state={input === deferred ? "ready" : "pending"}
        label="Updating color ramps"
      >
        <EvaluationPalette input={deferred} resetToken={resetToken} />
      </DerivedContentBoundary>
    </div>
  );
}

const EvaluationPalette = memo(function EvaluationPalette({
  input,
  resetToken,
}: {
  input: ExtractAtomValue<typeof evaluationInputAtom>;
  resetToken: (uuid: string) => void;
}) {
  const {
    document,
    scaleData,
    rules,
    surfaceId,
    showOpaque,
    showTransparent,
    showContrast,
    showColorValue,
    overrideStatuses,
  } = input;
  const store = useStore();
  const surface =
    document.surfaces.find((item) => item.id === surfaceId) ??
    document.surfaces[0];
  const background = surface.base
    ? resolvedBackgroundLinear(document)
    : surfaceLinear(surface, document);
  const backgroundCss = surfaceCss(surface, document);
  const surfaceStyle = elementsSurfaceStyle({
    css: backgroundCss,
    linear: background,
    gamut: renderGamutForOutput(document.settings.colorOutput),
  });
  const generatedByScale = useMemo(
    () =>
      new Map(
        document.scales.map((scale) => [
          scale.id,
          scaleContrasts(document, scale).map((contrast) =>
            generateColors(
              scaleData.get(scale.id)!,
              background,
              contrast.value,
              document.settings,
            ),
          ),
        ]),
      ),
    [background, document, scaleData],
  );
  const resetCurrent = (uuid: string) => {
    if (store.get(evaluationInputAtom) !== input) {
      ToastQueue.negative(
        "The preview is not current. Reset the token after its current value is available.",
      );
      return;
    }
    resetToken(uuid);
  };
  return (
    <div
      className={`${paletteStyles} ${elementsSurfaceStyles}`}
      data-elements-surface
      style={
        {
          ...surfaceStyle,
          width: "calc(100% - 32px)",
          "--bg": backgroundCss,
        } as CSSProperties
      }
    >
      <div
        className="colorEvaluationPaletteContent"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          height: "auto",
        }}
      >
        {document.scales.map((scale) => {
          const contrasts = scaleContrasts(document, scale);
          const generatedForScale = generatedByScale.get(scale.id)!;
          return (
            <section
              key={scale.id}
              className={`${scaleStyles} colorEvaluationScale`}
            >
              <AlignedSwatchRow
                label={termLabel(scale.name)}
                isScaleLabel
                className="colorEvaluationComparisonRow"
              >
                {contrasts.map((contrast, index) => (
                  <Text
                    key={contrast.id}
                    UNSAFE_className={String(tokenStyles)}
                  >
                    {contrastStepIndex(index, scale, rules)}
                  </Text>
                ))}
              </AlignedSwatchRow>
              <div>
                <PaletteRow
                  label=""
                  contrasts={contrasts}
                  render={(contrast, index) => {
                    const generated = generatedForScale[index];
                    const override = overrideStatuses.get(
                      tokenStableKey(scale.id, contrast.id),
                    );
                    return (
                      <ColorChip
                        key={contrast.id}
                        color={generated.dynamic}
                        backgroundColor={generated.dynamic.css}
                        value={generated.dynamic.css}
                        targetContrast={contrast.value}
                        showColorValue={showColorValue}
                        showContrast={showContrast}
                        override={override}
                        overrideLabel={`${termLabel(scale.name)} ${contrastStepIndex(index, scale, rules)}`}
                        onResetOverride={
                          override
                            ? () => resetCurrent(override.uuid)
                            : undefined
                        }
                      />
                    );
                  }}
                />
                {showOpaque && (
                  <PaletteRow
                    label="Opaque (Spectrum studio)"
                    contrasts={contrasts}
                    render={(_, index) => {
                      const generated = generatedForScale[index];
                      return (
                        <ColorChip
                          key={contrasts[index].id}
                          color={generated.opaque}
                          value={generated.opaque.css}
                          targetContrast={contrasts[index].value}
                          showColorValue={showColorValue}
                          showContrast={showContrast}
                        />
                      );
                    }}
                  />
                )}
                {showTransparent && (
                  <PaletteRow
                    label="Transparent"
                    contrasts={contrasts}
                    render={(_, index) => {
                      const generated = generatedForScale[index];
                      return (
                        <ColorChip
                          key={contrasts[index].id}
                          color={generated.transparent}
                          backgroundColor={generated.transparent.css}
                          value={generated.transparent.css}
                          targetContrast={contrasts[index].value}
                          showColorValue={showColorValue}
                          showContrast={showContrast}
                        />
                      );
                    }}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
});
