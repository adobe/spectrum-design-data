// Copyright 2026 Adobe. All rights reserved.
import { useLayoutEffect, useState } from "react";

export const chartGutters = { left: 56, right: 20, top: 16, bottom: 36 };

// Keep text and markers in CSS pixels when the chart's container changes size.
export function useChartViewport(initialWidth = 720) {
  const [element, setElement] = useState<Element | null>(null);
  const [width, setWidth] = useState(initialWidth);
  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => {
      const next = element.getBoundingClientRect().width;
      if (next > 0) setWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { width, ref: setElement };
}
