// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties, ReactNode } from "react";
import { memo } from "react";
import type { GeneratedTypographyToken } from "../../features/typography/model";
import {
  formatTypographyLength,
  formatTypographyNumber,
  type TypographyUnit,
} from "../../features/typography/units";
import { previewLabelStyles } from "../previewLabelStyles";
import {
  typographyRampColumns,
  type TypographyDisplayMode,
} from "./typographyPreview";
import "./TypographyElements.css";

export const TypographyRamp = memo(function TypographyRamp({
  tokens,
  lineHeightId,
  outputUnit,
  sampleText,
  displayModes,
  renderIcon,
}: {
  tokens: readonly GeneratedTypographyToken[];
  lineHeightId: string;
  outputUnit: TypographyUnit;
  sampleText: string;
  displayModes: readonly TypographyDisplayMode[];
  renderIcon: (size: number) => ReactNode;
}) {
  const iconTrack = Math.max(72, ...tokens.map((token) => token.iconSize));
  const gridStyle: CSSProperties = typographyRampColumns(
    displayModes,
    iconTrack,
  );
  const hidden = (mode: TypographyDisplayMode) => !displayModes.includes(mode);
  const showIcon = !hidden("sample-icon");
  return (
    <>
      <div
        className="typographyElement typographyElementHeader"
        style={gridStyle}
      >
        <div className="typographyElementMeta">
          <span className={previewLabelStyles}>Index</span>
        </div>
        <div
          className="typographyElementValue"
          data-metric="font-size"
          aria-hidden={hidden("font-size")}
        >
          <span className={previewLabelStyles}>Font size</span>
        </div>
        <div
          className="typographyElementValue"
          data-metric="line-height"
          aria-hidden={hidden("line-height")}
        >
          <span className={previewLabelStyles}>Line height</span>
        </div>
        {showIcon && (
          <div
            className="typographyElementIconHeading"
            data-metric="sample-icon"
          >
            <span className={previewLabelStyles}>Sample icon</span>
          </div>
        )}
        <div className="typographyElementSampleHeading">
          <span className={previewLabelStyles}>Sample text</span>
        </div>
      </div>
      {tokens.map((token) => {
        const height = token.lineHeights[lineHeightId];
        return (
          <div
            className="typographyElement"
            style={gridStyle}
            key={token.position}
            data-scale={token.scale}
          >
            <div className="typographyElementMeta">
              <span className={previewLabelStyles}>{token.scale}</span>
            </div>
            <div
              className="typographyElementValue"
              data-metric="font-size"
              aria-hidden={hidden("font-size")}
            >
              <span className={previewLabelStyles}>
                {formatTypographyLength(token.fontSize, outputUnit)}
              </span>
            </div>
            <div
              className="typographyElementValue"
              data-metric="line-height"
              aria-hidden={hidden("line-height")}
            >
              <span className={previewLabelStyles}>
                {formatTypographyLength(height.length, outputUnit)}{" "}
                <span className="typographyElementValueDetail">
                  ({formatTypographyNumber(height.multiplier)})
                </span>
              </span>
            </div>
            {showIcon && (
              <div className="typographyElementIcon" aria-hidden="true">
                {renderIcon(token.iconSize)}
              </div>
            )}
            <div
              className="typographyElementSample"
              style={{
                fontSize: `${token.fontSize}px`,
                lineHeight: height.multiplier,
              }}
            >
              {sampleText}
            </div>
          </div>
        );
      })}
    </>
  );
});
