// Copyright 2026 Adobe. All rights reserved.
import {
  Content,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  SearchField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue } from "jotai";
import { useDeferredValue, useState } from "react";
import {
  IconSamplePicker,
  LazySpectrumIcon,
  surfaceIconTone,
} from "../components/fields/IconSamplePicker";
import {
  filterSpectrumIcons,
  SPECTRUM_ICON_OPTIONS,
} from "../features/icons/iconSearch";
import type { SpectrumIconName } from "../features/icons/spectrumIconCatalog.generated";
import {
  generatedIconsAtom,
  iconScaleSampleIconsAtom,
  type GeneratedIconScale,
} from "../features/icons/state";
import { elementsSurfaceStyleAtom } from "../state/view/elementsSurface";
import { formatAnalyzeNumber } from "./analyze/format";
import { elementsSurfaceStyles } from "./elementsSurfaceStyles";
import { FoundationsElementsHeader } from "./FoundationsElementsHeader";
import { previewLabelStyles } from "./previewLabelStyles";
import { useNumericRuntime } from "../features/edit-session/numericContext";
import { useEditorPreview } from "../features/edit-session/useEditorPreview";
import { DerivedContentBoundary } from "../components/DerivedContentBoundary";

const containerStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minHeight: "full",
  overflow: "auto",
  minWidth: 0,
});
const sectionStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "full",
  boxSizing: "border-box",
  minWidth: 0,
});
const sectionHeaderStyle = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 16,
});
const headingStyle = style({ font: "title-sm", margin: 0, color: "inherit" });
// Each scale has a left column (its sample icon picker above its size ramp) and an icon browser on the right.
// The left column sets the height; the browser fills that height without adding to it and scrolls inside.
const bodyStyle = style({
  display: "flex",
  alignItems: "stretch",
  gap: 24,
  minWidth: 0,
});
const sideStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  flexShrink: 0,
  width: 224,
});
const rampStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
});
const rampItemStyle = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
});
const rampIconSlotStyle = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});
const captionStyle = style({
  font: "detail-sm",
  color: "inherit",
  opacity: 0.8,
  textAlign: "center",
  margin: 0,
});
const browserSlotStyle = style({
  position: "relative",
  flexGrow: 1,
  minWidth: 0,
  minHeight: 240,
});
const browserStyle = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  borderRadius: "lg",
  backgroundColor: "layer-1",
  color: "neutral",
  minWidth: 0,
  minHeight: 0,
});
const gridScrollStyle = style({
  flexGrow: 1,
  overflowY: "auto",
  minWidth: 0,
  minHeight: 0,
});
const gridStyle = style({ display: "grid", gap: 8 });
const gridCellStyle = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: 8,
  minWidth: 0,
});
const cellLabelStyle = style({
  font: "detail-sm",
  color: "inherit",
  opacity: 0.8,
  textAlign: "center",
  overflowWrap: "anywhere",
  margin: 0,
});

/** Picks the base step when the chosen step is no longer part of the scale. */
function iconGridStep(
  values: GeneratedIconScale["values"],
  chosenStep: number | undefined,
) {
  return (
    values.find((value) => value.step === chosenStep) ??
    values.find((value) => value.index === 0) ??
    values[0]
  );
}

const DEFAULT_SAMPLE_ICON: SpectrumIconName = "Home";

function IconScalePreview({ generated }: { generated: GeneratedIconScale }) {
  const { scale, values, issue } = generated;
  const [sampleIcons, setSampleIcons] = useAtom(iconScaleSampleIconsAtom);
  const sampleIcon = sampleIcons[scale.id] ?? DEFAULT_SAMPLE_ICON;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const icons = filterSpectrumIcons(SPECTRUM_ICON_OPTIONS, deferredQuery);
  const [chosenStep, setChosenStep] = useState<number>();
  const gridValue = iconGridStep(values, chosenStep);
  const largestSize = Math.max(0, ...values.map((value) => value.value));
  const surfaceStyle = useAtomValue(elementsSurfaceStyleAtom);
  return (
    <section
      className={sectionStyle}
      aria-label={`${scale.name} icon scale`}
      data-icon-scale={scale.id}
    >
      <div className={sectionHeaderStyle}>
        <h3 className={headingStyle}>{scale.name}</h3>
        {gridValue && (
          <Picker
            label="Preview icon size"
            labelPosition="side"
            selectedKey={String(gridValue.step)}
            onSelectionChange={(key) => {
              if (key != null) setChosenStep(Number(key));
            }}
          >
            {values.map((value) => (
              <PickerItem key={value.step} id={String(value.step)}>
                {`${value.step} (${formatAnalyzeNumber(value.value)}px)`}
              </PickerItem>
            ))}
          </Picker>
        )}
      </div>
      {issue && (
        <InlineAlert variant="negative">
          <Heading>{`Could not show ${scale.name}`}</Heading>
          <Content>{issue}</Content>
        </InlineAlert>
      )}
      {gridValue && (
        <div className={bodyStyle}>
          <div className={sideStyle}>
            <IconSamplePicker
              selectedIcon={sampleIcon}
              onChange={(icon) =>
                setSampleIcons({ ...sampleIcons, [scale.id]: icon })
              }
              isCompact
            />
            <div
              className={`${rampStyle} ${elementsSurfaceStyles}`}
              style={surfaceStyle}
              role="list"
              aria-label={`${scale.name} sizes`}
              data-elements-surface
            >
              {values.map((value) => (
                <div
                  key={value.step}
                  role="listitem"
                  className={rampItemStyle}
                  data-icon-step={value.step}
                  data-value={value.value}
                >
                  <div
                    className={rampIconSlotStyle}
                    style={{ width: largestSize, minHeight: value.value }}
                  >
                    <LazySpectrumIcon
                      name={sampleIcon}
                      size={value.value}
                      tone={surfaceIconTone(surfaceStyle.color)}
                    />
                  </div>
                  <p className={previewLabelStyles}>
                    {`${value.step}${value.index === 0 ? " (base)" : ""}`}
                    <br />
                    {`${formatAnalyzeNumber(value.value)}px`}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className={browserSlotStyle}>
            <div
              className={browserStyle}
              role="group"
              aria-label={`${scale.name} icon browser`}
            >
              <SearchField
                label="Filter icons"
                labelPosition="side"
                value={query}
                onChange={setQuery}
              />
              <div className={gridScrollStyle} data-icon-browser-scroll>
                {icons.length ? (
                  <div
                    className={gridStyle}
                    role="list"
                    aria-label={`${scale.name} icon set at ${gridValue.step}`}
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(96, gridValue.value + 24)}px, 1fr))`,
                    }}
                  >
                    {icons.map((icon) => (
                      <div
                        key={icon.id}
                        role="listitem"
                        className={gridCellStyle}
                      >
                        <LazySpectrumIcon
                          name={icon.id}
                          size={gridValue.value}
                          inheritColor
                        />
                        <p className={cellLabelStyle}>{icon.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p role="status" className={captionStyle}>
                    {`No icons match "${deferredQuery}".`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function IconsElementsContent({
  scales,
}: {
  scales: readonly GeneratedIconScale[];
}) {
  return (
    <>
      <FoundationsElementsHeader title="Icons" />
      {scales.map((generated) => (
        <IconScalePreview key={generated.scale.id} generated={generated} />
      ))}
    </>
  );
}

export function IconsElements() {
  return useNumericRuntime() ? (
    <LiveIconsElements />
  ) : (
    <AcceptedIconsElements />
  );
}
function LiveIconsElements() {
  const result = useEditorPreview("icons", null);
  return (
    <DerivedContentBoundary
      state={result.status}
      label="Updating icon preview"
      error={result.error}
      onRetry={result.retry}
    >
      {result.ready?.value.kind === "icons" && (
        <div data-component="IconsElements" className={containerStyle}>
          <IconsElementsContent scales={result.ready.value.scales} />
        </div>
      )}
    </DerivedContentBoundary>
  );
}
function AcceptedIconsElements() {
  const scales = useAtomValue(generatedIconsAtom);
  return (
    <div data-component="IconsElements" className={containerStyle}>
      <IconsElementsContent scales={scales} />
    </div>
  );
}
