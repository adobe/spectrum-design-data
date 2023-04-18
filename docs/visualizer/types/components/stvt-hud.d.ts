import { LitElement } from "lit";
import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/slider/sp-slider.js";
export declare class StvtHud extends LitElement {
  fullscreenMode: boolean;
  zoom: number;
  static styles: import("lit").CSSResult;
  handleZoomSliderChange(): void;
  handleFullscreenToggle(): void;
  render(): import("lit-html").TemplateResult<1>;
}
