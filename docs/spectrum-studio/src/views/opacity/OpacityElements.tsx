// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, type ExtractAtomValue } from "jotai";
import {
  alignedSwatchCellStyles as swatchStyles,
  alignedSwatchLabelStyles as scaleIndexStyles,
} from "../color-system/alignedSwatchStyles";
import { AlignedSwatchRow } from "../color-system/AlignedSwatchRow";
import { previewLabelStyles } from "../previewLabelStyles";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { opacityResultAtom } from "../../features/opacity/state";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";
import {
  formatOpacityPercent,
  opacityEditDescription,
  opacitySwatchStyle,
} from "./opacityPresentation";
import { useNumericRuntime } from "../../features/edit-session/numericContext";
import { useEditorPreview } from "../../features/edit-session/useEditorPreview";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

const layoutStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  height: "full",
  minHeight: 0,
  minWidth: 0,
  overflow: "auto",
  paddingTop: 16,
  paddingStart: 16,
  paddingEnd: 16,
  paddingBottom: 8,
});
const paletteStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "full",
  minWidth: 0,
  overflow: "auto",
  padding: 16,
  flexGrow: 1,
});
export function OpacityElements() {
  return useNumericRuntime() ? (
    <LiveOpacityElements />
  ) : (
    <AcceptedOpacityElements />
  );
}
function LiveOpacityElements() {
  const result = useEditorPreview("opacity", null);
  return (
    <DerivedContentBoundary
      state={result.status}
      label="Updating opacity preview"
      error={result.error}
      onRetry={result.retry}
    >
      {result.ready?.value.kind === "opacity" && (
        <OpacityElementsContent result={result.ready.value.result} />
      )}
    </DerivedContentBoundary>
  );
}
function AcceptedOpacityElements() {
  const result = useAtomValue(opacityResultAtom);
  return <OpacityElementsContent result={result} />;
}
function OpacityElementsContent({
  result,
}: {
  result: ExtractAtomValue<typeof opacityResultAtom>;
}) {
  const surfaceStyle = useAtomValue(elementsSurfaceStyleAtom);
  return (
    <div className={layoutStyles} data-component="OpacityElements">
      <FoundationsElementsHeader title="Opacity" />
      {result.issues.map((issue) => (
        <div key={issue} role="status">
          <Text>{issue}</Text>
        </div>
      ))}
      <div
        className={`${paletteStyles} ${elementsSurfaceStyles}`}
        style={surfaceStyle}
        data-elements-surface
      >
        <AlignedSwatchRow label="Opacity" isScaleLabel>
          {result.levels.map((level) => (
            <Text
              key={level.id}
              UNSAFE_className={`${scaleIndexStyles} ${previewLabelStyles}`}
            >
              {level.scaleIndex}
            </Text>
          ))}
        </AlignedSwatchRow>
        <AlignedSwatchRow label="">
          {result.levels.map((level) => (
            <div
              key={level.id}
              role="img"
              className={swatchStyles}
              data-opacity-id={level.id}
              style={opacitySwatchStyle(level.value)}
              aria-label={`Opacity ${level.scaleIndex}, ${formatOpacityPercent(level.value)}. ${opacityEditDescription(level)}.`}
              title={`${level.name}: ${formatOpacityPercent(level.value)}. ${opacityEditDescription(level)}.`}
            />
          ))}
        </AlignedSwatchRow>
        <AlignedSwatchRow label="">
          {result.levels.map((level) => (
            <Text
              key={level.id}
              UNSAFE_className={`${scaleIndexStyles} ${previewLabelStyles}`}
            >
              {formatOpacityPercent(level.value)}
              {level.overridden &&
                (level.stale ? " (out of date)" : " (edited)")}
            </Text>
          ))}
        </AlignedSwatchRow>
      </div>
    </div>
  );
}
