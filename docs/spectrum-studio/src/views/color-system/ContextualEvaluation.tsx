// Copyright 2026 Adobe. All rights reserved.
import {
  Checkbox,
  Heading,
  Picker,
  PickerItem,
  Slider,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";
import {
  hexToLinear,
  linearToHex,
} from "../../features/color-system/colorMath";
import type { Surface } from "../../features/color-system/model";
import {
  resolvedColorSystemDocumentAtom,
  surfaceRole,
} from "../../features/color-system/state";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../../features/color-system/contrastSteps";
import { rulesAtom } from "../../features/logic/library";
import {
  activeContrastIdAtom,
  nestDepthAtom,
  previewScaleIdAtom,
  showMetaAtom,
} from "../../state/view/colorSystemView";
import {
  resolvedBackgroundLinear,
  surfaceLinear,
} from "../../features/color-system/surfaceGeneration";
import { ColorScalePicker } from "../../components/color-picker/ColorScalePicker";

const layoutStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
});
const controlsStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 16,
});
const treeStyles = style({ display: "flex", flexDirection: "column", gap: 12 });
const contextStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
  borderRadius: "default",
});
const leafStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: 8,
  borderRadius: "default",
  backgroundColor: "layer-1",
});
const swatchStyles = style({
  width: 120,
  height: 40,
  borderRadius: "default",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
});
const metaStyles = style({ font: "detail", color: "detail" });

export function ContextualEvaluation() {
  const document = useAtomValue(resolvedColorSystemDocumentAtom);
  const rules = useAtomValue(rulesAtom);
  const [previewScaleId, setPreviewScaleId] = useAtom(previewScaleIdAtom);
  const [activeContrastId, setActiveContrastId] = useAtom(activeContrastIdAtom);
  const [nestDepth, setNestDepth] = useAtom(nestDepthAtom);
  const [showMeta, setShowMeta] = useAtom(showMetaAtom);
  const scale =
    document.scales.find((item) => item.id === previewScaleId) ??
    document.scales[0];
  const contrasts = scaleContrasts(document, scale);
  const contrast =
    contrasts.find((item) => item.id === activeContrastId) ?? contrasts[0];
  const nestingSurfaces = document.surfaces.filter(
    (surface) => surface.showInPreview && surfaceRole(surface) === "nest",
  );

  function renderLeaf(surface: Surface, background: string): ReactNode {
    const color = linearToHex(
      surfaceLinear(surface, document, hexToLinear(background)),
    );
    return (
      <div key={surface.id} className={leafStyles}>
        <div className={swatchStyles} style={{ backgroundColor: color }} />
        <Text>
          {surface.name} · {surface.contrast ?? 1}:1
        </Text>
      </div>
    );
  }

  function renderContext(
    surface: Surface,
    parentColor: string,
    depth: number,
  ): ReactNode {
    const color = linearToHex(
      surfaceLinear(surface, document, hexToLinear(parentColor)),
    );
    const applied = document.surfaces.filter(
      (item) => item.showInPreview && surfaceRole(item) === "applied",
    );
    const once = document.surfaces.filter(
      (item) => item.showInPreview && surfaceRole(item) === "once",
    );
    return (
      <div
        key={`${surface.id}-${depth}`}
        className={contextStyles}
        style={{ backgroundColor: color }}
      >
        <Heading level={3}>{surface.name}</Heading>
        <div className={swatchStyles} style={{ backgroundColor: color }} />
        {showMeta && (
          <Text UNSAFE_className={String(metaStyles)}>
            Scale: {scale.name} · Contrast: {contrast.value}:1 · Depth: {depth}
          </Text>
        )}
        {applied.map((item) => renderLeaf(item, color))}
        {depth > 0 &&
          nestingSurfaces.map((item) => renderContext(item, color, depth - 1))}
        {depth === nestDepth && once.map((item) => renderLeaf(item, color))}
      </div>
    );
  }

  return (
    <div className={layoutStyles}>
      <Heading level={2}>Contextual evaluation</Heading>
      <div className={controlsStyles}>
        <ColorScalePicker
          label="Scale"
          labelPosition="top"
          document={document}
          selectedKey={scale.id}
          onSelectionChange={setPreviewScaleId}
          isReadOnly={false}
        />
        <Picker
          label="Contrast"
          selectedKey={contrast.id}
          onSelectionChange={(key) => setActiveContrastId(String(key))}
        >
          {contrasts.map((item, index) => (
            <PickerItem key={item.id} id={item.id}>
              {contrastStepIndex(index, scale, rules)} ({item.value}:1)
            </PickerItem>
          ))}
        </Picker>
        <Slider
          label="Nesting depth"
          value={nestDepth}
          minValue={1}
          maxValue={4}
          step={1}
          onChange={(value) =>
            setNestDepth(Array.isArray(value) ? value[0] : value)
          }
        />
        <Checkbox isSelected={showMeta} onChange={setShowMeta}>
          Method detail
        </Checkbox>
      </div>
      <div className={treeStyles}>
        {nestingSurfaces.length === 0 ? (
          <Text>No nesting surfaces are configured.</Text>
        ) : (
          nestingSurfaces.map((surface) =>
            renderContext(
              surface,
              linearToHex(resolvedBackgroundLinear(document)),
              nestDepth,
            ),
          )
        )}
      </div>
    </div>
  );
}
