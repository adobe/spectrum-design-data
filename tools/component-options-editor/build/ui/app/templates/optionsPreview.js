/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@spectrum-web-components/table/elements.js";
/**
 * Options Preview component that displays component options in the
 * Spectrum website documentation table format.
 */
let OptionsPreview = class OptionsPreview extends LitElement {
  constructor() {
    super(...arguments);
    this.componentOptions = [];
  }
  /**
   * Format the value column based on option type.
   * Matches the S2 website format.
   */
  formatValue(option) {
    switch (option.type) {
      case "string":
        return "string";
      case "boolean":
        return "boolean";
      case "localEnum":
      case "systemEnum":
      case "size":
      case "state":
        if (option.items && option.items.length > 0) {
          return option.items.join(" / ");
        }
        return "–";
      case "icon":
        return "–";
      case "color":
        return "–";
      default:
        return "–";
    }
  }
  /**
   * Format the default value column.
   * Returns em dash (–) if no default is set.
   */
  formatDefault(option) {
    if (
      !Object.hasOwn(option, "defaultValue") ||
      option.defaultValue === undefined ||
      option.defaultValue === null ||
      option.defaultValue === ""
    ) {
      return "–";
    }
    // For booleans, show true/false
    if (option.type === "boolean") {
      return option.defaultValue ? "true" : "false";
    }
    return String(option.defaultValue);
  }
  /**
   * Render a single option row in the preview table.
   */
  renderOptionRow(option) {
    return html`
      <sp-table-row>
        <sp-table-cell>${option.title}</sp-table-cell>
        <sp-table-cell>${this.formatValue(option)}</sp-table-cell>
        <sp-table-cell>${this.formatDefault(option)}</sp-table-cell>
        <sp-table-cell>${option.description || ""}</sp-table-cell>
      </sp-table-row>
    `;
  }
  render() {
    if (this.componentOptions.length === 0) {
      return html`
        <p class="intro-text">
          These options are used in Spectrum's design data JSON. There may be
          additional or slightly different options that are available for this
          component in Figma and in Spectrum implementations. This is being
          continuously updated.
        </p>
        <div class="empty-state">
          No component options defined yet. Add options in the Component Options
          tab.
        </div>
      `;
    }
    return html`
      <p class="intro-text">
        These options are used in Spectrum's design data JSON. There may be
        additional or slightly different options that are available for this
        component in Figma and in Spectrum implementations. This is being
        continuously updated.
      </p>
      <sp-table class="preview-table" quiet>
        <sp-table-head>
          <sp-table-head-cell>Property</sp-table-head-cell>
          <sp-table-head-cell>Value</sp-table-head-cell>
          <sp-table-head-cell>Default value</sp-table-head-cell>
          <sp-table-head-cell>Description</sp-table-head-cell>
        </sp-table-head>
        <sp-table-body>
          ${this.componentOptions.map((option) => this.renderOptionRow(option))}
        </sp-table-body>
      </sp-table>
    `;
  }
};
OptionsPreview.styles = css`
  :host {
    display: block;
    width: 100%;
  }
  .intro-text {
    color: var(--spectrum-global-color-gray-700);
    font-size: 14px;
    margin-bottom: 16px;
    line-height: 1.5;
  }
  .preview-table {
    width: 100%;
  }
  .empty-state {
    color: var(--spectrum-global-color-gray-600);
    font-style: italic;
    padding: 24px;
    text-align: center;
  }
`;
__decorate(
  [property({ type: Array })],
  OptionsPreview.prototype,
  "componentOptions",
  void 0,
);
OptionsPreview = __decorate([customElement("options-preview")], OptionsPreview);
export { OptionsPreview };
//# sourceMappingURL=optionsPreview.js.map
