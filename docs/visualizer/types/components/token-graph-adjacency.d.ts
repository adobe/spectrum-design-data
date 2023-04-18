import { LitElement } from "lit";
export declare class TokenGraphAdjacency extends LitElement {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  role: string;
  isHighlighted: boolean;
  isFaded: boolean;
  label: string;
  fillLabel: string;
  top: number;
  left: number;
  width: number;
  height: number;
  Ax: number;
  Ay: number;
  Bx: number;
  By: number;
  angle: number;
  handleDistance: number;
  fillColor: string;
  labelColor: string;
  static styles: import("lit").CSSResult;
  willUpdate(changedProperties: Map<string, unknown>): void;
  render(): import("lit-html").TemplateResult<1>;
}
