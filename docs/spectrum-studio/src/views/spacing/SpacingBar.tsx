// Copyright 2026 Adobe. All rights reserved.
import "./SpacingElements.css";

export interface SpacingBarProps {
  /** Token step shown in the index column, e.g. 100. */
  step: number;
  value: number;
}

/** One ramp row: index, px value, then a bar exactly `value` px long. */
export function SpacingBar({ step, value }: SpacingBarProps) {
  return (
    <div className="spacingElement" role="listitem" data-spacing-step={step}>
      <div className="spacingElementMeta">{step}</div>
      <div className="spacingElementValue">{value}px</div>
      <div className="spacingElementSample">
        <div
          className="spacingElementBar"
          data-testid="spacing-bar"
          style={{ width: `${Math.max(0, value)}px` }}
        />
      </div>
    </div>
  );
}
