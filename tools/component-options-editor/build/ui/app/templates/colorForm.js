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
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/help-text/sp-help-text.js";
// Hex color validation pattern from Spectrum Design Data
const HEX_COLOR_PATTERN = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;
let ColorForm = class ColorForm extends LitElement {
  constructor() {
    super(...arguments);
    this.defaultValue = "";
    this.validationError = "";
  }
  handleColorInput(event) {
    const input = event.target;
    this.defaultValue = input.value;
    this.requestUpdate();
  }
  handleColorBlur(event) {
    const input = event.target;
    const value = input.value.trim();
    if (value === "") {
      this.validationError = "";
      this.defaultValue = "";
    } else if (!HEX_COLOR_PATTERN.test(value)) {
      this.validationError =
        "Please enter a valid hex color (e.g., #FF0000 or #F00)";
    } else {
      this.validationError = "";
      // Normalize the value to include # prefix
      this.defaultValue = value.startsWith("#") ? value : `#${value}`;
      input.value = this.defaultValue;
    }
    this.requestUpdate();
  }
  render() {
    const isValid = this.defaultValue && !this.validationError;
    return html`
      <sp-field-label for="color-input">Hex color value:</sp-field-label>
      <sp-textfield
        id="color-input"
        placeholder="#000000"
        .value=${this.defaultValue}
        @input=${this.handleColorInput}
        @blur=${this.handleColorBlur}
        ?invalid=${this.validationError !== ""}
      ></sp-textfield>
      ${this.validationError
        ? html`<sp-help-text variant="negative"
            >${this.validationError}</sp-help-text
          >`
        : html`<sp-help-text
            >Enter a 3 or 6 digit hex color (e.g., #FF0000 or
            #F00)</sp-help-text
          >`}
      ${isValid
        ? html`<div
            style="margin-top: 8px; display: flex; align-items: center; gap: 8px;"
          >
            <sp-field-label>Preview:</sp-field-label>
            <div
              style="width: 32px; height: 32px; border: 1px solid #ccc; border-radius: 4px; background-color: ${this
                .defaultValue};"
            ></div>
          </div>`
        : ""}
    `;
  }
};
__decorate(
  [property({ type: String })],
  ColorForm.prototype,
  "defaultValue",
  void 0,
);
__decorate(
  [property({ type: String })],
  ColorForm.prototype,
  "validationError",
  void 0,
);
ColorForm = __decorate([customElement("color-form")], ColorForm);
export default ColorForm;
//# sourceMappingURL=colorForm.js.map
