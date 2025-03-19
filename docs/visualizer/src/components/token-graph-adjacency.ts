/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { LitElement, html, svg, css } from "lit";
import { property } from "lit/decorators.js";

// type cssColorLookup = {[key: string] : CSSResult };

const VERTICAL_PADDING = 10;

function bezierCurveMidpointAngle(
  startX: number,
  startY: number,
  startHandleX: number,
  startHandleY: number,
  endHandleX: number,
  endHandleY: number,
  endX: number,
  endY: number,
) {
  // Calculate the tangent at the midpoint of the Bezier curve
  const tangentX =
    (-3 * startX + 9 * startHandleX - 9 * endX + 3 * endHandleX) / 8;
  const tangentY =
    (-3 * startY + 9 * startHandleY - 9 * endY + 3 * endHandleY) / 8;
  // Calculate the angle of the tangent in radians ( adding PI to flip 180 )
  const rad = Math.atan2(tangentY, tangentX) + Math.PI;
  // Return the angle of the tangent in degrees
  return (rad * 180) / Math.PI;
}

function roundedValue(v: number) {
  return Math.round(v * 10) / 10;
}

export class TokenGraphAdjacency extends LitElement {
  @property({ type: Number }) fromX = 0;

  @property({ type: Number }) fromY = 0;

  @property({ type: Number }) toX = 0;

  @property({ type: Number }) toY = 0;

  @property({ type: String }) role = "descendentPath";

  @property({ type: Boolean }) isHighlighted = false;

  @property({ type: Boolean }) isFaded = false;

  @property({ type: String }) label = "";

  fillLabel = "";
  top = 0;
  left = 0;
  width = 0;
  height = 0;
  Ax = 0;
  Ay = 0;
  Bx = 0;
  By = 0;
  angle = 0;
  handleDistance = 0;
  fillColor = `#000000`;
  labelColor = `#FFFFFF`;

  static styles = css`
    svg {
      position: absolute;
    }
  `;

  willUpdate(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has("role") ||
      changedProperties.has("isFaded") ||
      changedProperties.has("isHighlighted")
    ) {
      // default green - should NOT see
      let hue = "celery";
      let lineValue = 300;
      let textValue = 900;

      switch (this.role) {
        case "selectionConnection":
          hue = "orange";
          lineValue = 300;
          textValue = 1100;
          break;
        case "ancestorPath":
          hue = "purple";
          break;
        case "descendentPath":
          hue = "fuchsia";
          break;
      }

      if (this.isFaded) {
        lineValue -= 200;
        textValue -= 200;
      }

      if (this.isHighlighted) {
        lineValue += 200;
        textValue += 200;
      }

      this.fillColor = `--spectrum-${hue}-${lineValue}`;
      this.labelColor = `--spectrum-${hue}-${textValue}`;
    }

    const originX = Math.min(this.fromX, this.toX);
    const originY = Math.min(this.fromY, this.toY);
    this.fillLabel = new Array(this.label.length + 2).join("█");

    // TUNE TO PREFERENCE
    // handle distance is the line length ( start to end in cartesian space ) divided by 3
    const pointsDistance = Math.sqrt(
      Math.pow(this.fromX - this.toX, 2) + Math.pow(this.fromY - this.toY, 2),
    );
    // this.handleDistance = Math.min(1000,pointsDistance / 4);
    this.handleDistance = pointsDistance / 3;
    // this.handleDistance = Math.min(100, 30000 / pointsDistance);
    this.angle = bezierCurveMidpointAngle(
      this.fromX,
      this.fromY,
      this.fromX + this.handleDistance,
      this.fromY,
      this.toX - this.handleDistance,
      this.toY,
      this.toX,
      this.toY,
    );

    const HORIZONTAL_PADDING = Math.max(
      0,
      this.handleDistance - (this.toX - this.fromX),
    );

    this.Ax = roundedValue(this.fromX - originX + HORIZONTAL_PADDING / 2);
    this.Ay = roundedValue(this.fromY - originY + VERTICAL_PADDING / 2);
    this.Bx = roundedValue(this.toX - originX + HORIZONTAL_PADDING / 2);
    this.By = roundedValue(this.toY - originY + VERTICAL_PADDING / 2);
    this.top = roundedValue(originY - VERTICAL_PADDING / 2);
    this.left = roundedValue(originX - HORIZONTAL_PADDING / 2);
    this.width = Math.ceil(
      Math.abs(this.fromX - this.toX) + HORIZONTAL_PADDING,
    );
    this.height = Math.ceil(Math.abs(this.fromY - this.toY) + VERTICAL_PADDING);
  }

  render() {
    return html`
      <svg
        style="top:${this.top}px;left:${this.left}px;"
        width=${this.width}
        height=${this.height}
      >
        <path
          d="M ${this.Ax},${this.Ay} C ${this.Ax + this.handleDistance},${this
            .Ay} ${this.Bx - this.handleDistance},${this.By} ${this.Bx},${this
            .By}"
          stroke="var(${this.fillColor})"
          stroke-width="2"
          fill="none"
        />
        ${this.label
          ? svg`<g transform="rotate(${this.angle},${this.width / 2},${
              this.height / 2
            })">
            <text font-family="Courier New, monospace" x="50%" y="50%" fill="var(${
              this.fillColor
            })" text-anchor="middle" font-size="smaller" dominant-baseline="middle">◀${
              this.fillLabel
            }▶</text>
            <text font-family="Courier New, monospace" x="50%" y="50%" fill="var(${
              this.labelColor
            })" text-anchor="middle" font-size="smaller" dominant-baseline="middle">${
              this.label
            }</text>
            </g>
          `
          : svg``}
      </svg>
    `;
  }
}

customElements.define("token-graph-adjacency", TokenGraphAdjacency);
