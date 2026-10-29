// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import type { CSSProperties, ReactNode } from "react";
import { memo } from "react";
import type { GeneratedTypographyToken } from "../../features/typography/model";
import {
  formatTypographyLength,
  formatTypographyNumber,
  type TypographyUnit,
} from "../../features/typography/units";
import type { TypographyDisplayMode } from "./typographyPreview";
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
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `44px 70px 100px minmax(240px, 1fr) 90px ${iconTrack}px`,
    minWidth: 704 + iconTrack,
    fontSize: 14,
  };
  const hidden = (mode: TypographyDisplayMode) => !displayModes.includes(mode);
  return (
    <>
      <div
        className="typographyElement typographyElementHeader"
        style={gridStyle}
      >
        <div className="typographyElementMeta">Index</div>
        <div
          className="typographyElementValue"
          data-metric="font-size"
          aria-hidden={hidden("font-size")}
        >
          Font size
        </div>
        <div
          className="typographyElementValue"
          data-metric="line-height"
          aria-hidden={hidden("line-height")}
        >
          Line height
        </div>
        <div className="typographyElementSample">
          <Text>Sample text</Text>
        </div>
        <div
          className="typographyElementValue"
          data-metric="icon-size"
          aria-hidden={hidden("icon-size")}
        >
          Icon size
        </div>
        <div className="typographyElementIconHeading">Sample icon</div>
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
              <Text>{token.scale}</Text>
            </div>
            <div
              className="typographyElementValue"
              data-metric="font-size"
              aria-hidden={hidden("font-size")}
            >
              <Text slot="description">
                {formatTypographyLength(token.fontSize, outputUnit)}
              </Text>
            </div>
            <div
              className="typographyElementValue"
              data-metric="line-height"
              aria-hidden={hidden("line-height")}
            >
              <Text slot="description">
                {formatTypographyLength(height.length, outputUnit)}{" "}
                <span className="typographyElementValueDetail">
                  ({formatTypographyNumber(height.multiplier)})
                </span>
              </Text>
            </div>
            <div
              className="typographyElementSample"
              style={{
                fontSize: `${token.fontSize}px`,
                lineHeight: height.multiplier,
              }}
            >
              {sampleText}
            </div>
            <div
              className="typographyElementValue"
              data-metric="icon-size"
              aria-hidden={hidden("icon-size")}
            >
              <Text slot="description">
                {formatTypographyLength(token.iconSize, outputUnit)}
              </Text>
            </div>
            <div className="typographyElementIcon" aria-hidden="true">
              {renderIcon(token.iconSize)}
            </div>
          </div>
        );
      })}
    </>
  );
});
