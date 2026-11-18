// Copyright 2026 Adobe. All rights reserved.
import { previewLabelStyles } from "../previewLabelStyles";
import "./SpacingElements.css";

export interface SpacingBarProps {
  /** Token step shown as the index caption, e.g. 100. */
  step: number;
  value: number;
}

/** One scale column: a bar exactly `value` px tall, with its index above its px value underneath. */
export function SpacingBar({ step, value }: SpacingBarProps) {
  return (
    <div className="spacingElement" role="listitem" data-spacing-step={step}>
      <div
        className="spacingElementBar"
        data-testid="spacing-bar"
        style={{ height: `${Math.max(0, value)}px` }}
      />
      <p className={`${previewLabelStyles} spacingElementCaption`}>
        <span className="spacingElementMeta">{step}</span>
        <br />
        <span className="spacingElementValue">{value}px</span>
      </p>
    </div>
  );
}
