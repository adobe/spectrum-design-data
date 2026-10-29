// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  ActionButtonGroup,
  Card,
  CardPreview,
  CardView,
  Content,
  Heading,
  Provider,
  SearchField,
  Slider,
  Text,
} from "@react-spectrum/s2";
import AppsAll from "@react-spectrum/s2/icons/AppsAll";
import HelpCircle from "@react-spectrum/s2/icons/HelpCircle";
import Search from "@react-spectrum/s2/icons/Search";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useState, type CSSProperties } from "react";
import { linearToHex } from "../features/color-system/colorMath";
import { surfaceCss } from "../features/color-system/surfaceGeneration";
import { resolvedColorSystemDocumentAtom } from "../features/color-system/state";
import { resolveScaleColorAtLightness } from "../features/color-system/scaleGeneration";
import "./SampleApp.css";
import { previewColorSchemeAtom } from "../features/modes/capabilities";
import { modeSetsAtom } from "../features/modes/state";
import { COLOR_SCHEME_MODE_SET_KEY } from "../features/modes/model";
import { resetModeAtom } from "../features/modes/preview";

type SampleScheme = "light" | "dark";

const shellStyle = style({
  containerType: "inline-size",
  minHeight: 560,
  height: "full",
  position: "relative",
});

const appStyle = style({
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  height: "full",
  minHeight: 560,
});

const sidebarStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: 20,
  borderEndWidth: 1,
  borderEndStyle: "solid",
  borderEndColor: "gray-200",
  backgroundColor: "layer-1",
});

const contentStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
  minWidth: 0,
  padding: 24,
  backgroundColor: "base",
});

const toolbarStyle = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
});

const toolbarActionsStyle = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const detailStyle = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 280px",
  gap: 24,
  height: "full",
});

const detailPreviewStyle = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 420,
  padding: 32,
  borderRadius: "lg",
  backgroundColor: "gray-100",
});

const inspectorStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 20,
  borderRadius: "lg",
  backgroundColor: "layer-1",
});

const artwork = [
  { title: "Coastal forms", meta: "Collection / 12 items", color: "#5f8d96" },
  { title: "Quiet geometry", meta: "Collection / 8 items", color: "#b28670" },
  { title: "Late afternoon", meta: "Collection / 16 items", color: "#c86552" },
  { title: "Field notes", meta: "Collection / 10 items", color: "#78936b" },
  { title: "Soft machinery", meta: "Collection / 14 items", color: "#78829d" },
  { title: "Night studies", meta: "Collection / 9 items", color: "#514d84" },
];

function getTheme(document: Parameters<typeof surfaceCss>[1]) {
  const baseSurface = document.surfaces.find((surface) => surface.base) ?? document.surfaces[0];
  const accentScale = document.scales[0];
  const accent = accentScale
    ? linearToHex(resolveScaleColorAtLightness(accentScale, 0.48, document.settings.colorOutput).linear)
    : "#4f46e5";

  return {
    canvas: surfaceCss(baseSurface, document),
    accent,
  };
}

function SampleAppContent({ onSchemeChange, scheme, canChangeScheme }: { onSchemeChange: () => void; scheme: SampleScheme | null; canChangeScheme: boolean }) {
  const document = useAtomValue(resolvedColorSystemDocumentAtom);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const theme = getTheme(document);
  const selected = selectedIndex === null ? null : artwork[selectedIndex];
  const sampleStyle = {
    "--sample-canvas": theme.canvas,
    "--sample-accent": theme.accent,
    "--sample-brightness": `${brightness}%`,
    "--sample-contrast": `${contrast}%`,
    "--sample-saturation": `${saturation}%`,
  } as CSSProperties;

  return (
    <div className="sampleAppWrapper">
      <div className="sampleApp" data-scheme={scheme ?? undefined} style={sampleStyle} role="region" aria-label="Sample application preview">
        <div className={appStyle} data-sample-part="app">
          <aside className={sidebarStyle} data-sample-part="sidebar">
            <div className="sampleAppBrand"><span className="sampleAppBrandMark" aria-hidden="true" /><Text>Canvas</Text></div>
            <div className="sampleAppNav">
              <ActionButton isQuiet aria-current="page" aria-label="Browse"><Search /> <Text>Browse</Text></ActionButton>
              <ActionButton isQuiet aria-label="Collections"><AppsAll /> <Text>Collections</Text></ActionButton>
              <ActionButton isQuiet aria-label="Ideas"><HelpCircle /> <Text>Ideas</Text></ActionButton>
            </div>
            <div className="sampleAppSidebarFooter">
              <ActionButton isQuiet isDisabled={!canChangeScheme} onPress={onSchemeChange}>{scheme === "dark" ? "Light theme" : "Dark theme"}</ActionButton>
              <Text slot="description">Preview workspace</Text>
            </div>
          </aside>

          <main className={contentStyle} data-sample-part="content">
            {selected ? (
              <div className={detailStyle} data-sample-part="detail">
                <div className={detailPreviewStyle}>
                  <div className="sampleAppDetailArtwork" style={{ backgroundColor: selected.color }} role="img" aria-label={`${selected.title} preview`} />
                </div>
                <div className={inspectorStyle}>
                  <div className="sampleAppInspectorHeader"><Heading level={2}>{selected.title}</Heading><ActionButton isQuiet aria-label="Close preview" onPress={() => setSelectedIndex(null)}>×</ActionButton></div>
                  <Slider label="Brightness" value={brightness} minValue={60} maxValue={140} onChange={(value) => setBrightness(Array.isArray(value) ? value[0] : value)} />
                  <Slider label="Contrast" value={contrast} minValue={60} maxValue={140} onChange={(value) => setContrast(Array.isArray(value) ? value[0] : value)} />
                  <Slider label="Saturation" value={saturation} minValue={0} maxValue={160} onChange={(value) => setSaturation(Array.isArray(value) ? value[0] : value)} />
                  <Text slot="description">Layers · 3</Text>
                  <Text slot="description">Comments · 2</Text>
                  <Text slot="description">Assets · 12</Text>
                </div>
              </div>
            ) : (
              <>
                <div className={toolbarStyle}>
                  <div><Text slot="eyebrow">Your workspace</Text><Heading level={1}>Browse ideas</Heading></div>
                  <div className={toolbarActionsStyle}><SearchField aria-label="Search" /><ActionButtonGroup><ActionButton isQuiet aria-label="Help"><HelpCircle /></ActionButton><ActionButton isQuiet aria-label="Apps"><AppsAll /></ActionButton></ActionButtonGroup></div>
                </div>
                <CardView aria-label="Ideas" size="S" variant="quiet">
                  {artwork.map((item, index) => (
                    <Card key={item.title} size="S" textValue={item.title} onAction={() => setSelectedIndex(index)}>
                      <CardPreview><div className="sampleAppArtwork" style={{ backgroundColor: item.color }} /></CardPreview>
                      <Content><Text>{item.title}</Text><Text slot="description">{item.meta}</Text></Content>
                    </Card>
                  ))}
                </CardView>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export function SampleApp() {
  // Missing preview schemes must not inherit the authoring application's appearance.
  const scheme = useAtomValue(previewColorSchemeAtom) ?? "light";
  const modeSet = useAtomValue(modeSetsAtom).find((set) => set.key === COLOR_SCHEME_MODE_SET_KEY);
  const resetMode = useSetAtom(resetModeAtom);
  const target = modeSet?.modes.find((item) => item.key === (scheme === "dark" ? "light" : "dark"));
  const onSchemeChange = () => {
    if (target && modeSet) resetMode({ modeSetKey: modeSet.key, modeId: target.id });
  };
  const content = <SampleAppContent onSchemeChange={onSchemeChange} scheme={scheme} canChangeScheme={!!target} />;

  return <div className={shellStyle}><Provider colorScheme={scheme} UNSAFE_className={`spectrum spectrum--${scheme}`}>{content}</Provider></div>;
}
