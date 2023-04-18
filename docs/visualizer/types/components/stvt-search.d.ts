import { LitElement } from "lit";
import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/button/sp-clear-button.js";
import "@spectrum-web-components/button/sp-close-button.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/search/sp-search.js";
import { GraphState } from "../models/graph-model";
import {
  StringMatchSearchResult,
  StringMatchDictionaryItem,
} from "../workers/string-match";
export declare class StvtSearch extends LitElement {
  graphState: GraphState;
  dictionary: StringMatchDictionaryItem[];
  searchResults: StringMatchSearchResult[];
  searchQuery: string;
  targetIndex: number;
  stringMatchWorker: Worker;
  static styles: import("lit").CSSResult;
  constructor();
  willUpdate(changedProperties: Map<string, unknown>): void;
  handleStringMatchWorkerResponse(event: any): void;
  handleChange(): void;
  selectItemAtIndex(index: number): void;
  handlePointerDown(index: number): void;
  setNewTargetIndex(index: number): void;
  handleKeydown(e: any): void;
  render(): import("lit-html").TemplateResult<1>;
}
