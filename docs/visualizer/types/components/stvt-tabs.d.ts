import { LitElement } from "lit";
import { StringMatchDictionaryItem } from "../workers/string-match";
import "@spectrum-web-components/action-button/sp-action-button.js";
export declare class StvtTabs extends LitElement {
  dictionary: StringMatchDictionaryItem[];
  selectedTokens: string[];
  selectedComponents: string[];
  tabItems: string[];
  graphNodeTypeLookup: {
    [nodeId: string]: string;
  };
  static styles: import("lit").CSSResult;
  willUpdate(changedProperties: Map<string, unknown>): void;
  handleWheelEvents(e: any): void;
  handleCloseTabClick(label: string): void;
  handleDeselectAll(): void;
  tabsItemHtml(itemId: string): import("lit-html").TemplateResult<1>;
  render(): import("lit-html").TemplateResult<1>;
}
