import { LitElement } from "lit";
declare class GraphGrid extends LitElement {
  scale: number;
  posx: number;
  posy: number;
  theme: string;
  size: number;
  static styles: import("lit").CSSResult;
  maximumRepeatingTileSize: number;
  cellFadeOutThresh: number;
  lineWidth: number;
  lineColorR: number;
  lineColorG: number;
  lineColorB: number;
  backgroundColor: string;
  willUpdate(changedProperties: Map<string, unknown>): void;
  render(): import("lit-html").TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    "graph-grid": GraphGrid;
  }
}
export {};
