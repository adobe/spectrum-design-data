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
import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@spectrum-web-components/picker/sync/sp-picker.js";
import "@spectrum-web-components/menu/sp-menu-item.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@spectrum-web-components/icon";
import { DeleteIcon } from "@spectrum-web-components/icons-workflow";
let SystemEnumForm = class SystemEnumForm extends LitElement {
  constructor() {
    super(...arguments);
    this.systemOptions = [];
    this.selectedSystemOptionId = "";
    this.values = [];
    this.defaultValue = "";
  }
  handleSystemOptionChange(event) {
    const picker = event.target;
    this.selectedSystemOptionId = picker.value;
    // Find the selected system option and populate values
    const selectedOption = this.systemOptions.find(
      (opt) => opt.id === this.selectedSystemOptionId,
    );
    if (selectedOption) {
      this.values = [...selectedOption.items];
      // Reset default value if it's not in the new values
      if (!this.values.includes(this.defaultValue)) {
        this.defaultValue = this.values.length > 0 ? this.values[0] : "";
      }
    }
    this.requestUpdate();
  }
  handleDefaultValueChange(event) {
    const picker = event.target;
    this.defaultValue = picker.value;
    this.requestUpdate();
  }
  removeDefaultHandler() {
    this.defaultValue = "";
    this.requestUpdate();
  }
  render() {
    const selectedOption = this.systemOptions.find(
      (opt) => opt.id === this.selectedSystemOptionId,
    );
    return html`
      <sp-field-label for="system-option-picker"
        >Select a global option list:</sp-field-label
      >
      <sp-picker
        id="system-option-picker"
        .value=${this.selectedSystemOptionId}
        @change=${this.handleSystemOptionChange}
        placeholder="Choose a system option..."
      >
        ${this.systemOptions.map(
          (option) => html`
            <sp-menu-item
              value=${option.id}
              ?selected=${this.selectedSystemOptionId === option.id}
            >
              ${option.title}
            </sp-menu-item>
          `,
        )}
      </sp-picker>

      ${selectedOption
        ? html`
            <div class="selected-items">
              <div class="selected-items-label">
                Available values from "${selectedOption.title}":
              </div>
              <div class="selected-items-values">${this.values.join(", ")}</div>
            </div>

            <sp-field-label for="default-value" style="margin-top: 12px;"
              >Default value:</sp-field-label
            >
            <sp-picker
              id="default-value"
              .value=${this.defaultValue}
              @change=${this.handleDefaultValueChange}
            >
              ${this.values.map(
                (value) => html`
                  <sp-menu-item
                    value=${value}
                    ?selected=${this.defaultValue === value}
                  >
                    ${value}
                  </sp-menu-item>
                `,
              )}
            </sp-picker>
            <sp-action-button
              @click=${this.removeDefaultHandler}
              ?disabled=${this.defaultValue === ""}
            >
              <sp-icon slot="icon"
                >${DeleteIcon({ width: 16, height: 16 })}</sp-icon
              >
              Remove Default
            </sp-action-button>
          `
        : nothing}
    `;
  }
};
SystemEnumForm.styles = css`
  :host {
    display: block;
  }
  .selected-items {
    margin-top: 8px;
    padding: 8px;
    background: var(--spectrum-global-color-gray-100);
    border-radius: 4px;
  }
  .selected-items-label {
    font-size: 12px;
    color: var(--spectrum-global-color-gray-600);
    margin-bottom: 4px;
  }
  .selected-items-values {
    font-size: 14px;
  }
`;
__decorate(
  [property({ type: Array })],
  SystemEnumForm.prototype,
  "systemOptions",
  void 0,
);
__decorate(
  [property({ type: String })],
  SystemEnumForm.prototype,
  "selectedSystemOptionId",
  void 0,
);
__decorate(
  [property({ type: Array })],
  SystemEnumForm.prototype,
  "values",
  void 0,
);
__decorate(
  [property({ type: String })],
  SystemEnumForm.prototype,
  "defaultValue",
  void 0,
);
SystemEnumForm = __decorate(
  [customElement("system-enum-form")],
  SystemEnumForm,
);
export default SystemEnumForm;
//# sourceMappingURL=systemEnumForm.js.map
