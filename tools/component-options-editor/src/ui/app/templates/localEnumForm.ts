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
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/picker/sp-picker.js";
import "@spectrum-web-components/menu/sp-menu-item.js";
import "@spectrum-web-components/table/elements.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@spectrum-web-components/action-group/sp-action-group.js";
import "@spectrum-web-components/icon";
import {
  AddCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DeleteIcon,
} from "@spectrum-web-components/icons-workflow";
import { Picker, Textfield } from "@spectrum-web-components/bundle";

@customElement("local-enum-form")
export default class LocalEnumForm extends LitElement {
  static styles = css`
    .add-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-top: 8px;
    }
    .add-row sp-textfield {
      flex: 1;
    }
    .section-label {
      margin-top: 12px;
      margin-bottom: 8px;
    }
  `;

  @property({ type: Array })
  public values: Array<string> = [];

  @property({ type: String })
  public defaultValue = "";

  private addOption(e: Event) {
    e.preventDefault();
    if (this.shadowRoot) {
      const input = this.shadowRoot.querySelector(
        "#option",
      ) as unknown as Textfield;
      const inputValue = input.value
        .toLowerCase()
        .replace(/[^a-z0-9\s\-_]/g, "");
      if (inputValue.length > 0 && !this.values.includes(inputValue)) {
        this.values = [...this.values, inputValue];
        input.value = "";
        this.requestUpdate();
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.addOption(e);
    }
  }

  private moveItemUp(index: number) {
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

  private moveItemDown(index: number) {
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

  private removeItem(index: number) {
    const removedValue = this.values[index];
    this.values = this.values.filter((_, i) => i !== index);
    if (this.defaultValue === removedValue) {
      this.defaultValue = this.values.length > 0 ? this.values[0] : "";
    }
    this.requestUpdate();
  }

  private removeDefault() {
    this.defaultValue = "";
    this.requestUpdate();
  }

  private defaultValueChangeHandler(event: Event) {
    const picker = event.target as unknown as Picker;
    this.defaultValue = picker.value;
    this.requestUpdate();
  }

  render() {
    return html`
      <sp-field-label>Available options:</sp-field-label>
      ${this.values.length > 0
        ? html`
            <sp-table density="compact" quiet>
              <sp-table-head>
                <sp-table-head-cell>Option</sp-table-head-cell>
                <sp-table-head-cell>Actions</sp-table-head-cell>
              </sp-table-head>
              <sp-table-body>
                ${this.values.map(
                  (value, i) => html`
                    <sp-table-row>
                      <sp-table-cell>${value}</sp-table-cell>
                      <sp-table-cell>
                        <sp-action-group size="s">
                          <sp-action-button
                            label="Move up"
                            ?disabled=${i === 0}
                            @click=${() => this.moveItemUp(i)}
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
                            @click=${() => this.moveItemDown(i)}
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
                            @click=${() => this.removeItem(i)}
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

      <form @submit=${this.addOption}>
        <div class="add-row">
          <sp-textfield
            type="text"
            id="option"
            placeholder="Add an option value"
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
      <div style="display: flex; gap: 8px; align-items: flex-start;">
        <sp-picker
          id="default-value"
          value=${this.defaultValue}
          @change=${this.defaultValueChangeHandler}
          ?disabled=${this.values.length === 0}
          style="flex: 1;"
        >
          ${this.values.map(
            (value) =>
              html`<sp-menu-item
                value=${value}
                ?selected=${this.defaultValue === value}
                >${value}</sp-menu-item
              >`,
          )}
        </sp-picker>
        <sp-action-button
          @click=${this.removeDefault}
          ?disabled=${this.defaultValue === ""}
        >
          <sp-icon slot="icon"
            >${DeleteIcon({ width: 16, height: 16 })}</sp-icon
          >
          Remove Default
        </sp-action-button>
      </div>
    `;
  }
}
