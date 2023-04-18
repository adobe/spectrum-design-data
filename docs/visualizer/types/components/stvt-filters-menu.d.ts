import { LitElement } from "lit";
import "@spectrum-web-components/field-group/sp-field-group.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/switch/sp-switch.js";
export declare class StvtFiltersMenu extends LitElement {
  filters: string[];
  static styles: import("lit").CSSResult;
  handleFilterChange(): void;
  listOfOptions(category: string): import("lit-html").TemplateResult<1>[];
  get listOfCategorizedOptionLists(): import("lit-html").TemplateResult<1>[];
  render(): import("lit-html").TemplateResult<1>;
}
