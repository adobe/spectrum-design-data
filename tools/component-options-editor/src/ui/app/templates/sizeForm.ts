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
import "@spectrum-web-components/table/elements.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@spectrum-web-components/action-group/sp-action-group.js";
import "@spectrum-web-components/icon";
import {
  DeleteIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AddCircleIcon,
} from "@spectrum-web-components/icons-workflow";
import { Picker } from "@spectrum-web-components/bundle";

type SizeValue = "xs" | "s" | "m" | "l" | "xl" | "xxl" | "xxxl";
const ALL_SIZES: SizeValue[] = ["xs", "s", "m", "l", "xl", "xxl", "xxxl"];

@customElement("size-form")
export default class SizeForm extends LitElement {
  static styles = css`
    .add-size-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-top: 8px;
    }
    .add-size-row sp-picker {
      flex: 1;
    }
  `;

  @property({ type: Array })
  public values: Array<string> = ["s", "m", "l", "xl"];

  @property({ type: String })
  public defaultValue = "m";

  private removeSize(index: number) {
    const removedValue = this.values[index];
    this.values = this.values.filter((_, i) => i !== index);
    // If we removed the default value, clear it or set to first
    if (this.defaultValue === removedValue) {
      this.defaultValue = this.values.length > 0 ? this.values[0] : "";
    }
    this.requestUpdate();
  }

  private moveSizeUp(index: number) {
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

  private moveSizeDown(index: number) {
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

  private addSize(event: Event) {
    const picker = event.target as unknown as Picker;
    const size = picker.value;
    if (size && !this.values.includes(size)) {
      this.values = [...this.values, size];
      picker.value = "";
      this.requestUpdate();
    }
  }

  private defaultValueChangeHandler(event: Event) {
    const picker = event.target as unknown as Picker;
    this.defaultValue = picker.value;
    this.requestUpdate();
  }

  private get availableSizes(): SizeValue[] {
    return ALL_SIZES.filter((size) => !this.values.includes(size));
  }

  render() {
    return html`
      <sp-field-label>Available sizes:</sp-field-label>
      ${this.values.length > 0
        ? html`
            <sp-table density="compact" quiet>
              <sp-table-head>
                <sp-table-head-cell>Size</sp-table-head-cell>
                <sp-table-head-cell>Actions</sp-table-head-cell>
              </sp-table-head>
              <sp-table-body>
                ${this.values.map(
                  (size, i) => html`
                    <sp-table-row>
                      <sp-table-cell>${size}</sp-table-cell>
                      <sp-table-cell>
                        <sp-action-group size="s">
                          <sp-action-button
                            label="Move up"
                            ?disabled=${i === 0}
                            @click=${() => this.moveSizeUp(i)}
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
                            @click=${() => this.moveSizeDown(i)}
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
                            @click=${() => this.removeSize(i)}
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
      ${this.availableSizes.length > 0
        ? html`
            <div class="add-size-row">
              <sp-picker placeholder="Add a size..." @change=${this.addSize}>
                ${this.availableSizes.map(
                  (size) => html`
                    <sp-menu-item value=${size}>${size}</sp-menu-item>
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

      <sp-field-label for="default-value" style="margin-top: 12px;"
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
