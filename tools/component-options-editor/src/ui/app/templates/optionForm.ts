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
import LocalEnumForm from "./localEnumForm";
import SizeForm from "./sizeForm";
import StateForm from "./stateForm";
import IconForm from "./iconForm";
import ColorForm from "./colorForm";
import SystemEnumForm from "./systemEnumForm";
import SaveOptionEvent from "../events/saveOptionEvent";

import { Picker, Textfield, Checkbox } from "@spectrum-web-components/bundle";

// const event = new NewOptionsEvent('Something important happened');
// this.dispatchEvent(event);

@customElement("option-form")
export class OptionForm extends LitElement {
  static styles = css`
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

  @property({ type: Boolean })
  public opened = false;
  @property({ type: String })
  public optionType: OptionTypes = "string";
  @property({ type: String })
  public optionName: string = "";
  @property({ type: String })
  public defaultValue: string = "";
  @property({ type: Boolean })
  public required: boolean = false;
  @property({ type: String })
  public description: string = "";
  @property({ type: Number })
  public optionIndex: number = -1;
  @property({ type: Object })
  public editingOption: ComponentOptionInterface | null = null;
  @property({ type: Array })
  public systemOptions: Array<SystemOptionInterface> = [];
  @query("#option-name") optionNameTextfield!: Textfield;
  @query("#default-value") defaultValueTextfield!: Textfield;
  @query("#description") descriptionTextfield!: Textfield;
  @query("#option-type") optionTypePicker!: Picker;
  @query("#required-checkbox") requiredCheckbox!: Checkbox;
  @query("#local-enum-form") localEnumForm!: LocalEnumForm;
  @query("#size-form") sizeForm!: SizeForm;
  @query("#state-form") stateForm!: StateForm;
  @query("#icon-form") iconForm!: IconForm;
  @query("#color-form") colorForm!: ColorForm;
  @query("#system-enum-form") systemEnumForm!: SystemEnumForm;

  updated(changedProperties: Map<string, unknown>) {
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
    const option: ComponentOptionInterface = {
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
            @change=${(event: Event) =>
              (this.optionType = (event.target as HTMLInputElement)
                .value as OptionTypes)}
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
}
