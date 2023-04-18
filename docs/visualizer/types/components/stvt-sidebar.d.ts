import { LitElement } from "lit";
import "@spectrum-web-components/switch/sp-switch.js";
import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/button-group/sp-button-group.js";
import "@spectrum-web-components/link/sp-link.js";
import "@spectrum-web-components/overlay/overlay-trigger.js";
import "@spectrum-web-components/popover/sp-popover.js";
import "./stvt-filters-menu";
import "./stvt-search";
import "./stvt-tabs";
import { StringMatchDictionaryItem } from "../workers/string-match";
export declare class StvtSidebar extends LitElement {
  dictionary: StringMatchDictionaryItem[];
  filters: string[];
  listOfComponents: string[];
  selectedTokens: string[];
  selectedComponents: string[];
  spectrumColorTheme: string;
  static styles: import("lit").CSSResult;
  handleSwitchValueChange(): void;
  toggleAbout(): void;
  render(): import("lit-html").TemplateResult<1>;
}
