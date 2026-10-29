// Copyright 2026 Adobe. All rights reserved.
import {
  SegmentedControl,
  SegmentedControlItem,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "../components/CategoryIcon";
import { useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";
import {
  viewSwitcherSelectionAtom,
  type ViewSwitcherView,
} from "../state/view/viewSwitcher";
import { PreviewToolbar } from "../components/PreviewToolbar";
import { elementsSurfaceStyleAtom } from "../state/view/elementsSurface";
import { elementsSurfaceStyles } from "./elementsSurfaceStyles";
import "./chartLayout.css";

export type { ViewSwitcherView };

const containerStyles = style({
  display: "flex",
  flexGrow: 1,
  flexDirection: "column",
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
});

const controlBarStyles = style({
  display: "flex",
  justifyContent: "start",
  height: "fit",
  paddingX: 16,
  paddingY: 12,
});

const viewPanelStyles = style({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
});

const fallbackElementsStyles = style({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minHeight: 0,
  margin: 16,
  overflow: "auto",
});
const pasteboardStyles = style({ backgroundColor: "pasteboard" });

const views = [
  {
    id: "elements",
    label: "Elements",
    icon: <CategoryIcon category="view.elements" />,
  },
  {
    id: "preview",
    label: "Preview",
    icon: <CategoryIcon category="view.preview" />,
  },
  {
    id: "analyze",
    label: "Analyze",
    icon: <CategoryIcon category="view.analyze" />,
  },
  { id: "code", label: "Code", icon: <CategoryIcon category="view.code" /> },
] as const;

interface ViewSwitcherProps {
  elements: ReactNode;
  preview: ReactNode;
  /** Shown for Analyze; falls back to Elements when a page has nothing to analyze. */
  analyze?: ReactNode;
  code: ReactNode;
  "aria-label"?: string;
  defaultView?: ViewSwitcherView;
  dataComponent?: string;
  /** Foundation views supply their own surface so controls stay outside the preview. */
  hasElementsSurface?: boolean;
}

export interface PageViewConfiguration<View extends string> {
  options: readonly {
    id: View;
    label: string;
    icon: ReactNode;
    content: ReactNode;
  }[];
  selectedKey: View;
  onSelectionChange: (key: View) => void;
  surface?: "pasteboard";
}
interface ConfiguredViewSwitcherProps<View extends string> {
  configuration: PageViewConfiguration<View>;
  "aria-label"?: string;
  dataComponent?: string;
}

export function ViewSwitcher<View extends string = ViewSwitcherView>(
  props: ViewSwitcherProps | ConfiguredViewSwitcherProps<View>,
) {
  const {
    "aria-label": ariaLabel = "Content views",
    dataComponent = "ViewSwitcher",
  } = props;
  const surfaceStyle = useAtomValue(elementsSurfaceStyleAtom);
  const [sharedView, setSelectedView] = useAtom(viewSwitcherSelectionAtom);
  const configuration =
    "configuration" in props ? props.configuration : undefined;
  const selectedView =
    configuration?.selectedKey ??
    sharedView ??
    ("defaultView" in props ? props.defaultView : undefined) ??
    "elements";
  const options = configuration?.options ?? views;
  const content = configuration
    ? configuration.options.find((view) => view.id === selectedView)?.content
    : "elements" in props
      ? selectedView === "preview"
        ? props.preview
        : selectedView === "code"
          ? props.code
          : selectedView === "analyze" && props.analyze !== undefined
            ? props.analyze
            : props.elements
      : null;
  const hasElementsSurface =
    "hasElementsSurface" in props && props.hasElementsSurface;

  return (
    <section
      data-component={dataComponent}
      className={`pageMainContent chartViewContainer ${containerStyles}`}
    >
      <div className={controlBarStyles}>
        <SegmentedControl
          aria-label={ariaLabel}
          selectedKey={selectedView}
          onSelectionChange={(key) => {
            if (configuration) {
              const view = configuration.options.find(
                (option) => option.id === key,
              );
              if (view) configuration.onSelectionChange(view.id);
              else ToastQueue.negative("This content view is unavailable.");
            } else if (
              key === "elements" ||
              key === "preview" ||
              key === "analyze" ||
              key === "code"
            )
              setSelectedView(key);
            else ToastQueue.negative("This content view is unavailable.");
          }}
        >
          {options.map((view) => (
            <SegmentedControlItem key={view.id} id={view.id}>
              {view.icon}
              <Text>{view.label}</Text>
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <div
        className={`${viewPanelStyles} ${configuration?.surface === "pasteboard" ? pasteboardStyles : ""}`}
        data-view={selectedView}
      >
        {selectedView === "preview" ? (
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <PreviewToolbar />
            <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
              {content}
            </div>
          </div>
        ) : !configuration &&
          selectedView === "elements" &&
          !hasElementsSurface ? (
          <div
            className={`${fallbackElementsStyles} ${elementsSurfaceStyles}`}
            style={surfaceStyle}
            data-elements-surface
          >
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </section>
  );
}
