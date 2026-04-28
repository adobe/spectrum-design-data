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

import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/help-text/sp-help-text.js";

// Hex color validation pattern from Spectrum Design Data
const HEX_COLOR_PATTERN = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;

@customElement("color-form")
export default class ColorForm extends LitElement {
  @property({ type: String })
  public defaultValue = "";

  @property({ type: String })
  private validationError = "";

  handleColorInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.defaultValue = input.value;
    this.requestUpdate();
  }

  handleColorBlur(event: Event) {
    const input = event.target as HTMLInputElement;
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
}
