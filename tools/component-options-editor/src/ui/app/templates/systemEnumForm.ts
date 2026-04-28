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

import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@spectrum-web-components/picker/sync/sp-picker.js";
import "@spectrum-web-components/menu/sp-menu-item.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@spectrum-web-components/icon";
import { DeleteIcon } from "@spectrum-web-components/icons-workflow";
import { Picker } from "@spectrum-web-components/bundle";

@customElement("system-enum-form")
export default class SystemEnumForm extends LitElement {
  static styles = css`
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

  @property({ type: Array })
  public systemOptions: Array<SystemOptionInterface> = [];

  @property({ type: String })
  public selectedSystemOptionId = "";

  @property({ type: Array })
  public values: Array<string> = [];

  @property({ type: String })
  public defaultValue = "";

  private handleSystemOptionChange(event: Event) {
    const picker = event.target as unknown as Picker;
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

  private handleDefaultValueChange(event: Event) {
    const picker = event.target as unknown as Picker;
    this.defaultValue = picker.value;
    this.requestUpdate();
  }

  private removeDefaultHandler() {
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
}
