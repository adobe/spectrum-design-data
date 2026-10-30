// Copyright 2026 Adobe. All rights reserved.
import { Picker, PickerItem, TextField } from "@react-spectrum/s2";
import {
  iconStyle,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  resolvedTypographyDocumentAtom,
  typographyDocumentAtom,
  updateTypographyAtom,
} from "../../features/typography/state";
import {
  buildTypographyCss,
  TEXT_ZOOM_ATTRIBUTE,
} from "../../features/typography/typographyCss";
import { generateTypography } from "../../features/typography/typographyGeneration";
import { rulesAtom } from "../../features/logic/library";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import "./TypographyElements.css";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { lineHeightName } from "../../features/typography/lineHeightNames";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { EditablePicker } from "../../components/editable";
import { IconSamplePicker } from "../../components/fields/IconSamplePicker";
import { useIconSample } from "../../features/icons/useIconSample";
import { TypographyRamp } from "./TypographyRamp";
import {
  typographyDisplayModes,
  type TypographyDisplayMode,
} from "./typographyPreview";
import type { SpectrumIconName } from "../../features/icons/spectrumIconCatalog.generated";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

const PREVIEW_SCOPE = ".typographyRampPreview";

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

const typographyElementsInputAtom = atom((get) => ({
  surfaceStyle: get(elementsSurfaceStyleAtom),
  document: get(typographyDocumentAtom),
  resolved: get(resolvedTypographyDocumentAtom),
  rules: get(rulesAtom),
  scaleTypes: get(scaleTypesAtom),
  interpolations: get(interpolationsAtom),
  registry: get(taxonomyDocumentAtom),
}));

export function TypographyElements() {
  const input = useAtomValue(typographyElementsInputAtom);
  const { document, registry } = input;
  const update = useSetAtom(updateTypographyAtom);
  const [displayModes, setDisplayModes] = useState<TypographyDisplayMode[]>(
    typographyDisplayModes,
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
  const incoming = useMemo(
    () => ({ ...input, displayModes, sampleText, icon }),
    [input, displayModes, sampleText, icon],
  );
  const preview = useDeferredValue(incoming);
  const {
    document: previewDocument,
    resolved,
    rules,
    scaleTypes,
    interpolations,
    registry: previewRegistry,
    surfaceStyle,
    icon: previewIcon,
  } = preview;
  const tokens = useMemo(
    () =>
      generateTypography(
        resolved,
        undefined,
        rules,
        scaleTypes,
        interpolations,
      ),
    [resolved, rules, scaleTypes, interpolations],
  );
  const css = useMemo(
    () =>
      buildTypographyCss(previewDocument, {
        scope: PREVIEW_SCOPE,
        purpose: "authoring",
        rules,
        scaleTypes,
        interpolations,
        registry: previewRegistry,
      }),
    [previewDocument, rules, scaleTypes, interpolations, previewRegistry],
  );
  const renderIcon = useCallback(
    (size: number) =>
      previewIcon.status === "ready" ? (
        <previewIcon.Icon
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
    [previewIcon, surfaceStyle.color],
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
                <PickerItem id="icon-size">Icon size</PickerItem>
              </Picker>
              <TextField
                labelPosition="side"
                label="Sample text"
                value={sampleText}
                onChange={setSampleText}
              />
              <IconSamplePicker
                selectedIcon={selectedIcon}
                onChange={setSelectedIcon}
              />
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
      {icon.status === "loading" && (
        <div role="status">Loading sample icon...</div>
      )}
      {icon.status === "error" && (
        <div role="alert">
          {icon.message}. Choose another sample icon or reload to retry.
        </div>
      )}
      <DerivedContentBoundary
        state={incoming === preview ? "ready" : "pending"}
        label="Updating typography preview"
      >
        <style>{css}</style>
        <div
          className={`${listStyle} ${elementsSurfaceStyles} ${PREVIEW_SCOPE.slice(1)}`}
          style={surfaceStyle}
          data-elements-surface
          {...{ [TEXT_ZOOM_ATTRIBUTE]: resolved.textZoom }}
        >
          <TypographyRamp
            tokens={tokens}
            lineHeightId={previewDocument.previewLineHeightId}
            outputUnit={previewDocument.outputUnit}
            sampleText={preview.sampleText}
            displayModes={preview.displayModes}
            renderIcon={renderIcon}
          />
        </div>
      </DerivedContentBoundary>
    </div>
  );
}
