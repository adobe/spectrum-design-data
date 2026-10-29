// Copyright 2026 Adobe. All rights reserved.
import { SubPanel } from "../components/SubPanel";
import { SubPanelTabs } from "../components/SubPanelTabs";
import { SECTIONS_SUBPANEL_TABS_STATE_KEY } from "../state/view/subPanelTabs";
import { CategoryIcon } from "../components/CategoryIcon";
import { FoundationsColorPanel } from "../panels/foundations/FoundationsColorPanel";
import { FoundationsCornerRadiusPanel } from "../panels/foundations/FoundationsCornerRadiusPanel";
import { FoundationsElevationPanel } from "../panels/foundations/FoundationsElevationPanel";
import { FoundationsMotionPanel } from "../panels/foundations/FoundationsMotionPanel";
import { FoundationsSizePanel } from "../panels/foundations/FoundationsSizePanel";
import { FoundationsSpacingPanel } from "../panels/foundations/FoundationsSpacingPanel";
import { FoundationsTypographyPanel } from "../panels/foundations/FoundationsTypographyPanel";
import { Text } from "@react-spectrum/s2";
import { useAtomValue } from "jotai";
import { lazy, Suspense } from "react";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { ViewSwitcher } from "../views/ViewSwitcher";
import { subPanelTabSelectionAtom } from "../state/view/subPanelTabs";
import { SampleApp } from "../views/SampleApp";
import { TypographyElements } from "../views/typography/TypographyElements";
import { TypographyCssExport } from "../views/typography/TypographyCssExport";
import { SpacingElements } from "../views/spacing/SpacingElements";
import { SizeElements } from "../views/size/SizeElements";
import { SizeAnalyze } from "../views/size/SizeAnalyze";
import { SpacingAnalyze } from "../views/spacing/SpacingAnalyze";
import { TypographyAnalyze } from "../views/typography/TypographyAnalyze";
import { FoundationModeSettings } from "../panels/foundations/FoundationModeSettings";
import { RadiusElements } from "../views/radius/RadiusElements";
import { RadiusAnalyze } from "../views/radius/RadiusAnalyze";
import { ElevationElements } from "../views/elevation/ElevationElements";
import { ElevationAnalyze } from "../views/elevation/ElevationAnalyze";
import { ElevationCssExport } from "../views/elevation/ElevationCssExport";
import { colorPanelTabAtom } from "../state/view/dataVisView";
import { DataVisElements } from "../views/color-system/data-vis/DataVisElements";
import { DataVisAnalyze } from "../views/color-system/data-vis/DataVisAnalyze";
import { DataVisCode } from "../views/color-system/data-vis/DataVisCode";
import { CurrentColorOutputBoundary } from "../components/ColorOutputBoundary";

const ColorEvaluation = lazy(() =>
  import("../views/color-system/ColorEvaluation").then((module) => ({
    default: module.ColorEvaluation,
  })),
);
const ColorAnalyze = lazy(() =>
  import("../views/color-system/ColorAnalyze").then((module) => ({
    default: module.ColorAnalyze,
  })),
);
const CssExport = lazy(() =>
  import("../views/color-system/CssExport").then((module) => ({
    default: module.CssExport,
  })),
);

export default function Foundations() {
  const selectedTabs = useAtomValue(subPanelTabSelectionAtom);
  const selectedFoundationTab =
    selectedTabs[SECTIONS_SUBPANEL_TABS_STATE_KEY] ?? "colors";
  const dataVis = useAtomValue(colorPanelTabAtom) === "data-vis";
  const elements =
    selectedFoundationTab === "colors" ? (
      dataVis ? (
        <DataVisElements />
      ) : (
        <Suspense
          fallback={
            <LoadingIndicator size="L" aria-label="Loading color evaluation" />
          }
        >
          <ColorEvaluation />
        </Suspense>
      )
    ) : selectedFoundationTab === "typography" ? (
      <TypographyElements />
    ) : selectedFoundationTab === "spacing" ? (
      <SpacingElements />
    ) : selectedFoundationTab === "size" ? (
      <SizeElements />
    ) : selectedFoundationTab === "radius" ? (
      <RadiusElements />
    ) : selectedFoundationTab === "elevation" ? (
      <ElevationElements />
    ) : (
      <Text>Coming soon</Text>
    );
  const analyze =
    selectedFoundationTab === "colors" ? (
      dataVis ? (
        <DataVisAnalyze />
      ) : (
        <Suspense
          fallback={
            <LoadingIndicator size="L" aria-label="Loading color analysis" />
          }
        >
          <ColorAnalyze />
        </Suspense>
      )
    ) : selectedFoundationTab === "typography" ? (
      <TypographyAnalyze />
    ) : selectedFoundationTab === "spacing" ? (
      <SpacingAnalyze />
    ) : selectedFoundationTab === "size" ? (
      <SizeAnalyze />
    ) : selectedFoundationTab === "radius" ? (
      <RadiusAnalyze />
    ) : selectedFoundationTab === "elevation" ? (
      <ElevationAnalyze />
    ) : undefined;
  const code =
    selectedFoundationTab === "colors" ? (
      dataVis ? (
        <DataVisCode />
      ) : (
        <Suspense
          fallback={
            <LoadingIndicator size="L" aria-label="Loading code evaluation" />
          }
        >
          <CssExport />
        </Suspense>
      )
    ) : selectedFoundationTab === "typography" ? (
      <TypographyCssExport />
    ) : selectedFoundationTab === "elevation" ? (
      <ElevationCssExport />
    ) : (
      <Text>Coming soon</Text>
    );

  return (
    <div className="pageWithSubPanel" data-component="FoundationsLayout">
      <SubPanel>
        <SubPanelTabs
          aria-label="Foundation sections"
          stateKey={SECTIONS_SUBPANEL_TABS_STATE_KEY}
          tabs={[
            {
              id: "colors",
              label: "Colors",
              icon: <CategoryIcon category="color" />,
              content: (
                <>
                  <FoundationModeSettings foundation="color" />
                  <FoundationsColorPanel />
                </>
              ),
              noPadding: true,
            },
            {
              id: "opacity",
              label: "Opacity",
              icon: <CategoryIcon category="opacity" />,
              content: <Text>TBD</Text>,
            },
            {
              id: "typography",
              label: "Typography",
              icon: <CategoryIcon category="typography" />,
              content: <FoundationsTypographyPanel />,
              noPadding: true,
            },
            {
              id: "spacing",
              label: "Spacing",
              icon: <CategoryIcon category="spacing" />,
              content: (
                <>
                  <FoundationModeSettings foundation="spacing" />
                  <FoundationsSpacingPanel />
                </>
              ),
              noPadding: true,
            },
            {
              id: "size",
              label: "Size",
              icon: <CategoryIcon category="size" />,
              content: (
                <>
                  <FoundationModeSettings foundation="size" />
                  <FoundationsSizePanel />
                </>
              ),
              noPadding: true,
            },
            {
              id: "radius",
              label: "Corner radius",
              icon: <CategoryIcon category="radius" />,
              content: (
                <>
                  <FoundationModeSettings foundation="radius" />
                  <FoundationsCornerRadiusPanel />
                </>
              ),
              noPadding: true,
            },
            {
              id: "elevation",
              label: "Elevation",
              icon: <CategoryIcon category="elevation" />,
              content: (
                <>
                  <FoundationModeSettings foundation="elevation" />
                  <FoundationsElevationPanel />
                </>
              ),
              noPadding: true,
            },
            {
              id: "motion",
              label: "Motion",
              icon: <CategoryIcon category="motion" />,
              content: (
                <>
                  <FoundationModeSettings foundation="motion" />
                  <FoundationsMotionPanel />
                </>
              ),
              noPadding: true,
            },
          ]}
        />
      </SubPanel>
      <CurrentColorOutputBoundary>
        <ViewSwitcher
          aria-label="Foundation sections"
          dataComponent="Foundations"
          hasElementsSurface={
            selectedFoundationTab !== "motion" &&
            selectedFoundationTab !== "opacity"
          }
          elements={elements}
          preview={<SampleApp />}
          analyze={analyze}
          code={code}
        />
      </CurrentColorOutputBoundary>
    </div>
  );
}
