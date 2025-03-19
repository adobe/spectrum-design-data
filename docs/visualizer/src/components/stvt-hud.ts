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
import { property } from "lit/decorators.js";

import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/slider/sp-slider.js";

import { Slider } from "@spectrum-web-components/slider";
import { dispatchCustomEvent } from "../utilities/index";

export class StvtHud extends LitElement {
  @property({ type: Boolean }) fullscreenMode = false;

  @property({ type: Number }) zoom = 1;

  static styles = css`
    :host {
      position: fixed;
      display: flex;
      bottom: 20px;
      right: 20px;
      z-index: 2;
      align-items: center;
      gap: 20px;
    }

    .slider-panel {
      position: relative;
      background: var(--spectrum-gray-100);
      box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 0px 16px;
      display: inline-block;
      opacity: 1;
      top: 0;
      transition:
        opacity 0.25s,
        top 0.25s;
    }

    .slider-panel.hidden {
      top: 25px;
      opacity: 0;
    }

    .button-panel {
      position: relative;
      background: var(--spectrum-gray-100);
      box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 0px;
      display: inline-block;
    }

    sp-slider {
      width: 150px;
    }

    sp-action-button i {
      position: relative;
      display: inline-block;
      width: 18px;
      height: 18px;
      /* -webkit-mask-size: 75%; */
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      /* mask-size: 75%; */
      mask-repeat: no-repeat;
      mask-position: center center;
    }

    sp-action-button i.enter-fullscreen {
      background-color: var(
        --system-spectrum-actionbutton-content-color-default
      );
      -webkit-mask-image: url("./Smock_FullScreen_18_N.svg");
      mask-image: url("./Smock_FullScreen_18_N.svg");
    }

    sp-action-button i.exit-fullscreen {
      background-color: var(
        --system-spectrum-actionbutton-selected-content-color-default
      );
      -webkit-mask-image: url("./Smock_FullScreenExit_18_N.svg");
      mask-image: url("./Smock_FullScreenExit_18_N.svg");
    }
  `;

  handleZoomSliderChange() {
    const sliderEl = this.shadowRoot?.getElementById("zoom-slider") as Slider;
    const newZoom = sliderEl.value;
    dispatchCustomEvent(this, "set-zoom-centered-on-canvas", {
      value: newZoom,
    });
  }

  handleFullscreenToggle() {
    dispatchCustomEvent(this, "set-fullscreen-mode", {
      value: !this.fullscreenMode,
    });
  }

  render() {
    return html`
      <div class="slider-panel ${this.fullscreenMode ? "hidden" : ""}">
        <sp-slider
          id="zoom-slider"
          @input=${this.handleZoomSliderChange}
          label-visibility="none"
          label="Zoom"
          min="0.1"
          max="2"
          step="0.05"
          value=${this.zoom.toFixed(2)}
        ></sp-slider>
      </div>
      <div class="button-panel">
        <sp-action-button
          @click=${this.handleFullscreenToggle}
          quiet
          ?emphasized=${this.fullscreenMode}
          ?selected=${this.fullscreenMode}
          ><i
            class=${this.fullscreenMode
              ? "exit-fullscreen"
              : "enter-fullscreen"}
            slot="icon"
          ></i
        ></sp-action-button>
      </div>
    `;
  }
}

customElements.define("stvt-hud", StvtHud);
