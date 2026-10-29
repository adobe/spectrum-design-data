// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom } from "jotai";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  SUB_PANEL_DEFAULT_WIDTH,
  SUB_PANEL_MIN_WIDTH,
  subPanelWidthAtom,
} from "../state/view/navigation";
import "./SubPanel.css";

const STEP = 16;
const LARGE_STEP = 64;

const subPanelStyles = style({
  borderWidth: 0,
  borderEndWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-100",
});

export function SubPanel({ children }: { children?: ReactNode }) {
  const [width, setWidth] = useAtom(subPanelWidthAtom);
  const [maxWidth, setMaxWidth] = useState(Number.POSITIVE_INFINITY);
  const [isDragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const dragStart = useRef({ x: 0, width: 0 });
  const panelId = useId();

  useEffect(() => {
    const container = panelRef.current?.parentElement;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setMaxWidth(
        Math.max(
          SUB_PANEL_MIN_WIDTH,
          entry.contentRect.width - SUB_PANEL_MIN_WIDTH,
        ),
      );
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const clamp = (value: number) =>
    Math.round(Math.min(maxWidth, Math.max(SUB_PANEL_MIN_WIDTH, value)));
  const renderedWidth = clamp(width);
  // Moving toward the inline end grows the panel in both LTR and RTL.
  const inlineDirection = () =>
    panelRef.current && getComputedStyle(panelRef.current).direction === "rtl"
      ? -1
      : 1;

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, width: renderedWidth };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setWidth(
      clamp(
        dragStart.current.width +
          inlineDirection() * (event.clientX - dragStart.current.x),
      ),
    );
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = (event.shiftKey ? LARGE_STEP : STEP) * inlineDirection();
    let next: number | undefined;
    if (event.key === "ArrowRight") next = renderedWidth + step;
    else if (event.key === "ArrowLeft") next = renderedWidth - step;
    else if (event.key === "Home") next = SUB_PANEL_MIN_WIDTH;
    else if (event.key === "End" && Number.isFinite(maxWidth)) next = maxWidth;
    if (next === undefined) return;
    event.preventDefault();
    setWidth(clamp(next));
  }

  return (
    <>
      <aside
        ref={panelRef}
        id={panelId}
        data-component="SubPanel"
        className={`subPanel ${subPanelStyles}`}
        style={{ "--sub-panel-width": `${renderedWidth}px` } as CSSProperties}
      >
        {children}
      </aside>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- focusable separator is the WAI-ARIA window splitter pattern */}
      <div
        role="separator"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
        tabIndex={0}
        aria-orientation="vertical"
        aria-controls={panelId}
        aria-label="Resize panel"
        aria-valuemin={SUB_PANEL_MIN_WIDTH}
        aria-valuemax={Number.isFinite(maxWidth) ? maxWidth : undefined}
        aria-valuenow={renderedWidth}
        aria-valuetext={`${renderedWidth} pixels`}
        className="subPanelResizer"
        data-dragging={isDragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={() => setWidth(SUB_PANEL_DEFAULT_WIDTH)}
      />
    </>
  );
}
