// Copyright 2026 Adobe. All rights reserved.
import { Picker, PickerItem, TextField } from "@react-spectrum/s2";
import {
  iconStyle,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { updateTypographyAtom } from "../../features/typography/state";
import { TEXT_ZOOM_ATTRIBUTE } from "../../features/typography/typographyCss";
import {
  TYPOGRAPHY_PREVIEW_SCOPE,
  type TypographyPreviewInput,
  type TypographyPreviewOutput,
} from "../../features/typography/previewWork";
import { usePreviewWorker } from "../../features/derived-work/usePreviewWorker";
import {
  typographyPreviewSourceAtom,
  liveTypographyDocumentAtom,
  previewRulesAtom,
  previewScaleTypesAtom,
  previewInterpolationsAtom,
  previewTaxonomyAtom,
  previewIconsAtom,
} from "../../features/edit-session/previewSources";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import "./TypographyElements.css";
import { lineHeightName } from "../../features/typography/lineHeightNames";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { EditablePicker } from "../../components/editable";
import { IconSamplePicker } from "../../components/fields/IconSamplePicker";
import { useIconSample } from "../../features/icons/useIconSample";
import { TypographyRamp } from "./TypographyRamp";
import {
  defaultTypographyDisplayModes,
  typographyDisplayModes,
  type TypographyDisplayMode,
} from "./typographyPreview";
import type { SpectrumIconName } from "../../features/icons/spectrumIconCatalog.generated";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

const createPreviewWorker = () =>
  new Worker(
    new URL("../../features/typography/preview.worker.ts", import.meta.url),
    { type: "module" },
  );

const containerStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minHeight: "full",
  overflow: "auto",
});
const listStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
  overflowX: "auto",
});

const typographyElementsInputAtom = atom(
  (get): TypographyPreviewInput => ({
    document: get(typographyPreviewSourceAtom),
    resolved: get(liveTypographyDocumentAtom),
    rules: get(previewRulesAtom),
    scaleTypes: get(previewScaleTypesAtom),
    interpolations: get(previewInterpolationsAtom),
    registry: get(previewTaxonomyAtom),
    icons: get(previewIconsAtom),
  }),
);

export function TypographyElements() {
  const input = useAtomValue(typographyElementsInputAtom);
  const { document, registry } = input;
  const generation = usePreviewWorker<
    TypographyPreviewInput,
    TypographyPreviewOutput
  >(input, createPreviewWorker);
  const generated = generation.ready;
  const surfaceStyle = useAtomValue(elementsSurfaceStyleAtom);
  const update = useSetAtom(updateTypographyAtom);
  const [displayModes, setDisplayModes] = useState<TypographyDisplayMode[]>(
    defaultTypographyDisplayModes,
  );
  const [sampleText, setSampleText] = useState(
    "The quick brown fox jumps over the lazy dog",
  );
  const [selectedIcon, setSelectedIcon] = useState<SpectrumIconName>("Home");
  const selectedSample = useIconSample(selectedIcon);
  const loadedIcon =
    selectedSample.status === "loading" ? undefined : selectedSample;
  const icon = useMemo(
    () => loadedIcon ?? { name: selectedIcon, status: "loading" as const },
    [loadedIcon, selectedIcon],
  );
  const renderIcon = useCallback(
    (size: number) =>
      icon.status === "ready" ? (
        <icon.Icon
          aria-hidden="true"
          styles={
            surfaceStyle.color === "#ffffff"
              ? iconStyle({ color: "white" })
              : iconStyle({ color: "black" })
          }
          UNSAFE_style={{ width: size, height: size, color: "inherit" }}
        />
      ) : (
        <span style={{ display: "block", width: size, height: size }} />
      ),
    [icon, surfaceStyle.color],
  );

  return (
    <div className={containerStyle}>
      <div className="typographyPreviewHeader">
        <FoundationsElementsHeader
          title="Typography"
          controls={
            <>
              <Picker
                labelPosition="side"
                label="Show"
                selectionMode="multiple"
                value={displayModes}
                onChange={(keys) =>
                  setDisplayModes(
                    typographyDisplayModes.filter((mode) =>
                      keys.includes(mode),
                    ),
                  )
                }
              >
                <PickerItem id="font-size">Font size</PickerItem>
                <PickerItem id="line-height">Line height</PickerItem>
                <PickerItem id="sample-icon">Sample icon</PickerItem>
              </Picker>
              <TextField
                labelPosition="side"
                label="Sample text"
                value={sampleText}
                onChange={setSampleText}
              />
              {displayModes.includes("sample-icon") && (
                <IconSamplePicker
                  selectedIcon={selectedIcon}
                  onChange={setSelectedIcon}
                />
              )}
              <EditablePicker
                label="Sample line height"
                selectedKey={document.previewLineHeightId}
                displayValue={termLabel(
                  lineHeightName(
                    document,
                    registry,
                    document.previewLineHeightId,
                  ),
                )}
                onSelectionChange={(key) => {
                  if (key != null) update({ previewLineHeightId: String(key) });
                }}
              >
                {document.lineHeights.map((card) => (
                  <PickerItem id={card.id} key={card.id}>
                    {termLabel(lineHeightName(document, registry, card.id))}
                  </PickerItem>
                ))}
              </EditablePicker>
            </>
          }
        />
      </div>
      {displayModes.includes("sample-icon") && icon.status === "loading" && (
        <div role="status">Loading sample icon...</div>
      )}
      {displayModes.includes("sample-icon") && icon.status === "error" && (
        <div role="alert">
          {icon.message}. Choose another sample icon or reload to retry.
        </div>
      )}
      <DerivedContentBoundary
        state={generation.status}
        label="Updating typography preview"
        error={generation.error}
        onRetry={generation.retry}
      >
        {generated && (
          <>
            <style>{generated.value.css}</style>
            <div
              className={`${listStyle} ${elementsSurfaceStyles} ${TYPOGRAPHY_PREVIEW_SCOPE.slice(1)}`}
              style={surfaceStyle}
              data-elements-surface
              {...{ [TEXT_ZOOM_ATTRIBUTE]: generated.input.resolved.textZoom }}
            >
              <TypographyRamp
                tokens={generated.value.tokens}
                lineHeightId={generated.input.document.previewLineHeightId}
                outputUnit={generated.input.document.outputUnit}
                sampleText={sampleText}
                displayModes={displayModes}
                renderIcon={renderIcon}
              />
            </div>
          </>
        )}
      </DerivedContentBoundary>
    </div>
  );
}
