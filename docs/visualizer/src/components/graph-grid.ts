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

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

function nearestPowerOf2(n: number) {
  return 1 << (31 - Math.clz32(n));
}

@customElement("graph-grid")
class GraphGrid extends LitElement {
  // zoom in and out of the grid by changing the scale property
  @property({ type: Number })
  scale = 1;

  // pan grid along x axis
  @property({ type: Number })
  posx = 0;

  // pan grid along y axis
  @property({ type: Number })
  posy = 0;

  // use dark mode colors
  @property({ type: String })
  theme = "paper";

  @property({ type: Number })
  size = 7;

  static styles = css`
    :host,
    div {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `;

  // if the repeating tile is larger than this than
  // firefox gets really funny about rendering pixel-perfect
  // linear gradient lines...
  maximumRepeatingTileSize = 200;

  cellFadeOutThresh = 50;

  lineWidth = 1;

  lineColorR = 0;

  lineColorG = 0;

  lineColorB = 0;

  backgroundColor = "#000";

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("theme")) {
      switch (this.theme) {
        case "darkest":
        case "dark":
          this.lineColorR = 40;
          this.lineColorG = 40;
          this.lineColorB = 40;
          this.backgroundColor = "#000000";
          break;
        case "light":
        case "wireframe":
          this.lineColorR = 230;
          this.lineColorG = 230;
          this.lineColorB = 230;
          this.backgroundColor = "#FFFFFF";
          break;
        case "paper":
        default:
          this.lineColorR = 167;
          this.lineColorG = 220;
          this.lineColorB = 240;
          this.backgroundColor = "#F5FFFA";
          break;
      }
    }
  }

  override render() {
    const {
      lineColorR,
      lineColorG,
      lineColorB,
      backgroundColor,
      cellFadeOutThresh,
      posx,
      posy,
      scale,
      size,
      maximumRepeatingTileSize,
      lineWidth,
    } = this;

    // define a fixed scale based on the user configured 'size' attribute
    const baseScale = maximumRepeatingTileSize / (size * 4);

    // what's the delta between the base scale and the current zoom level
    const scaleDiff = scale / baseScale;

    // exactly how big will each cell be rendered?
    // round to decimal point
    const cellSizePx = scaleDiff * maximumRepeatingTileSize;

    let actualMaxTileSize = maximumRepeatingTileSize;

    // is the visual cell size LARGER than the max tile size?
    // dynamically increase the max tilesize when WAAAAY zoomed in
    // The host app should probably avoid zooming in this far...
    // some browsers ( like firefox ) may not render this correctly
    //
    // keeping this in an IF case because it's an edge case
    // and could maybe just be removed or handled in another way
    if (cellSizePx > maximumRepeatingTileSize) {
      actualMaxTileSize = cellSizePx;
      // console.warn('graph is very zoomed in and may not render correctly in some browsers');
    }

    // how many cells per tile?
    // always render pow2 cell count into the tile, adjusting the tile size
    // so that our cells render at the correct size and distribution
    // above 16 cells, we just start shrinking the repeating tile size
    // letting the browser/gpu handle the rendering so that we don't
    // pow2 ourselves to infinity when zooming way out
    //
    // doubling/halfing cell counts is what enables us to cleanly
    // fade in/out new emphasis lines as we zoom in, which then become
    // the new tile-edge lines as the cell count halfs and the tile
    // size doubles
    const cellCount = Math.min(
      16,
      nearestPowerOf2(actualMaxTileSize / cellSizePx),
    );

    // how big is the repeating tile?
    const tileSize = cellSizePx * cellCount;

    // how close are we to the next cell-count-within-tile doubling? As a ratio of 0...1
    const remainderRatio = Math.max(
      0,
      2 *
        ((actualMaxTileSize - actualMaxTileSize + tileSize) /
          actualMaxTileSize) -
        0.5,
    );

    // ratio of 0...1 for only the top HALF of the remainderRatio
    // used for calculating centerline alpha to gracefully transition
    // between cell densities, fading in new emphasis lines as we zoom in
    const lastHalfRemainder = Math.max(0, remainderRatio * 2 - 1);
    // const lastThirdRemainder = Math.max(0,remainderRatio*3 - 2);

    const dynamicCenterLineAlpha = 0.5 + 0.5 * lastHalfRemainder;

    // draw fixed with lines with transparent fills between them
    const gradientStops = Array.from({ length: cellCount }, (_, i) => {
      const lineIn = i * cellSizePx;
      const lineOut = lineIn + lineWidth;
      const transparentIn = lineOut;
      const transparentOut = (i + 1) * cellSizePx;
      const lineAlpha =
        i === 0
          ? 1
          : // FIRST line ( primary grid outline )
            i % 8 === 0
            ? 1
            : // every EIGHTH line - to show density when way zoomed out
              i === cellCount / 2
              ? dynamicCenterLineAlpha
              : // CENTER line with dynamic fade in
                0.5; // de-emphasized lines within the grid interior
      const lineColor = `rgba(${lineColorR},${lineColorG},${lineColorB},${lineAlpha.toFixed(
        2,
      )})`;
      // rounding values to avoid high decimal strings
      return `${lineColor} ${lineIn.toFixed(1)}px,
              ${lineColor} ${lineOut.toFixed(1)}px,
              transparent ${transparentIn.toFixed(1)}px,
              transparent ${transparentOut.toFixed(1)}px`;
    }).join(", ");

    // when the cells get small, start making the entire grid more transparent
    // to maintain bg/foreground contrast and reduce crunchy render artifacting
    // - number between 0 and 1
    const fadeOutRatio = Math.sqrt(Math.min(1, cellSizePx / cellFadeOutThresh));

    const styles = {
      backgroundImage: `linear-gradient(to right, ${gradientStops}), linear-gradient(to bottom, ${gradientStops})`,
      backgroundSize: `${tileSize.toFixed(2)}px ${tileSize.toFixed(2)}px`,
      backgroundPosition: `${posx.toFixed(2)}px ${posy.toFixed(2)}px`,
      opacity: `${0.1 + 0.9 * fadeOutRatio}`, // floor opacity of 0.1, dynamic range for the other 90%
    };

    return html`
      <div style="background-color:${backgroundColor};"></div>
      <div style=${styleMap(styles)}></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "graph-grid": GraphGrid;
  }
}
