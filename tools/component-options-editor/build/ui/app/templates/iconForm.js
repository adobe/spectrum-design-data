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
import "@spectrum-web-components/picker/sp-picker.js";
import "@spectrum-web-components/menu/sp-menu-item.js";
// Subset of common workflow icons - in a real implementation, this would be the full list
const WORKFLOW_ICONS = [
  "Add",
  "AddCircle",
  "Alert",
  "AlertCircle",
  "Arrow",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Checkmark",
  "CheckmarkCircle",
  "ChevronDown",
  "ChevronLeft",
  "ChevronRight",
  "ChevronUp",
  "Close",
  "CloseCircle",
  "Delete",
  "Edit",
  "Help",
  "Info",
  "More",
  "Remove",
  "RemoveCircle",
  "Search",
  "Settings",
  "Star",
  "User",
  "View",
  "Visibility",
  "VisibilityOff",
].sort();
let IconForm = class IconForm extends LitElement {
  constructor() {
    super(...arguments);
    this.defaultValue = "";
    this.searchTerm = "";
  }
  handleSearchInput(event) {
    const input = event.target;
    this.searchTerm = input.value.toLowerCase();
    this.requestUpdate();
  }
  defaultValueChangeHandler(event) {
    const picker = event.target;
    this.defaultValue = picker.value;
    this.requestUpdate();
  }
  get filteredIcons() {
    if (!this.searchTerm) {
      return WORKFLOW_ICONS;
    }
    return WORKFLOW_ICONS.filter((icon) =>
      icon.toLowerCase().includes(this.searchTerm),
    );
  }
  render() {
    return html`
      <sp-field-label for="icon-search">Search icons:</sp-field-label>
      <sp-textfield
        id="icon-search"
        placeholder="Type to search..."
        @input=${this.handleSearchInput}
        style="margin-bottom: 8px;"
      ></sp-textfield>
      <sp-field-label for="default-value">Select icon:</sp-field-label>
      <sp-picker
        id="default-value"
        value=${this.defaultValue}
        @change=${this.defaultValueChangeHandler}
      >
        <sp-menu-item value="">None</sp-menu-item>
        ${this.filteredIcons.map((icon) => {
          return html`<sp-menu-item value=${icon}>${icon}</sp-menu-item>`;
        })}
      </sp-picker>
      ${this.defaultValue
        ? html`<div style="margin-top: 8px;">
            <sp-field-label>Selected: ${this.defaultValue}</sp-field-label>
          </div>`
        : ""}
    `;
  }
};
__decorate(
  [property({ type: String })],
  IconForm.prototype,
  "defaultValue",
  void 0,
);
__decorate(
  [property({ type: String })],
  IconForm.prototype,
  "searchTerm",
  void 0,
);
IconForm = __decorate([customElement("icon-form")], IconForm);
export default IconForm;
//# sourceMappingURL=iconForm.js.map
