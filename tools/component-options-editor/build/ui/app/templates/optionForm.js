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
import { LitElement, html, nothing, css } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/field-group/sp-field-group.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/help-text/sp-help-text.js";
import "./localEnumForm";
import "./sizeForm";
import "./stateForm";
import "./iconForm";
import "./colorForm";
import "./systemEnumForm";
import SaveOptionEvent from "../events/saveOptionEvent";
// const event = new NewOptionsEvent('Something important happened');
// this.dispatchEvent(event);
let OptionForm = class OptionForm extends LitElement {
  constructor() {
    super(...arguments);
    this.opened = false;
    this.optionType = "string";
    this.optionName = "";
    this.defaultValue = "";
    this.required = false;
    this.description = "";
    this.optionIndex = -1;
    this.editingOption = null;
    this.systemOptions = [];
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    // Populate form when editingOption is set
    if (changedProperties.has("editingOption") && this.editingOption) {
      this.optionType = this.editingOption.type;
      this.optionName = this.editingOption.title;
      this.defaultValue = String(this.editingOption.defaultValue || "");
      this.required = this.editingOption.required || false;
      this.description = this.editingOption.description || "";
      // Request update to re-render with new values
      this.requestUpdate();
    }
    // After render, update form fields directly
    if (this.editingOption && this.opened) {
      if (this.optionNameTextfield) {
        this.optionNameTextfield.value = this.editingOption.title;
      }
      if (this.optionTypePicker) {
        this.optionTypePicker.value = this.editingOption.type;
      }
      if (this.descriptionTextfield) {
        this.descriptionTextfield.value = this.editingOption.description || "";
      }
      if (this.requiredCheckbox) {
        this.requiredCheckbox.checked = this.editingOption.required || false;
      }
    }
    // After render, populate sub-forms with editing data
    if (this.editingOption && this.opened) {
      switch (this.editingOption.type) {
        case "localEnum":
          if (this.localEnumForm && this.editingOption.items) {
            this.localEnumForm.values = [...this.editingOption.items];
            this.localEnumForm.defaultValue = String(
              this.editingOption.defaultValue || "",
            );
          }
          break;
        case "systemEnum":
          if (this.systemEnumForm && this.editingOption.items) {
            this.systemEnumForm.values = [...this.editingOption.items];
            this.systemEnumForm.defaultValue = String(
              this.editingOption.defaultValue || "",
            );
          }
          break;
        case "size":
          if (this.sizeForm && this.editingOption.items) {
            this.sizeForm.values = [...this.editingOption.items];
            this.sizeForm.defaultValue = String(
              this.editingOption.defaultValue || "m",
            );
          }
          break;
        case "state":
          if (this.stateForm && this.editingOption.items) {
            this.stateForm.values = [...this.editingOption.items];
            this.stateForm.defaultValue = String(
              this.editingOption.defaultValue || "default",
            );
          }
          break;
        case "icon":
          if (this.iconForm) {
            this.iconForm.defaultValue = String(
              this.editingOption.defaultValue || "",
            );
          }
          break;
        case "color":
          if (this.colorForm) {
            this.colorForm.defaultValue = String(
              this.editingOption.defaultValue || "",
            );
          }
          break;
      }
    }
  }
  updateOptionProperties() {
    this.optionName = this.optionNameTextfield.value;
    if (this.defaultValueTextfield) {
      this.defaultValue = this.defaultValueTextfield.value;
    }
    if (this.descriptionTextfield) {
      this.description = this.descriptionTextfield.value;
    }
    this.required = this.requiredCheckbox.checked;
  }
  saveOption() {
    this.updateOptionProperties();
    const option = {
      title: this.optionName,
      type: this.optionType,
      defaultValue: this.defaultValue,
      required: this.required,
    };
    // Add description if provided
    if (this.description) {
      option.description = this.description;
    }
    switch (this.optionType) {
      case "boolean":
        option.defaultValue = false;
        break;
      case "localEnum":
        if (this.localEnumForm) {
          option.items = this.localEnumForm.values;
          option.defaultValue = this.localEnumForm.defaultValue;
        }
        break;
      case "systemEnum":
        if (this.systemEnumForm) {
          option.items = this.systemEnumForm.values;
          option.defaultValue = this.systemEnumForm.defaultValue;
        }
        break;
      case "size":
        if (this.sizeForm) {
          option.items = this.sizeForm.values;
          option.defaultValue = this.sizeForm.defaultValue;
        }
        break;
      case "state":
        if (this.stateForm) {
          option.items = this.stateForm.values;
          option.defaultValue = this.stateForm.defaultValue;
        }
        break;
      case "icon":
        if (this.iconForm) {
          option.defaultValue = this.iconForm.defaultValue;
        }
        break;
      case "color":
        if (this.colorForm) {
          option.defaultValue = this.colorForm.defaultValue;
        }
        break;
    }
    this.dispatchEvent(new SaveOptionEvent(option));
  }
  clearForm() {
    if (this.optionNameTextfield) this.optionNameTextfield.value = "";
    if (this.defaultValueTextfield) this.defaultValueTextfield.value = "";
    if (this.descriptionTextfield) this.descriptionTextfield.value = "";
    if (this.optionTypePicker) this.optionType = "string";
    if (this.requiredCheckbox) this.requiredCheckbox.checked = false;
    this.description = "";
    this.optionName = "";
    this.defaultValue = "";
    this.required = false;
  }
  cancelEdit() {
    this.clearForm();
    this.editingOption = null;
    this.optionIndex = -1;
    this.dispatchEvent(
      new CustomEvent("cancelEdit", { bubbles: true, composed: true }),
    );
  }
  render() {
    let subForm;
    switch (this.optionType) {
      case "string":
        subForm = html`String
          <sp-field-label for="default-value"
            >Default text value:</sp-field-label
          >
          <sp-textfield
            id="default-value"
            .value=${this.defaultValue}
          ></sp-textfield>`;
        break;
      case "boolean":
        subForm = html`Default value: No`;
        break;
      case "localEnum":
        subForm = html`<local-enum-form
          id="local-enum-form"
        ></local-enum-form>`;
        break;
      case "systemEnum":
        subForm = html`<system-enum-form
          id="system-enum-form"
          .systemOptions=${this.systemOptions}
        ></system-enum-form>`;
        break;
      case "size":
        subForm = html`<size-form id="size-form"></size-form>`;
        break;
      case "state":
        subForm = html`<state-form id="state-form"></state-form>`;
        break;
      case "icon":
        subForm = html`<icon-form id="icon-form"></icon-form>`;
        break;
      case "color":
        subForm = html`<color-form id="color-form"></color-form>`;
        break;
      default:
        subForm = html`<sp-field-label for="default-value"
            >Default value:</sp-field-label
          >
          <sp-textfield
            id="default-value"
            .value=${this.defaultValue}
          ></sp-textfield>`;
    }
    const isEditing = this.optionIndex >= 0;
    return html`<div
      style=${this.opened ? "display: block;" : "display: none;"}
    >
      <div class="form-section">
        ${isEditing
          ? html`<h3>Edit Option</h3>`
          : html`<h3>Add New Option</h3>`}
        <sp-field-group vertical>
          <sp-field-label for="option-name">option name:</sp-field-label>
          <sp-textfield
            id="option-name"
            .value=${this.optionName}
          ></sp-textfield>
          <sp-field-label for="option-type">option type:</sp-field-label>
          <sp-picker
            id="option-type"
            .value=${this.optionType}
            @change=${(event) => (this.optionType = event.target.value)}
          >
            <sp-menu-item value="string">Text</sp-menu-item>
            <sp-menu-item value="boolean">Yes / No</sp-menu-item>
            <sp-menu-item value="localEnum"
              >Component specific list</sp-menu-item
            >
            <sp-menu-item value="systemEnum">Global list</sp-menu-item>
            <sp-menu-item value="size">Size</sp-menu-item>
            <sp-menu-item value="state">State</sp-menu-item>
            <sp-menu-item value="icon">Icon</sp-menu-item>
            <sp-menu-item value="color">Color</sp-menu-item>
            <sp-menu-item value="dimension">Dimension</sp-menu-item>
          </sp-picker>
          ${subForm}
          <sp-field-label for="description"
            >Description (optional):</sp-field-label
          >
          <sp-textfield
            id="description"
            .value=${this.description}
            multiline
            rows="3"
          ></sp-textfield>
          <sp-help-text
            >Provide additional context about this option</sp-help-text
          >
          <sp-checkbox
            id="required-checkbox"
            checked=${this.required ? true : nothing}
            size="m"
            >Required</sp-checkbox
          >
        </sp-field-group>
        <sp-button-group>
          <sp-button variant="primary" @click=${() => this.saveOption()}
            >${isEditing ? "Update Option" : "Save Option"}</sp-button
          >
          <sp-button
            variant="secondary"
            @click=${() => (isEditing ? this.cancelEdit() : this.clearForm())}
            >${isEditing ? "Cancel" : "Clear Form"}</sp-button
          >
        </sp-button-group>
      </div>
    </div>`;
  }
};
OptionForm.styles = css`
  :host {
    display: block;
    width: 100%;
  }
  .form-section {
    margin-top: 16px;
    padding: 16px;
    background: var(--spectrum-global-color-gray-100);
    border-radius: 4px;
  }
  .form-section h3 {
    margin-top: 0;
    margin-bottom: 12px;
  }
`;
__decorate(
  [property({ type: Boolean })],
  OptionForm.prototype,
  "opened",
  void 0,
);
__decorate(
  [property({ type: String })],
  OptionForm.prototype,
  "optionType",
  void 0,
);
__decorate(
  [property({ type: String })],
  OptionForm.prototype,
  "optionName",
  void 0,
);
__decorate(
  [property({ type: String })],
  OptionForm.prototype,
  "defaultValue",
  void 0,
);
__decorate(
  [property({ type: Boolean })],
  OptionForm.prototype,
  "required",
  void 0,
);
__decorate(
  [property({ type: String })],
  OptionForm.prototype,
  "description",
  void 0,
);
__decorate(
  [property({ type: Number })],
  OptionForm.prototype,
  "optionIndex",
  void 0,
);
__decorate(
  [property({ type: Object })],
  OptionForm.prototype,
  "editingOption",
  void 0,
);
__decorate(
  [property({ type: Array })],
  OptionForm.prototype,
  "systemOptions",
  void 0,
);
__decorate(
  [query("#option-name")],
  OptionForm.prototype,
  "optionNameTextfield",
  void 0,
);
__decorate(
  [query("#default-value")],
  OptionForm.prototype,
  "defaultValueTextfield",
  void 0,
);
__decorate(
  [query("#description")],
  OptionForm.prototype,
  "descriptionTextfield",
  void 0,
);
__decorate(
  [query("#option-type")],
  OptionForm.prototype,
  "optionTypePicker",
  void 0,
);
__decorate(
  [query("#required-checkbox")],
  OptionForm.prototype,
  "requiredCheckbox",
  void 0,
);
__decorate(
  [query("#local-enum-form")],
  OptionForm.prototype,
  "localEnumForm",
  void 0,
);
__decorate([query("#size-form")], OptionForm.prototype, "sizeForm", void 0);
__decorate([query("#state-form")], OptionForm.prototype, "stateForm", void 0);
__decorate([query("#icon-form")], OptionForm.prototype, "iconForm", void 0);
__decorate([query("#color-form")], OptionForm.prototype, "colorForm", void 0);
__decorate(
  [query("#system-enum-form")],
  OptionForm.prototype,
  "systemEnumForm",
  void 0,
);
OptionForm = __decorate([customElement("option-form")], OptionForm);
export { OptionForm };
//# sourceMappingURL=optionForm.js.map
