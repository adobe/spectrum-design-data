// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useLayoutEffect, useRef, useState } from "react";
import { modeSetsAtom } from "../features/modes/state";
import { displayedModeIdsAtom, resetModeAtom } from "../features/modes/preview";
import { AdaptiveControlsMenu } from "./AdaptiveControlsMenu";
import { ModeSetControl } from "./ModeSetControl";
import { ModesPicker } from "./ModesPicker";
import "./PreviewToolbar.css";

const toolbarStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: 12,
  borderRadius: "xl",
  backgroundColor: "layer-1",
  boxShadow: "elevated",
});

export function PreviewToolbar({
  placement = "overlay",
}: {
  placement?: "overlay" | "header";
}) {
  const sets = useAtomValue(modeSetsAtom);
  const displayed = useAtomValue(displayedModeIdsAtom);
  const reset = useSetAtom(resetModeAtom);
  const wrapper = useRef<HTMLDivElement>(null);
  const modes = useRef<HTMLDivElement>(null);
  const adaptive = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<"full" | "icon" | "combined">("full");
  useLayoutEffect(() => {
    const area = wrapper.current,
      modeMeasure = modes.current,
      adaptiveMeasure = adaptive.current;
    if (!area || !modeMeasure || !adaptiveMeasure) return;
    const measure = () => {
      const available = area.clientWidth - (placement === "overlay" ? 24 : 0);
      const modeWidth = modeMeasure.getBoundingClientRect().width;
      const adaptiveWidth = adaptiveMeasure.getBoundingClientRect().width;
      const iconWidth =
        adaptiveMeasure.querySelector("button")?.getBoundingClientRect()
          .height ?? 0;
      const gap = modeWidth && adaptiveWidth ? 16 : 0;
      setLayout(
        available >= modeWidth + adaptiveWidth + gap
          ? "full"
          : available >= modeWidth + iconWidth + gap
            ? "icon"
            : "combined",
      );
    };
    const observer = new ResizeObserver(measure);
    [area, modeMeasure, adaptiveMeasure].forEach((element) =>
      observer.observe(element),
    );
    measure();
    return () => observer.disconnect();
  }, [placement]);
  return (
    <div
      ref={wrapper}
      className={
        placement === "header" ? "previewToolbarHeader" : "previewToolbarAnchor"
      }
    >
      <div
        role="group"
        aria-label="Design-system preview controls"
        data-component="PreviewToolbar"
        data-layout={layout}
        className={`${placement === "overlay" ? toolbarStyles : "previewToolbarInline"} previewToolbar`}
      >
        {layout === "combined" && sets.some((set) => set.modes.length >= 2) ? (
          <ModesPicker
            modeSets={sets}
            displayedModeIds={displayed}
            onSelectionChange={reset}
          />
        ) : (
          sets.map((set) => <ModeSetControl key={set.id} modeSet={set} />)
        )}
        <AdaptiveControlsMenu isIconOnly={layout !== "full"} />
      </div>
      <div className="previewControlMeasure" aria-hidden inert>
        <div ref={modes} className="previewModeMeasure">
          {sets.map((set) => (
            <ModeSetControl key={set.id} modeSet={set} />
          ))}
        </div>
        <div ref={adaptive}>
          <AdaptiveControlsMenu />
        </div>
      </div>
    </div>
  );
}
