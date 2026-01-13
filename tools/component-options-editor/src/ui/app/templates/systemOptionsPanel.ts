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
import { customElement, property, state } from "lit/decorators.js";

import "@spectrum-web-components/table/elements.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@spectrum-web-components/action-group/sp-action-group.js";
import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/button-group/sp-button-group.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/field-group/sp-field-group.js";
import "@spectrum-web-components/divider/sp-divider.js";
import "@spectrum-web-components/icon";
import {
  DeleteIcon,
  EditIcon,
  AddCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@spectrum-web-components/icons-workflow";
import { Textfield } from "@spectrum-web-components/bundle";

/**
 * Default system options pre-populated from Spectrum component schemas.
 */
export const DEFAULT_SYSTEM_OPTIONS: Array<SystemOptionInterface> = [
  {
    id: "sizes",
    title: "Sizes",
    description: "Common size values used across Spectrum components",
    items: ["xs", "s", "m", "l", "xl", "xxl", "xxxl"],
  },
  {
    id: "basicStates",
    title: "Basic States",
    description: "Interaction states for simple components like buttons",
    items: ["default", "hover", "down", "keyboard focus"],
  },
  {
    id: "inputStates",
    title: "Input States",
    description: "Interaction states for input components like text fields",
    items: [
      "default",
      "hover",
      "focus + hover",
      "focus + not hover",
      "keyboard focus",
    ],
  },
  {
    id: "staticColor",
    title: "Static Color",
    description: "Static color options for components on colored backgrounds",
    items: ["white", "black"],
  },
  {
    id: "labelPosition",
    title: "Label Position",
    description: "Position of labels relative to input fields",
    items: ["top", "side"],
  },
  {
    id: "necessityIndicator",
    title: "Necessity Indicator",
    description: "How to indicate required/optional fields",
    items: ["text", "icon"],
  },
  {
    id: "orientation",
    title: "Orientation",
    description: "Layout orientation for components",
    items: ["horizontal", "vertical"],
  },
  {
    id: "density",
    title: "Density",
    description: "Spacing density for components",
    items: ["compact", "regular"],
  },
];

/**
 * Event dispatched when system options are updated.
 */
export class SystemOptionsUpdateEvent extends Event {
  detail: Array<SystemOptionInterface>;

  constructor(systemOptions: Array<SystemOptionInterface>) {
    super("system-options-update", { bubbles: true, composed: true });
    this.detail = systemOptions;
  }
}

@customElement("system-options-panel")
export class SystemOptionsPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    .items-list {
      color: var(--spectrum-global-color-gray-600);
      font-size: 12px;
    }
    .form-section {
      margin-top: 16px;
      padding: 16px;
      background: var(--spectrum-global-color-gray-100);
      border-radius: 4px;
    }
    .form-section h4 {
      margin-top: 0;
      margin-bottom: 12px;
    }
    .items-input-section {
      margin-top: 12px;
    }
    .items-input-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 12px;
    }
    .items-input-row sp-textfield {
      flex: 1;
    }
    .items-table {
      margin-top: 8px;
    }
  `;

  @property({ type: Array })
  systemOptions: Array<SystemOptionInterface> = [];

  @state()
  private isFormOpen = false;

  @state()
  private editingIndex = -1;

  @state()
  private formTitle = "";

  @state()
  private formDescription = "";

  @state()
  private formItems: Array<string> = [];

  @state()
  private newItemValue = "";

  private generateId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private openAddForm() {
    this.isFormOpen = true;
    this.editingIndex = -1;
    this.formTitle = "";
    this.formDescription = "";
    this.formItems = [];
    this.newItemValue = "";
  }

  private openEditForm(index: number) {
    const option = this.systemOptions[index];
    this.isFormOpen = true;
    this.editingIndex = index;
    this.formTitle = option.title;
    this.formDescription = option.description || "";
    this.formItems = [...option.items];
    this.newItemValue = "";
  }

  private closeForm() {
    this.isFormOpen = false;
    this.editingIndex = -1;
    this.formTitle = "";
    this.formDescription = "";
    this.formItems = [];
    this.newItemValue = "";
  }

  private addItem() {
    const value = this.newItemValue.trim();
    if (value && !this.formItems.includes(value)) {
      this.formItems = [...this.formItems, value];
      this.newItemValue = "";
    }
  }

  private removeItem(index: number) {
    this.formItems = this.formItems.filter((_, i) => i !== index);
  }

  private moveItemUp(index: number) {
    if (index > 0) {
      const newItems = [...this.formItems];
      [newItems[index - 1], newItems[index]] = [
        newItems[index],
        newItems[index - 1],
      ];
      this.formItems = newItems;
    }
  }

  private moveItemDown(index: number) {
    if (index < this.formItems.length - 1) {
      const newItems = [...this.formItems];
      [newItems[index], newItems[index + 1]] = [
        newItems[index + 1],
        newItems[index],
      ];
      this.formItems = newItems;
    }
  }

  private handleItemKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.addItem();
    }
  }

  private saveOption() {
    if (!this.formTitle.trim() || this.formItems.length === 0) {
      return;
    }

    const option: SystemOptionInterface = {
      id:
        this.editingIndex >= 0
          ? this.systemOptions[this.editingIndex].id
          : this.generateId(this.formTitle),
      title: this.formTitle.trim(),
      description: this.formDescription.trim() || undefined,
      items: [...this.formItems],
    };

    let updatedOptions: Array<SystemOptionInterface>;

    if (this.editingIndex >= 0) {
      updatedOptions = [...this.systemOptions];
      updatedOptions[this.editingIndex] = option;
    } else {
      updatedOptions = [...this.systemOptions, option];
    }

    this.dispatchEvent(new SystemOptionsUpdateEvent(updatedOptions));
    this.closeForm();
  }

  private deleteOption(index: number) {
    const updatedOptions = this.systemOptions.filter((_, i) => i !== index);
    this.dispatchEvent(new SystemOptionsUpdateEvent(updatedOptions));
  }

  private resetToDefaults() {
    this.dispatchEvent(
      new SystemOptionsUpdateEvent([...DEFAULT_SYSTEM_OPTIONS]),
    );
  }

  private renderOptionRow(option: SystemOptionInterface, index: number) {
    return html`
      <sp-table-row>
        <sp-table-cell>${option.title}</sp-table-cell>
        <sp-table-cell>
          <span class="items-list">${option.items.join(", ")}</span>
        </sp-table-cell>
        <sp-table-cell>${option.description || "-"}</sp-table-cell>
        <sp-table-cell>
          <sp-action-group size="s">
            <sp-action-button
              label="Edit"
              @click=${() => this.openEditForm(index)}
            >
              <sp-icon slot="icon"
                >${EditIcon({ width: 16, height: 16 })}</sp-icon
              >
            </sp-action-button>
            <sp-action-button
              label="Delete"
              @click=${() => this.deleteOption(index)}
            >
              <sp-icon slot="icon"
                >${DeleteIcon({ width: 16, height: 16 })}</sp-icon
              >
            </sp-action-button>
          </sp-action-group>
        </sp-table-cell>
      </sp-table-row>
    `;
  }

  private renderForm() {
    if (!this.isFormOpen) return nothing;

    const isEditing = this.editingIndex >= 0;

    return html`
      <div class="form-section">
        <h4>${isEditing ? "Edit System Option" : "Add System Option"}</h4>
        <sp-field-group vertical>
          <sp-field-label for="option-title">Title</sp-field-label>
          <sp-textfield
            id="option-title"
            .value=${this.formTitle}
            @input=${(e: Event) =>
              (this.formTitle = (e.target as unknown as Textfield).value)}
            placeholder="e.g., Button Variants"
          ></sp-textfield>

          <sp-field-label for="option-description"
            >Description (optional)</sp-field-label
          >
          <sp-textfield
            id="option-description"
            .value=${this.formDescription}
            @input=${(e: Event) =>
              (this.formDescription = (e.target as unknown as Textfield).value)}
            placeholder="Brief description of this option group"
          ></sp-textfield>

          <div class="items-input-section">
            <sp-field-label>Items</sp-field-label>
            ${this.formItems.length > 0
              ? html`
                  <sp-table density="compact" quiet class="items-table">
                    <sp-table-head>
                      <sp-table-head-cell>Value</sp-table-head-cell>
                      <sp-table-head-cell>Actions</sp-table-head-cell>
                    </sp-table-head>
                    <sp-table-body>
                      ${this.formItems.map(
                        (item, i) => html`
                          <sp-table-row>
                            <sp-table-cell>${item}</sp-table-cell>
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
                                  ?disabled=${i === this.formItems.length - 1}
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
                                    >${DeleteIcon({
                                      width: 16,
                                      height: 16,
                                    })}</sp-icon
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
            <div class="items-input-row">
              <sp-textfield
                id="new-item"
                .value=${this.newItemValue}
                @input=${(e: Event) =>
                  (this.newItemValue = (
                    e.target as unknown as Textfield
                  ).value)}
                @keydown=${this.handleItemKeyDown}
                placeholder="Add an item value"
              ></sp-textfield>
              <sp-action-button @click=${this.addItem}>
                <sp-icon slot="icon"
                  >${AddCircleIcon({ width: 16, height: 16 })}</sp-icon
                >
              </sp-action-button>
            </div>
          </div>
        </sp-field-group>
        <sp-button-group style="margin-top: 16px;">
          <sp-button
            variant="primary"
            @click=${this.saveOption}
            ?disabled=${!this.formTitle.trim() || this.formItems.length === 0}
          >
            ${isEditing ? "Update" : "Save"}
          </sp-button>
          <sp-button variant="secondary" @click=${this.closeForm}
            >Cancel</sp-button
          >
        </sp-button-group>
      </div>
    `;
  }

  render() {
    return html`
      <div>
        <p
          style="margin-bottom: 16px; color: var(--spectrum-global-color-gray-700);"
        >
          System options are reusable global enum lists that can be referenced
          when creating component options with the "Global list" type.
        </p>

        <sp-table density="compact" quiet>
          <sp-table-head>
            <sp-table-head-cell>Title</sp-table-head-cell>
            <sp-table-head-cell>Items</sp-table-head-cell>
            <sp-table-head-cell>Description</sp-table-head-cell>
            <sp-table-head-cell>Actions</sp-table-head-cell>
          </sp-table-head>
          <sp-table-body>
            ${this.systemOptions.map((option, i) =>
              this.renderOptionRow(option, i),
            )}
          </sp-table-body>
        </sp-table>

        <div style="margin-top: 16px; display: flex; gap: 8px;">
          <sp-action-button @click=${this.openAddForm}>
            <sp-icon slot="icon"
              >${AddCircleIcon({ width: 16, height: 16 })}</sp-icon
            >
            Add System Option
          </sp-action-button>
          <sp-button
            variant="secondary"
            treatment="outline"
            @click=${this.resetToDefaults}
          >
            Reset to Defaults
          </sp-button>
        </div>

        ${this.renderForm()}
      </div>
    `;
  }
}
