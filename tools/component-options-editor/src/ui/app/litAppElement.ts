/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2023 Adobe
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

import { css, html, LitElement, nothing } from "lit";
import { customElement, query, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/button-group/sp-button-group.js";
import "@spectrum-web-components/checkbox/sp-checkbox.js";
import "@spectrum-web-components/divider/sp-divider.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/radio/sp-radio.js";
import "@spectrum-web-components/radio/sp-radio-group.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/table/elements.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@spectrum-web-components/action-group/sp-action-group.js";
import "@spectrum-web-components/icon";
import "@spectrum-web-components/picker/sync/sp-picker.js";
import "@spectrum-web-components/menu/sp-menu.js";
import "@spectrum-web-components/menu/sp-menu-item.js";
import "@spectrum-web-components/menu/sp-menu-divider.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/field-group/sp-field-group.js";
import "@spectrum-web-components/color-field/sp-color-field.js";
import "@spectrum-web-components/tabs/sp-tabs.js";
import "@spectrum-web-components/tabs/sp-tab.js";
import "@spectrum-web-components/tabs/sp-tab-panel.js";
import "@spectrum-web-components/progress-circle/sp-progress-circle.js";
import {
  DeleteIcon,
  EditIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AddCircleIcon,
  CopyIcon,
  DownloadIcon,
} from "@spectrum-web-components/icons-workflow";
import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import { cout } from "../../plugin/helpers";
import { ActionButton } from "@spectrum-web-components/bundle";

import SaveOptionEvent from "./events/saveOptionEvent";
import "./templates/optionForm";
import "./templates/schemaImporter";
import "./templates/systemOptionsPanel";
import "./templates/optionsPreview";
import "./templates/validationErrors";
import { githubAuthTemplate } from "./templates/githubAuth";
import {
  DEFAULT_SYSTEM_OPTIONS,
  SystemOptionsUpdateEvent,
} from "./templates/systemOptionsPanel";
import {
  validateComponentJSON,
  type ValidationError,
} from "../validators/jsonValidator";
import { extractLineColumn } from "../utils/jsonErrorUtils";

@customElement("lit-app-element")
export class LitAppElement extends LitElement {
  static styles = css`
    .spectrum-Heading--sizeS {
      margin-bottom: 8px;
    }
    .spectrum-Divider--overwrite {
      margin-bottom: 16px;
    }
    .resize-handle {
      position: fixed;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      cursor: nwse-resize;
      z-index: 1000;
      background: linear-gradient(
        135deg,
        transparent 0%,
        transparent 50%,
        rgba(0, 0, 0, 0.2) 50%,
        rgba(0, 0, 0, 0.2) 100%
      );
    }
    .resize-handle:hover {
      background: linear-gradient(
        135deg,
        transparent 0%,
        transparent 50%,
        rgba(0, 0, 0, 0.4) 50%,
        rgba(0, 0, 0, 0.4) 100%
      );
    }
    .feedback-message {
      background-color: var(--spectrum-global-color-green-100);
      border-left: 4px solid var(--spectrum-global-color-green-600);
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      color: var(--spectrum-global-color-gray-800);
      font-size: 14px;
      animation: fadeIn 0.3s ease-in;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .valid-indicator {
      color: var(--spectrum-global-color-green-600);
      font-size: 14px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .json-editor-actions {
      margin-bottom: 16px;
    }
    .validating-indicator {
      color: var(--spectrum-global-color-gray-700);
      font-size: 14px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #json-editor-container {
      margin: 16px 0;
      width: 100%;
      box-sizing: border-box;
    }
    .CodeMirror {
      height: auto !important;
      width: 100% !important;
      box-sizing: border-box;
      font-size: 13px;
      font-family:
        "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
        monospace;
      border: 1px solid var(--spectrum-global-color-gray-300);
      border-radius: 4px;
    }
    .CodeMirror-scroll {
      min-height: 200px;
      max-height: none;
      overflow-y: hidden !important;
      overflow-x: auto !important;
    }
    .CodeMirror-sizer {
      min-height: 200px !important;
    }
    .CodeMirror-focused {
      outline: 2px solid var(--spectrum-global-color-blue-500);
      outline-offset: 2px;
    }
    .cm-error-highlight {
      background-color: rgba(255, 0, 0, 0.2);
      border-bottom: 2px wavy var(--spectrum-global-color-red-600);
      position: relative;
    }
  `;

  @query("#checkboxOne") checkboxInput!: HTMLInputElement;
  @query(".resize-handle") resizeHandle!: HTMLElement;
  @query("#json-editor-container") jsonEditorContainer!: HTMLDivElement;
  @query("sp-tabs") tabs!: HTMLElement;

  private codeMirrorEditor?: CodeMirror.Editor;
  private codeMirrorInitialized = false;
  private errorMarker?: CodeMirror.TextMarker;

  private isResizing = false;
  private startX = 0;
  private startY = 0;
  private startWidth = 900;
  private startHeight = 500;

  constructor() {
    super();
  }
  @property({ type: Boolean }) openForm = false;
  @property({ type: Number }) editingIndex = -1;
  @property({ type: Object }) editingOption: ComponentOptionInterface | null =
    null;
  @property({ type: String }) componentName = "";
  @property({ type: String }) componentCategory = "";
  @property({ type: String }) componentDocumentationURL = "";
  @property({ type: String }) componentJSON = "";
  @property({ type: String }) urlValidationError = "";
  @property({ type: Array }) validationErrors: ValidationError[] = [];
  @property({ type: Boolean }) showFeedback = false;
  @property({ type: String }) feedbackMessage = "";
  @property({ type: String }) validationStatus:
    | "valid"
    | "invalid"
    | "validating" = "valid";
  @property({ type: Array }) systemOptions: Array<SystemOptionInterface> = [
    ...DEFAULT_SYSTEM_OPTIONS,
  ];

  // GitHub integration properties
  @property({ type: Boolean }) isGitHubAuthenticated = false;
  @property({ type: String }) githubPAT = "";
  @property({ type: Boolean }) isCreatingPR = false;
  @property({ type: String }) prUrl = "";
  @property({ type: String }) prError = "";
  @property({ type: Boolean }) showPRSuccess = false;
  @property({ type: Boolean }) showPRError = false;
  @property({ type: String }) prDescription = "";
  @property({ type: Boolean }) showDescriptionDialog = false;

  private validationTimeout: number | null = null;
  @property()
  private _componentOptions: Array<ComponentOptionInterface> = [];
  @property()
  get componentOptions(): Array<ComponentOptionInterface> {
    return this._componentOptions;
  }
  set componentOptions(val: Array<ComponentOptionInterface>) {
    this._componentOptions = val;
    const componentData: ComponentInterface = {
      title: this.componentName,
      meta: {
        category: this.componentCategory,
        documentationUrl: this.componentDocumentationURL,
      },
      options: val,
    };
    // Update JSON view to reflect changes
    const jsonString = JSON.stringify(componentData, null, 2);
    this.componentJSON = jsonString;
    this.updateCodeMirrorEditor(jsonString);
    this.validateJSON(); // Auto-validate
    this.sendMessage("update-component", componentData);
  }
  addItem(item: ComponentOptionInterface) {
    return [...this._componentOptions, item];
  }
  updateItem(
    array: Array<ComponentOptionInterface>,
    index: number,
    item: ComponentOptionInterface,
  ) {
    const result = Array.from(array);
    result[index] = item;
    return result;
  }
  editOption(index: number) {
    this.editingIndex = index;
    this.editingOption = { ...this._componentOptions[index] };
    this.openForm = true;
  }
  cancelEdit() {
    this.editingIndex = -1;
    this.editingOption = null;
    this.openForm = false;
  }
  moveItem(array: Array<ComponentOptionInterface>, from: number, to: number) {
    const result = Array.from(array);
    const f = result.splice(from, 1)[0];
    result.splice(to, 0, f);
    return result;
  }
  removeItem(array: Array<ComponentOptionInterface>, index: number) {
    const result = Array.from(array);
    result.splice(index, 1);
    return result;
  }
  actions(index: number, array: Array<ComponentOptionInterface>) {
    return html`<sp-action-group size="s">
      <sp-action-button
        label="Delete"
        @click=${() => (this.componentOptions = this.removeItem(array, index))}
      >
        <sp-icon slot="icon">${DeleteIcon({ width: 16, height: 16 })}</sp-icon>
      </sp-action-button>
      <sp-action-button label="Edit" @click=${() => this.editOption(index)}>
        <sp-icon slot="icon">${EditIcon({ width: 16, height: 16 })}</sp-icon>
      </sp-action-button>
      <sp-action-button
        label="Move up"
        disabled=${index <= 0 ? true : nothing}
        @click=${() =>
          (this.componentOptions = this.moveItem(array, index, index - 1))}
      >
        <sp-icon slot="icon"
          >${ChevronUpIcon({ width: 16, height: 16 })}</sp-icon
        >
      </sp-action-button>
      <sp-action-button
        label="Move down"
        disabled=${index >= array.length - 1 ? true : nothing}
        @click=${() =>
          (this.componentOptions = this.moveItem(array, index, index + 1))}
      >
        <sp-icon slot="icon"
          >${ChevronDownIcon({ width: 16, height: 16 })}</sp-icon
        >
      </sp-action-button>
    </sp-action-group>`;
  }
  /**
   * Validate and handle component name changes
   */
  handleNameChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    this.componentName = input.value;
    // Defer update to avoid scheduling during render
    setTimeout(() => this.updateMetadata(), 0);
  };

  /**
   * Handle category picker changes
   */
  handleCategoryChange = (e: Event) => {
    const picker = e.target as HTMLElement & { value: string };
    this.componentCategory = picker.value;
    // Defer update to avoid scheduling during render
    setTimeout(() => this.updateMetadata(), 0);
  };

  /**
   * Update URL value while typing
   */
  handleUrlInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    this.componentDocumentationURL = input.value;
  };

  /**
   * Validate and persist documentation URL when user finishes editing
   */
  handleUrlBlur = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const url = input.value;

    // Validate URL pattern
    const urlPattern = /^https:\/\/spectrum\.adobe\.com\/page\//;

    if (url && !urlPattern.test(url)) {
      this.urlValidationError =
        "URL must start with https://spectrum.adobe.com/page/";
    } else {
      this.urlValidationError = "";
      // Defer update to avoid scheduling during render
      setTimeout(() => this.updateMetadata(), 0);
    }
  };

  /**
   * Update metadata and persist to Figma storage
   */
  updateMetadata() {
    const componentData: ComponentInterface = {
      title: this.componentName,
      meta: {
        category: this.componentCategory,
        documentationUrl: this.componentDocumentationURL,
      },
      options: this._componentOptions,
    };
    // Update JSON view to reflect changes
    const jsonString = JSON.stringify(componentData, null, 2);
    this.componentJSON = jsonString;
    this.updateCodeMirrorEditor(jsonString);
    this.validateJSON(); // Auto-validate
    this.sendMessage("update-component", componentData);
  }

  renderOptionRow(
    option: ComponentOptionInterface,
    index: number,
    options: Array<ComponentOptionInterface>,
  ) {
    switch (option.type) {
      case "string":
        return html`<sp-table-row>
          <sp-table-cell>${option.title}</sp-table-cell>
          <sp-table-cell>text</sp-table-cell>
          <sp-table-cell
            >${Object.hasOwn(option, "defaultValue")
              ? option.defaultValue
              : "-"}</sp-table-cell
          >
          <sp-table-cell>${option.required ? "yes" : "no"}</sp-table-cell>
          <sp-table-cell>${option.description || "-"}</sp-table-cell>
          <sp-table-cell>${this.actions(index, options)}</sp-table-cell>
        </sp-table-row>`;
      case "boolean":
        return html`<sp-table-row>
          <sp-table-cell>${option.title}</sp-table-cell>
          <sp-table-cell>yes / no</sp-table-cell>
          <sp-table-cell
            >${Object.hasOwn(option, "defaultValue")
              ? option.defaultValue
                ? "yes"
                : "no"
              : "-"}</sp-table-cell
          >
          <sp-table-cell>${option.required ? "yes" : "no"}</sp-table-cell>
          <sp-table-cell>${option.description || "-"}</sp-table-cell>
          <sp-table-cell>${this.actions(index, options)}</sp-table-cell>
        </sp-table-row>`;
      case "localEnum":
      case "systemEnum":
      case "size":
      case "state":
        return html`<sp-table-row>
          <sp-table-cell>${option.title}</sp-table-cell>
          <sp-table-cell
            >${Object.hasOwn(option, "items")
              ? option.items
                  ?.map((item: string) => (item === null ? "none" : item))
                  .join(" / ")
              : "-"}</sp-table-cell
          >
          <sp-table-cell
            >${Object.hasOwn(option, "defaultValue")
              ? option.defaultValue
              : "-"}</sp-table-cell
          >
          <sp-table-cell>${option.required ? "yes" : "no"}</sp-table-cell>
          <sp-table-cell>${option.description || "-"}</sp-table-cell>
          <sp-table-cell>${this.actions(index, options)}</sp-table-cell>
        </sp-table-row>`;
      case "icon":
        return html`<sp-table-row>
          <sp-table-cell>${option.title}</sp-table-cell>
          <sp-table-cell>workflow icon</sp-table-cell>
          <sp-table-cell
            >${Object.hasOwn(option, "defaultValue") && option.defaultValue
              ? option.defaultValue
              : "-"}</sp-table-cell
          >
          <sp-table-cell>${option.required ? "yes" : "no"}</sp-table-cell>
          <sp-table-cell>${option.description || "-"}</sp-table-cell>
          <sp-table-cell>${this.actions(index, options)}</sp-table-cell>
        </sp-table-row>`;
      case "color":
        return html`<sp-table-row>
          <sp-table-cell>${option.title}</sp-table-cell>
          <sp-table-cell>hex color</sp-table-cell>
          <sp-table-cell>
            ${Object.hasOwn(option, "defaultValue") && option.defaultValue
              ? html`<div style="display: flex; align-items: center; gap: 8px;">
                  <div
                    style="width: 16px; height: 16px; border: 1px solid #ccc; border-radius: 2px; background-color: ${option.defaultValue};"
                  ></div>
                  ${option.defaultValue}
                </div>`
              : "-"}
          </sp-table-cell>
          <sp-table-cell>${option.required ? "yes" : "no"}</sp-table-cell>
          <sp-table-cell>${option.description || "-"}</sp-table-cell>
          <sp-table-cell>${this.actions(index, options)}</sp-table-cell>
        </sp-table-row>`;
      default:
        return html``;
    }
  }

  /**
   * Load stored GitHub PAT from plugin storage
   */
  private loadStoredPAT() {
    this.sendMessage("get-github-pat", {});
  }

  /**
   * Handle GitHub authentication with PAT
   */
  private handleGitHubAuth = (token: string) => {
    if (!token || token.trim() === "") {
      return;
    }
    this.githubPAT = token;
    this.isGitHubAuthenticated = true;
    this.sendMessage("store-github-pat", { pat: token });
    cout("FRONTEND: Stored GitHub PAT");
  };

  /**
   * Handle GitHub authentication revocation
   */
  private handleGitHubRevoke = () => {
    this.githubPAT = "";
    this.isGitHubAuthenticated = false;
    this.sendMessage("delete-github-pat", {});
    this.showPRSuccess = false;
    this.showPRError = false;
    cout("FRONTEND: Revoked GitHub PAT");
  };

  /**
   * Build component data from current state
   */
  private buildComponentData(): ComponentInterface {
    return {
      title: this.componentName,
      meta: {
        category: this.componentCategory,
        documentationUrl: this.componentDocumentationURL,
      },
      options: this._componentOptions,
    };
  }

  /**
   * Validate component data before PR creation
   */
  private validateComponentForPR(): boolean {
    if (!this.componentName || this.componentName.trim() === "") {
      this.prError = "Component name is required";
      this.showPRError = true;
      return false;
    }

    if (!this.componentCategory || this.componentCategory === "") {
      this.prError = "Component category is required";
      this.showPRError = true;
      return false;
    }

    if (
      !this.componentDocumentationURL ||
      this.componentDocumentationURL.trim() === ""
    ) {
      this.prError = "Documentation URL is required";
      this.showPRError = true;
      return false;
    }

    if (this.validationErrors.length > 0) {
      this.prError = "Please fix validation errors before creating a PR";
      this.showPRError = true;
      return false;
    }

    return true;
  }

  /**
   * Show description dialog and get description from user
   */
  private async promptForDescription(): Promise<string | null> {
    return new Promise((resolve) => {
      this.showDescriptionDialog = true;
      this.prDescription = "";

      const handler = (e: Event) => {
        if ((e as CustomEvent).detail?.action === "confirm") {
          const description = this.prDescription;
          this.showDescriptionDialog = false;
          this.removeEventListener("description-dialog-close", handler);
          resolve(description);
        } else if ((e as CustomEvent).detail?.action === "cancel") {
          this.showDescriptionDialog = false;
          this.removeEventListener("description-dialog-close", handler);
          resolve(null);
        }
      };

      this.addEventListener("description-dialog-close", handler);
    });
  }

  /**
   * Handle PR creation button click
   */
  private handleCreatePR = async () => {
    // Validate component
    if (!this.validateComponentForPR()) {
      return;
    }

    // Prompt for description
    const description = await this.promptForDescription();
    if (!description || description.trim() === "") {
      return;
    }

    this.isCreatingPR = true;
    this.showPRSuccess = false;
    this.showPRError = false;

    try {
      // Dynamically import to reduce initial bundle size
      const { createComponentSchemaPR } =
        await import("../../services/prWorkflow");

      const result = await createComponentSchemaPR({
        pluginData: this.buildComponentData(),
        description,
        pat: this.githubPAT,
      });

      this.prUrl = result.prUrl;
      this.showPRSuccess = true;
      cout(`FRONTEND: PR created successfully: ${result.prUrl}`);
    } catch (error: unknown) {
      cout(
        `FRONTEND: PR creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      const { getErrorMessage } = await import("../../services/errors");
      this.prError = getErrorMessage(error);
      this.showPRError = true;
    } finally {
      this.isCreatingPR = false;
    }
  };

  /**
   * Close PR success message
   */
  private closePRSuccess = () => {
    this.showPRSuccess = false;
    this.prUrl = "";
  };

  /**
   * Close PR error message
   */
  private closePRError = () => {
    this.showPRError = false;
    this.prError = "";
  };

  /**
   * Confirm description dialog
   */
  private confirmDescription = () => {
    this.dispatchEvent(
      new CustomEvent("description-dialog-close", {
        detail: { action: "confirm" },
      }),
    );
  };

  /**
   * Cancel description dialog
   */
  private cancelDescription = () => {
    this.dispatchEvent(
      new CustomEvent("description-dialog-close", {
        detail: { action: "cancel" },
      }),
    );
  };

  render() {
    return html`
      <sp-tabs selected="1" size="m">
        <sp-tab label="Component Options" value="1"></sp-tab>
        <sp-tab label="System Options" value="2"></sp-tab>
        <sp-tab label="Preview" value="3"></sp-tab>
        <sp-tab label="JSON Editor" value="4"></sp-tab>
        <sp-tab-panel value="1">
          <div style=${styleMap({ width: "100%" })}>
            <div style="margin-bottom: 16px;">
              <schema-importer></schema-importer>
            </div>
            <sp-divider size="m"></sp-divider>
            <sp-field-group>
              <sp-field-label for="component-name"
                >Component Name</sp-field-label
              >
              <sp-textfield
                id="component-name"
                size="m"
                .value=${this.componentName}
                @input=${this.handleNameChange}
                placeholder="Enter component name"
              ></sp-textfield>

              <sp-field-label for="component-category">Category</sp-field-label>
              <sp-picker
                id="component-category"
                size="m"
                .value=${this.componentCategory}
                @change=${this.handleCategoryChange}
              >
                <sp-menu-item value="actions">Actions</sp-menu-item>
                <sp-menu-item value="containers">Containers</sp-menu-item>
                <sp-menu-item value="data visualization"
                  >Data Visualization</sp-menu-item
                >
                <sp-menu-item value="feedback">Feedback</sp-menu-item>
                <sp-menu-item value="inputs">Inputs</sp-menu-item>
                <sp-menu-item value="navigation">Navigation</sp-menu-item>
                <sp-menu-item value="status">Status</sp-menu-item>
                <sp-menu-item value="typography">Typography</sp-menu-item>
              </sp-picker>

              <sp-field-label for="component-url"
                >Documentation URL</sp-field-label
              >
              <sp-textfield
                id="component-url"
                size="m"
                .value=${this.componentDocumentationURL}
                @input=${this.handleUrlInput}
                @blur=${this.handleUrlBlur}
                placeholder="https://spectrum.adobe.com/page/..."
                .invalid=${this.urlValidationError !== ""}
              ></sp-textfield>
              ${this.urlValidationError
                ? html`<div
                    style="color: var(--spectrum-global-color-red-600); font-size: 12px; margin-top: 4px;"
                  >
                    ${this.urlValidationError}
                  </div>`
                : nothing}
            </sp-field-group>
            <sp-divider size="s" style="margin: 16px 0;"></sp-divider>
            <sp-table density="compact" quiet>
              <sp-icons-medium></sp-icons-medium>
              <sp-table-head>
                <sp-table-head-cell>Option</sp-table-head-cell>
                <sp-table-head-cell>Value</sp-table-head-cell>
                <sp-table-head-cell>Default</sp-table-head-cell>
                <sp-table-head-cell>Required</sp-table-head-cell>
                <sp-table-head-cell>Description</sp-table-head-cell>
                <sp-table-head-cell>Actions</sp-table-head-cell>
              </sp-table-head>
              <sp-table-body>
                ${this._componentOptions.map(this.renderOptionRow.bind(this))}
              </sp-table-body>
            </sp-table>
            <sp-action-button
              toggles
              @change=${(e: { target: ActionButton }) =>
                (this.openForm = e.target.selected)}
            >
              <sp-icon slot="icon"
                >${AddCircleIcon({ width: 16, height: 16 })}</sp-icon
              >
              Add Option
            </sp-action-button>
            <option-form
              .opened=${this.openForm}
              .optionIndex=${this.editingIndex}
              .editingOption=${this.editingOption}
              .systemOptions=${this.systemOptions}
              @saveOption=${(e: SaveOptionEvent) => {
                if (this.editingIndex >= 0) {
                  // Update existing option
                  this.componentOptions = this.updateItem(
                    this._componentOptions,
                    this.editingIndex,
                    e.detail,
                  );
                  this.cancelEdit();
                } else {
                  // Add new option
                  this.componentOptions = this.addItem(e.detail);
                }
              }}
              @cancelEdit=${() => this.cancelEdit()}
            ></option-form>
          </div>
        </sp-tab-panel>
        <sp-tab-panel value="2">
          <system-options-panel
            .systemOptions=${this.systemOptions}
            @system-options-update=${this._onSystemOptionsUpdate}
          ></system-options-panel>
        </sp-tab-panel>
        <sp-tab-panel value="3">
          <options-preview
            .componentOptions=${this._componentOptions}
          ></options-preview>
        </sp-tab-panel>
        <sp-tab-panel value="4">
          <div
            style="display: flex; flex-direction: column; gap: 16px; padding: 16px; width: 100%; box-sizing: border-box;"
          >
            <!-- Feedback message -->
            ${this.showFeedback
              ? html`<div
                  class="feedback-message"
                  role="status"
                  aria-live="polite"
                >
                  ✓ ${this.feedbackMessage}
                </div>`
              : nothing}

            <!-- Action buttons -->
            <sp-action-group class="json-editor-actions" compact>
              <sp-action-button
                @click=${this.copyJSON}
                aria-label="Copy component options JSON to clipboard"
              >
                <sp-icon slot="icon"
                  >${CopyIcon({ width: 18, height: 18 })}</sp-icon
                >
                Copy JSON
              </sp-action-button>
              <sp-action-button
                @click=${this.downloadJSON}
                aria-label="Download component options JSON as file"
              >
                <sp-icon slot="icon"
                  >${DownloadIcon({ width: 18, height: 18 })}</sp-icon
                >
                Download
              </sp-action-button>
            </sp-action-group>

            <!-- Validation status -->
            ${this.validationStatus === "validating"
              ? html`<div
                  class="validating-indicator"
                  role="status"
                  aria-live="polite"
                >
                  <sp-progress-circle
                    size="s"
                    indeterminate
                  ></sp-progress-circle>
                  Validating...
                </div>`
              : this.validationErrors.length > 0
                ? html`<validation-errors
                    .errors=${this.validationErrors}
                    role="alert"
                  ></validation-errors>`
                : html`<div
                    class="valid-indicator"
                    role="status"
                    aria-live="polite"
                  >
                    ✓ Valid JSON
                  </div>`}

            <!-- Code display -->
            <div id="json-editor-container"></div>
          </div>
        </sp-tab-panel>
        <sp-tab label="GitHub PR" value="5"></sp-tab>
        <sp-tab-panel value="5">
          <div style=${styleMap({ padding: "16px" })}>
            <h3 class="spectrum-Heading spectrum-Heading--sizeS">
              Create Pull Request
            </h3>
            <sp-divider class="spectrum-Divider--overwrite"></sp-divider>

            <!-- GitHub Authentication -->
            ${githubAuthTemplate(
              this.isGitHubAuthenticated,
              this.handleGitHubAuth,
              this.handleGitHubRevoke,
            )}

            <!-- PR Success Message -->
            ${this.showPRSuccess
              ? html`
                  <div
                    style="background: var(--spectrum-global-color-green-100); border-left: 4px solid var(--spectrum-global-color-green-600); padding: 12px; border-radius: 4px; margin-bottom: 16px;"
                  >
                    <div style="font-weight: bold; margin-bottom: 8px;">
                      Pull Request Created Successfully!
                    </div>
                    <a
                      href="${this.prUrl}"
                      target="_blank"
                      style="color: var(--spectrum-global-color-blue-600);"
                    >
                      View PR: ${this.prUrl}
                    </a>
                    <sp-button
                      quiet
                      size="s"
                      @click=${this.closePRSuccess}
                      style="float: right;"
                    >
                      Dismiss
                    </sp-button>
                  </div>
                `
              : nothing}

            <!-- PR Error Message -->
            ${this.showPRError
              ? html`
                  <div
                    style="background: var(--spectrum-global-color-red-100); border-left: 4px solid var(--spectrum-global-color-red-600); padding: 12px; border-radius: 4px; margin-bottom: 16px;"
                  >
                    <div style="font-weight: bold; margin-bottom: 8px;">
                      Error Creating Pull Request
                    </div>
                    <div style="margin-bottom: 8px;">${this.prError}</div>
                    <sp-button quiet size="s" @click=${this.closePRError}>
                      Dismiss
                    </sp-button>
                  </div>
                `
              : nothing}

            <!-- Create PR Button -->
            ${this.isGitHubAuthenticated
              ? html`
                  <sp-button
                    variant="accent"
                    @click=${this.handleCreatePR}
                    ?disabled=${this.isCreatingPR}
                    style="width: 100%;"
                  >
                    ${this.isCreatingPR
                      ? html`
                          <sp-progress-circle
                            indeterminate
                            size="s"
                          ></sp-progress-circle>
                          Creating PR...
                        `
                      : "Create Pull Request"}
                  </sp-button>

                  <sp-help-text style="margin-top: 8px;">
                    Creates a PR against
                    adobe/spectrum-design-data/packages/component-schemas with
                    your schema changes and an auto-generated changeset.
                  </sp-help-text>
                `
              : html`
                  <sp-help-text>
                    Connect your GitHub account above to create pull requests
                    directly from this plugin.
                  </sp-help-text>
                `}
          </div>
        </sp-tab-panel>
      </sp-tabs>

      <!-- Description Dialog -->
      ${this.showDescriptionDialog
        ? html`
            <div
              style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
            >
              <div
                style="background: white; padding: 24px; border-radius: 8px; max-width: 500px; width: 90%;"
              >
                <h3 class="spectrum-Heading spectrum-Heading--sizeS">
                  Component Description
                </h3>
                <sp-divider style="margin: 16px 0;"></sp-divider>
                <sp-field-label for="pr-description">
                  Enter a description for this component (required for JSON
                  Schema)
                </sp-field-label>
                <sp-textfield
                  id="pr-description"
                  multiline
                  rows="4"
                  placeholder="Describe what this component does and when to use it..."
                  value=${this.prDescription}
                  @input=${(e: Event) => {
                    this.prDescription = (e.target as HTMLInputElement).value;
                  }}
                ></sp-textfield>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                  <sp-button
                    variant="secondary"
                    @click=${this.cancelDescription}
                  >
                    Cancel
                  </sp-button>
                  <sp-button
                    variant="accent"
                    @click=${this.confirmDescription}
                    ?disabled=${!this.prDescription ||
                    this.prDescription.trim() === ""}
                  >
                    Continue
                  </sp-button>
                </div>
              </div>
            </div>
          `
        : nothing}

      <div
        class="resize-handle"
        @mousedown=${this._onResizeHandleMouseDown}
      ></div>
    `;
  }

  /**
   * cancel listener
   */
  cancel() {
    cout("CLICK CANCEL!");
    this.sendMessage("cancel");
  }

  /**
   * helper to send message to plugin
   *
   * @param type
   * @param content
   * @private
   */
  private sendMessage(type: string, content: object = {}) {
    const message = { pluginMessage: { type: type, ...content } };
    parent.postMessage(message, "*");
  }

  connectedCallback() {
    super.connectedCallback();
    // When adding listeners imperatively with addEventListener, you'll need to bind the event listener yourself if you need a reference to the component instance.
    window.addEventListener("message", this._onmessage);
    this.addEventListener(
      "schema-imported",
      this._onSchemaImported as EventListener,
    );
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mouseup", this._onMouseUp);
    // Load stored GitHub PAT
    this.loadStoredPAT();
    // this tells the plugin to send data to the UI, otherwise the plugin sends the data _before_ the UI is initialized
    this.sendMessage("init-complete", {});
  }

  private _onTabChange = (event: Event) => {
    const target = event.target as HTMLElement & { selected: string };

    // If JSON Editor tab (value="4") is selected, initialize CodeMirror
    if (target.selected === "4" && !this.codeMirrorInitialized) {
      // Wait for next frame to ensure tab content is rendered and visible
      requestAnimationFrame(() => {
        this.initializeCodeMirror();
      });
    }
  };

  firstUpdated() {
    // Inject CodeMirror CSS into shadow root
    const shadowRoot = this.shadowRoot || this;
    if (shadowRoot && !shadowRoot.querySelector("#codemirror-styles")) {
      // Find the CodeMirror stylesheet in document head

      // Create a style element with CodeMirror CSS (webpack injects it, so we'll copy from document)
      const styleEl = document.createElement("style");
      styleEl.id = "codemirror-styles";
      styleEl.textContent = Array.from(document.querySelectorAll("style"))
        .map((s) => s.textContent || "")
        .filter((text) => text.includes(".CodeMirror"))
        .join("\n");

      if (styleEl.textContent) {
        shadowRoot.appendChild(styleEl);
      }
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    // Attach tab change listener when tabs become available
    if (this.tabs && !this.tabs.hasAttribute("data-listener-attached")) {
      this.tabs.addEventListener("change", this._onTabChange);
      this.tabs.setAttribute("data-listener-attached", "true");
    }
  }

  private initializeCodeMirror() {
    if (!this.jsonEditorContainer || this.codeMirrorInitialized) {
      return;
    }

    this.codeMirrorEditor = CodeMirror(this.jsonEditorContainer, {
      mode: { name: "javascript", json: true },
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2,
      viewportMargin: Infinity,
      matchBrackets: true,
      autoCloseBrackets: true,
      value: this.componentJSON,
    } as CodeMirror.EditorConfiguration);

    // Listen for changes
    this.codeMirrorEditor.on("change", this._onCodeMirrorChange);
    this.codeMirrorInitialized = true;

    // Inject custom syntax highlighting CSS directly into shadow root
    const shadowRoot = this.shadowRoot || this;
    const customStyleId = "codemirror-custom-syntax";
    if (!shadowRoot.querySelector(`#${customStyleId}`)) {
      const customStyle = document.createElement("style");
      customStyle.id = customStyleId;
      customStyle.textContent = `
                /* Enhanced JSON syntax highlighting (VS Code inspired) */
                .cm-string { color: #a31515 !important; }
                .cm-property { color: #001080 !important; font-weight: 500 !important; }
                .cm-number { color: #098658 !important; }
                .cm-atom { color: #0000ff !important; font-weight: 500 !important; }
                .cm-keyword { color: #af00db !important; }
                .CodeMirror-matchingbracket {
                    background-color: rgba(0, 100, 200, 0.1) !important;
                    outline: 1px solid rgba(0, 100, 200, 0.4) !important;
                }
                /* Error highlighting */
                .cm-error-highlight {
                    background-color: rgba(255, 0, 0, 0.15) !important;
                    border-bottom: 2px wavy #d32f2f !important;
                }
            `;
      shadowRoot.appendChild(customStyle);
    }

    // Force refresh after initialization to ensure proper sizing
    setTimeout(() => {
      if (this.codeMirrorEditor) {
        this.codeMirrorEditor.refresh();
      }
    }, 100);
  }

  disconnectedCallback() {
    // all custom event-listeners need to be removed
    window.removeEventListener("message", this._onmessage);
    this.removeEventListener(
      "schema-imported",
      this._onSchemaImported as EventListener,
    );
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mouseup", this._onMouseUp);
    if (this.tabs) {
      this.tabs.removeEventListener("change", this._onTabChange);
    }
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }
    // Clean up CodeMirror instance
    if (this.codeMirrorEditor) {
      // Remove event listener to prevent memory leaks
      this.codeMirrorEditor.off("change", this._onCodeMirrorChange);
      // Remove the CodeMirror wrapper element
      const wrapper = this.codeMirrorEditor.getWrapperElement();
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      this.codeMirrorEditor = undefined;
    }
    super.disconnectedCallback();
  }

  /**
   * use an arrow function as a class field, to bind the event listener yourself if you need a reference to the component
   * @param event
   */
  private _onmessage = (event: MessageEvent) => {
    cout(
      `FRONTEND: _onmessage: ${JSON.stringify(event.data.pluginMessage, null, 2)}`,
    );
    if (Object.hasOwn(event.data.pluginMessage, "componentOptionsData")) {
      const data = event.data.pluginMessage.componentOptionsData;
      // Always update all fields, even if empty (for page switching)
      this._componentOptions = data.options || [];
      this.componentName = data.title || "";
      this.componentCategory = data.meta?.category || "";
      this.componentDocumentationURL = data.meta?.documentationUrl || "";
      const jsonString = JSON.stringify(data, null, 2);
      this.componentJSON = jsonString;
      this.updateCodeMirrorEditor(jsonString);
      this.validateJSON(); // Auto-validate on data load
      // Close any open edit form when switching pages
      this.cancelEdit();
      this.openForm = false;
    }
    // Handle system options data
    if (Object.hasOwn(event.data.pluginMessage, "systemOptionsData")) {
      if (
        event.data.pluginMessage.systemOptionsData.systemOptions &&
        event.data.pluginMessage.systemOptionsData.systemOptions.length > 0
      ) {
        this.systemOptions =
          event.data.pluginMessage.systemOptionsData.systemOptions;
      }
    }
    // Handle GitHub PAT response
    if (event.data.pluginMessage?.type === "github-pat-response") {
      this.githubPAT = event.data.pluginMessage.pat || "";
      this.isGitHubAuthenticated = !!this.githubPAT;
      cout("FRONTEND: Received GitHub PAT from backend");
    }
  };

  private _onSchemaImported = (event: CustomEvent) => {
    const imported: ComponentInterface = event.detail;
    cout(`FRONTEND: Schema imported: ${imported.title}`);
    // Update UI state
    this.componentName = imported.title;
    this.componentCategory = imported.meta.category;
    this.componentDocumentationURL = imported.meta.documentationUrl;
    this._componentOptions = imported.options;
    const jsonString = JSON.stringify(imported, null, 2);
    this.componentJSON = jsonString;
    this.updateCodeMirrorEditor(jsonString);
    this.validateJSON(); // Auto-validate imported schema
    // Trigger metadata update to persist to Figma
    setTimeout(() => this.updateMetadata(), 0);
  };

  private _onSystemOptionsUpdate = (event: SystemOptionsUpdateEvent) => {
    this.systemOptions = event.detail;
    this.sendMessage("update-system-options", { systemOptions: event.detail });
  };

  private _onResizeHandleMouseDown = (event: MouseEvent) => {
    this.isResizing = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = window.innerWidth;
    this.startHeight = window.innerHeight;
    event.preventDefault();
  };

  private _onMouseMove = (event: MouseEvent) => {
    if (!this.isResizing) return;

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;

    const newWidth = Math.max(400, this.startWidth + deltaX);
    const newHeight = Math.max(300, this.startHeight + deltaY);

    parent.postMessage(
      {
        pluginMessage: {
          type: "resize-window",
          width: newWidth,
          height: newHeight,
        },
      },
      "*",
    );
  };

  private _onMouseUp = () => {
    this.isResizing = false;
  };

  /**
   * Clear error highlighting in CodeMirror editor
   *
   * Removes the red background and wavy underline from previously
   * highlighted error regions. Called when validation succeeds or
   * when user starts editing.
   */
  private clearErrorHighlight() {
    if (this.errorMarker) {
      this.errorMarker.clear();
      this.errorMarker = undefined;
    }
  }

  /**
   * Highlight error region in CodeMirror editor and scroll to it
   *
   * Marks the error location with a red background and wavy underline,
   * scrolls the error into view, and places the cursor at the error position.
   * Uses CodeMirror's markText API to create a text marker.
   *
   * @param line - 1-based line number where the error occurred
   * @param column - 1-based column number where the error occurred
   *
   * @example
   * highlightError(5, 12) // Highlights error at line 5, column 12
   */
  private highlightError(line: number, column: number) {
    if (!this.codeMirrorEditor || !this.codeMirrorInitialized) {
      return;
    }

    // Clear previous error highlighting
    this.clearErrorHighlight();

    // CodeMirror uses 0-based line numbers
    const cmLine = line - 1;
    const cmColumn = column - 1;

    // Highlight the error position (highlight the rest of the line from the error)
    const from = { line: cmLine, ch: cmColumn };
    const to = {
      line: cmLine,
      ch: this.codeMirrorEditor.getLine(cmLine)?.length || cmColumn + 1,
    };

    this.errorMarker = this.codeMirrorEditor.markText(from, to, {
      className: "cm-error-highlight",
      title: "Parse error location",
    });

    // Scroll to the error location
    this.codeMirrorEditor.scrollIntoView({ line: cmLine, ch: cmColumn }, 100);

    // Also set cursor at error location
    this.codeMirrorEditor.setCursor({ line: cmLine, ch: cmColumn });
  }

  /**
   * Validate the current component JSON
   */
  private async validateJSON() {
    try {
      const data = JSON.parse(this.componentJSON);
      const result = await validateComponentJSON(data);

      this.validationErrors = result.errors;
      this.validationStatus = result.errors.length > 0 ? "invalid" : "valid";

      // Clear error highlighting on successful parse
      this.clearErrorHighlight();
    } catch (error) {
      let message = error instanceof Error ? error.message : "Unknown error";
      let path = "root";
      let line = 0;
      let column = 0;

      // Try to extract position from error message
      if (error instanceof Error) {
        const posMatch = error.message.match(/position (\d+)/);
        if (posMatch && this.componentJSON) {
          const position = parseInt(posMatch[1], 10);
          const location = extractLineColumn(this.componentJSON, position);
          line = location.line;
          column = location.column;
          path = `Line ${line}:${column}`;
          message = `JSON parse error at line ${line}, column ${column}: ${message}`;

          // Highlight the error in CodeMirror
          this.highlightError(line, column);
        }
      }

      this.validationErrors = [
        {
          path,
          message,
          keyword: "parse",
        },
      ];
      this.validationStatus = "invalid";
    }
  }

  /**
   * Handle CodeMirror editor changes (debounced validation)
   */
  private _onCodeMirrorChange = (
    cm: CodeMirror.Editor,
    change: CodeMirror.EditorChange,
  ) => {
    // Skip if this is a programmatic change (from us, not user)
    if (change.origin && change.origin === "setValue") {
      return;
    }

    const value = cm.getValue();
    this.componentJSON = value;

    // Clear error highlighting when user starts editing
    this.clearErrorHighlight();

    // Set validating status immediately
    this.validationStatus = "validating";

    // Clear any existing timeout
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }

    // Debounce validation to avoid excessive processing during typing
    // Waits 500ms after user stops typing before triggering validation
    this.validationTimeout = window.setTimeout(() => {
      this.validateJSON();
      this.validationTimeout = null;
    }, 500);
  };

  /**
   * Update CodeMirror editor programmatically (only for external updates)
   */
  private updateCodeMirrorEditor(code: string) {
    if (!this.codeMirrorInitialized || !this.codeMirrorEditor) {
      // Editor not initialized yet, just update componentJSON
      // It will be set when editor initializes
      return;
    }

    if (this.codeMirrorEditor.getValue() !== code) {
      // Temporarily remove change listener to avoid triggering validation
      this.codeMirrorEditor.off("change", this._onCodeMirrorChange);
      this.codeMirrorEditor.setValue(code);
      // Re-add change listener
      this.codeMirrorEditor.on("change", this._onCodeMirrorChange);
    }
  }

  /**
   * Copy component options JSON to clipboard
   *
   * Uses the Clipboard API when available, with a fallback to document.execCommand
   * for older browsers. Shows a success/failure feedback message to the user.
   *
   * @returns Promise that resolves when copy operation completes
   */
  private async copyJSON() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.componentJSON);
        this.showFeedbackMessage("JSON copied to clipboard");
      } else {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = this.componentJSON;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          this.showFeedbackMessage("JSON copied to clipboard");
        } catch (err) {
          this.showFeedbackMessage("Failed to copy JSON");
          console.error("Fallback copy failed:", err);
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      this.showFeedbackMessage("Failed to copy JSON");
      console.error("Copy failed:", error);
    }
  }

  /**
   * Download component options JSON as a file
   *
   * Creates a Blob from the JSON string and triggers a download using a temporary
   * anchor element. The filename is based on the component name.
   * Shows a success/failure feedback message to the user.
   *
   * @example
   * // Downloads as "Button-options.json" if component name is "Button"
   * // Downloads as "component-options.json" if no component name is set
   */
  private downloadJSON() {
    try {
      const blob = new Blob([this.componentJSON], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${this.componentName || "component"}-options.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showFeedbackMessage("JSON downloaded successfully");
    } catch (error) {
      this.showFeedbackMessage("Failed to download JSON");
      console.error("Download failed:", error);
    }
  }

  /**
   * Show feedback message temporarily
   */
  private showFeedbackMessage(message: string) {
    this.feedbackMessage = message;
    this.showFeedback = true;
    setTimeout(() => {
      this.showFeedback = false;
    }, 3000);
  }
}
