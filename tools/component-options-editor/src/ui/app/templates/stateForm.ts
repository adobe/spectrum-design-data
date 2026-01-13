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

import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/picker/sp-picker.js";
import "@spectrum-web-components/menu/sp-menu-item.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@spectrum-web-components/table/elements.js";
import "@spectrum-web-components/action-group/sp-action-group.js";
import "@spectrum-web-components/icon";
import {
  AddCircleIcon,
  DeleteIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@spectrum-web-components/icons-workflow";
import { Picker, Textfield } from "@spectrum-web-components/bundle";

const COMMON_STATES = [
  "default",
  "hover",
  "active",
  "focus",
  "disabled",
  "down",
  "keyboard focus",
] as const;

@customElement("state-form")
export default class StateForm extends LitElement {
  static styles = css`
    .add-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-top: 8px;
    }
    .add-row sp-picker,
    .add-row sp-textfield {
      flex: 1;
    }
    .section-label {
      margin-top: 12px;
      margin-bottom: 8px;
    }
  `;

  @property({ type: Array })
  public values: Array<string> = [
    "default",
    "hover",
    "active",
    "focus",
    "disabled",
  ];

  @property({ type: String })
  public defaultValue = "default";

  private removeState(index: number) {
    const removedValue = this.values[index];
    this.values = this.values.filter((_, i) => i !== index);
    // If we removed the default value, set to first available or empty
    if (this.defaultValue === removedValue) {
      this.defaultValue = this.values.length > 0 ? this.values[0] : "";
    }
    this.requestUpdate();
  }

  private moveStateUp(index: number) {
    if (index > 0) {
      const newValues = [...this.values];
      [newValues[index - 1], newValues[index]] = [
        newValues[index],
        newValues[index - 1],
      ];
      this.values = newValues;
      this.requestUpdate();
    }
  }

  private moveStateDown(index: number) {
    if (index < this.values.length - 1) {
      const newValues = [...this.values];
      [newValues[index], newValues[index + 1]] = [
        newValues[index + 1],
        newValues[index],
      ];
      this.values = newValues;
      this.requestUpdate();
    }
  }

  private addCommonState(event: Event) {
    const picker = event.target as unknown as Picker;
    const state = picker.value;
    if (state && !this.values.includes(state)) {
      this.values = [...this.values, state];
      picker.value = "";
      this.requestUpdate();
    }
  }

  private addCustomState(e: Event) {
    e.preventDefault();
    if (this.shadowRoot) {
      const input = this.shadowRoot.querySelector(
        "#custom-state",
      ) as unknown as Textfield;
      const inputValue = input.value.trim();
      if (inputValue.length > 0 && !this.values.includes(inputValue)) {
        this.values = [...this.values, inputValue];
        input.value = "";
        this.requestUpdate();
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.addCustomState(e);
    }
  }

  private defaultValueChangeHandler(event: Event) {
    const picker = event.target as unknown as Picker;
    this.defaultValue = picker.value;
    this.requestUpdate();
  }

  private get availableCommonStates() {
    return COMMON_STATES.filter((state) => !this.values.includes(state));
  }

  render() {
    return html`
      <sp-field-label>Selected states:</sp-field-label>
      ${this.values.length > 0
        ? html`
            <sp-table density="compact" quiet>
              <sp-table-head>
                <sp-table-head-cell>State</sp-table-head-cell>
                <sp-table-head-cell>Actions</sp-table-head-cell>
              </sp-table-head>
              <sp-table-body>
                ${this.values.map(
                  (state, i) => html`
                    <sp-table-row>
                      <sp-table-cell>${state}</sp-table-cell>
                      <sp-table-cell>
                        <sp-action-group size="s">
                          <sp-action-button
                            label="Move up"
                            ?disabled=${i === 0}
                            @click=${() => this.moveStateUp(i)}
                          >
                            <sp-icon slot="icon"
                              >${ChevronUpIcon({
                                width: 16,
                                height: 16,
                              })}</sp-icon
                            >
                          </sp-action-button>
                          <sp-action-button
                            label="Move down"
                            ?disabled=${i === this.values.length - 1}
                            @click=${() => this.moveStateDown(i)}
                          >
                            <sp-icon slot="icon"
                              >${ChevronDownIcon({
                                width: 16,
                                height: 16,
                              })}</sp-icon
                            >
                          </sp-action-button>
                          <sp-action-button
                            label="Delete"
                            @click=${() => this.removeState(i)}
                          >
                            <sp-icon slot="icon"
                              >${DeleteIcon({ width: 16, height: 16 })}</sp-icon
                            >
                          </sp-action-button>
                        </sp-action-group>
                      </sp-table-cell>
                    </sp-table-row>
                  `,
                )}
              </sp-table-body>
            </sp-table>
          `
        : nothing}
      ${this.availableCommonStates.length > 0
        ? html`
            <div class="add-row">
              <sp-picker
                placeholder="Add common state..."
                @change=${this.addCommonState}
              >
                ${this.availableCommonStates.map(
                  (state) => html`
                    <sp-menu-item value=${state}>${state}</sp-menu-item>
                  `,
                )}
              </sp-picker>
              <sp-action-button disabled>
                <sp-icon slot="icon"
                  >${AddCircleIcon({ width: 16, height: 16 })}</sp-icon
                >
              </sp-action-button>
            </div>
          `
        : nothing}

      <form @submit=${this.addCustomState}>
        <div class="add-row">
          <sp-textfield
            type="text"
            id="custom-state"
            placeholder="Add custom state (e.g., focus + hover)"
            @keydown=${this.handleKeyDown}
          ></sp-textfield>
          <sp-action-button type="submit">
            <sp-icon slot="icon"
              >${AddCircleIcon({ width: 16, height: 16 })}</sp-icon
            >
          </sp-action-button>
        </div>
      </form>

      <sp-field-label for="default-value" class="section-label"
        >Default value:</sp-field-label
      >
      <sp-picker
        id="default-value"
        value=${this.defaultValue}
        @change=${this.defaultValueChangeHandler}
        ?disabled=${this.values.length === 0}
      >
        ${this.values.map(
          (value) => html`<sp-menu-item value=${value}>${value}</sp-menu-item>`,
        )}
      </sp-picker>
    `;
  }
}
