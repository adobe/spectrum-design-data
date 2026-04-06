/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { NameObject, SemanticField } from "./name-object.js";
import {
  buildNameObject,
  DIMENSION_FIELDS,
  SEMANTIC_FIELDS,
} from "./name-object.js";
import {
  serialize,
  FORMAT_STYLES,
  FORMAT_LABELS,
  type FormatStyle,
} from "./serializer.js";
import { validate, type ValidationMessage } from "./validator.js";
import {
  registries,
  dimensionModes,
  commonProperties,
  getActiveIds,
  type Registry,
} from "./registry-data.js";
import {
  loadComponentOptions,
  type ComponentOptions,
} from "./component-awareness.js";

interface FieldConfig {
  key: string;
  label: string;
  group: "identity" | "modifier" | "dimension";
  required?: boolean;
  type: "combobox" | "select";
  /** Full list of registry options. */
  options: string[];
  /** Component-specific subset (shown first in optgroup when present). */
  filteredOptions?: string[];
  placeholder?: string;
}

// All name fields used for URL hash persistence
const ALL_FIELDS: string[] = [...SEMANTIC_FIELDS, ...DIMENSION_FIELDS];

@customElement("token-name-builder")
export class TokenNameBuilder extends LitElement {
  @state() private fields: Record<string, string> = { property: "" };
  @state() private messages: ValidationMessage[] = [];
  @state() private copyFeedback = "";
  @state() private componentOptions: ComponentOptions | null = null;

  static override styles = css`
    :host {
      display: block;
      max-width: 720px;
      margin: 0 auto;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 24px;
    }

    /* Live preview */
    .preview {
      background: var(--spectrum-background-layer-2-color, #fff);
      border: 1px solid var(--spectrum-gray-300, #d0d0d0);
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      position: sticky;
      top: 12px;
      z-index: 10;
    }

    @media (prefers-color-scheme: dark) {
      .preview {
        background: var(--spectrum-background-layer-2-color, #252525);
        border-color: var(--spectrum-gray-600, #555);
      }
    }

    .preview-name {
      font-family: "Source Code Pro", "SFMono-Regular", Consolas, monospace;
      font-size: 1.125rem;
      font-weight: 600;
      word-break: break-all;
      min-height: 1.5em;
      color: var(--spectrum-accent-color-900, #0054b6);
    }

    @media (prefers-color-scheme: dark) {
      .preview-name {
        color: var(--spectrum-accent-color-400, #5ab2ff);
      }
    }

    .preview-empty {
      opacity: 0.4;
      font-style: italic;
    }

    .preview-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      align-items: center;
    }

    /* Fieldset sections */
    fieldset {
      border: none;
      padding: 0;
      margin: 0 0 24px;
    }

    legend {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--spectrum-gray-600, #6e6e6e);
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--spectrum-gray-200, #e6e6e6);
      width: 100%;
    }

    @media (prefers-color-scheme: dark) {
      legend {
        color: var(--spectrum-gray-400, #999);
        border-color: var(--spectrum-gray-700, #444);
      }
    }

    /* Field grid */
    .fields {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 8px 12px;
      align-items: center;
    }

    .field-label {
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: right;
      color: var(--spectrum-body-color, #333);
    }

    .field-label.required::after {
      content: " *";
      color: var(--spectrum-negative-color-900, #c9252d);
    }

    @media (prefers-color-scheme: dark) {
      .field-label {
        color: var(--spectrum-body-color, #e0e0e0);
      }
    }

    select,
    input[type="text"] {
      font-family: inherit;
      font-size: 0.875rem;
      padding: 6px 10px;
      border: 1px solid var(--spectrum-gray-400, #b3b3b3);
      border-radius: 4px;
      background: var(--spectrum-background-layer-2-color, #fff);
      color: var(--spectrum-body-color, #222);
      width: 100%;
      box-sizing: border-box;
    }

    @media (prefers-color-scheme: dark) {
      select,
      input[type="text"] {
        background: var(--spectrum-background-layer-2-color, #2a2a2a);
        border-color: var(--spectrum-gray-500, #666);
        color: var(--spectrum-body-color, #e0e0e0);
      }
    }

    select:focus,
    input[type="text"]:focus {
      outline: 2px solid var(--spectrum-accent-color-700, #0070d1);
      outline-offset: -1px;
      border-color: transparent;
    }

    .field-disabled select,
    .field-disabled input {
      opacity: 0.4;
      pointer-events: none;
    }

    /* Platform preview */
    .platform-preview {
      background: var(--spectrum-background-layer-2-color, #fff);
      border: 1px solid var(--spectrum-gray-200, #e6e6e6);
      border-radius: 8px;
      padding: 12px 16px;
    }

    @media (prefers-color-scheme: dark) {
      .platform-preview {
        background: var(--spectrum-background-layer-2-color, #252525);
        border-color: var(--spectrum-gray-700, #444);
      }
    }

    .platform-row {
      display: flex;
      gap: 12px;
      padding: 4px 0;
      font-size: 0.8125rem;
      align-items: baseline;
    }

    .platform-label {
      min-width: 160px;
      color: var(--spectrum-gray-600, #6e6e6e);
      flex-shrink: 0;
    }

    @media (prefers-color-scheme: dark) {
      .platform-label {
        color: var(--spectrum-gray-400, #999);
      }
    }

    .platform-value {
      font-family: "Source Code Pro", "SFMono-Regular", Consolas, monospace;
      word-break: break-all;
    }

    /* Validation */
    .validation-msg {
      display: flex;
      gap: 8px;
      padding: 4px 0;
      font-size: 0.8125rem;
      align-items: baseline;
    }

    .validation-msg.error {
      color: var(--spectrum-negative-color-900, #c9252d);
    }

    .validation-msg.warning {
      color: var(--spectrum-notice-color-900, #996100);
    }

    @media (prefers-color-scheme: dark) {
      .validation-msg.error {
        color: var(--spectrum-negative-color-400, #ff6b6b);
      }
      .validation-msg.warning {
        color: var(--spectrum-notice-color-400, #f5c400);
      }
    }

    .validation-msg.valid {
      color: var(--spectrum-positive-color-900, #107c10);
    }

    @media (prefers-color-scheme: dark) {
      .validation-msg.valid {
        color: var(--spectrum-positive-color-400, #4fce4f);
      }
    }

    /* JSON output */
    .json-output {
      background: var(--spectrum-background-layer-2-color, #fff);
      border: 1px solid var(--spectrum-gray-200, #e6e6e6);
      border-radius: 8px;
      padding: 12px 16px;
    }

    @media (prefers-color-scheme: dark) {
      .json-output {
        background: var(--spectrum-background-layer-2-color, #252525);
        border-color: var(--spectrum-gray-700, #444);
      }
    }

    .json-output pre {
      margin: 0;
      font-family: "Source Code Pro", "SFMono-Regular", Consolas, monospace;
      font-size: 0.8125rem;
      white-space: pre-wrap;
    }

    /* Buttons */
    button {
      font-family: inherit;
      font-size: 0.75rem;
      padding: 4px 12px;
      border: 1px solid var(--spectrum-gray-400, #b3b3b3);
      border-radius: 4px;
      background: var(--spectrum-background-layer-2-color, #fff);
      color: var(--spectrum-body-color, #333);
      cursor: pointer;
    }

    @media (prefers-color-scheme: dark) {
      button {
        background: var(--spectrum-background-layer-2-color, #333);
        border-color: var(--spectrum-gray-500, #666);
        color: var(--spectrum-body-color, #e0e0e0);
      }
    }

    button:hover {
      background: var(--spectrum-gray-200, #e6e6e6);
    }

    @media (prefers-color-scheme: dark) {
      button:hover {
        background: var(--spectrum-gray-600, #555);
      }
    }

    button:focus-visible {
      outline: 2px solid var(--spectrum-accent-color-700, #0070d1);
      outline-offset: 2px;
    }

    .copy-feedback {
      font-size: 0.75rem;
      color: var(--spectrum-positive-color-900, #107c10);
    }

    @media (prefers-color-scheme: dark) {
      .copy-feedback {
        color: var(--spectrum-positive-color-400, #4fce4f);
      }
    }

    /* Share link */
    .share-link {
      font-size: 0.75rem;
      color: var(--spectrum-gray-600, #6e6e6e);
      margin-left: auto;
    }

    @media (prefers-color-scheme: dark) {
      .share-link {
        color: var(--spectrum-gray-400, #999);
      }
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadFromHash();
  }

  /** Restore field state from the URL hash on load. */
  private loadFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const params = new URLSearchParams(hash);
      const loaded: Record<string, string> = { property: "" };
      for (const field of ALL_FIELDS) {
        const val = params.get(field);
        if (val) loaded[field] = val;
      }
      this.fields = loaded;
      this.messages = validate(this.nameObject);
      // Trigger component options load if component is set
      if (loaded.component) {
        void this.updateComponentOptions(loaded.component);
      }
    } catch {
      // Ignore malformed hash
    }
  }

  /** Persist current field state to the URL hash (no page reload). */
  private persistToHash() {
    const params = new URLSearchParams();
    for (const field of ALL_FIELDS) {
      const val = this.fields[field];
      if (val && val.trim().length > 0) {
        params.set(field, val.trim());
      }
    }
    const hash = params.toString();
    window.history.replaceState(
      null,
      "",
      hash ? `#${hash}` : window.location.pathname,
    );
  }

  private get nameObject(): NameObject {
    return buildNameObject({
      property: this.fields.property || "",
      ...this.fields,
    } as NameObject & { property: string });
  }

  private get serialized(): string {
    return serialize(this.nameObject);
  }

  private async updateComponentOptions(componentId: string) {
    this.componentOptions = await loadComponentOptions(componentId);
  }

  private getFieldConfigs(): FieldConfig[] {
    const opts = this.componentOptions;

    return [
      // Identity
      {
        key: "property",
        label: "Property",
        group: "identity",
        required: true,
        type: "combobox",
        options: commonProperties,
        placeholder: "e.g. color, width, padding",
      },
      {
        key: "component",
        label: "Component",
        group: "identity",
        type: "combobox",
        options: this.registryIds("component"),
        placeholder: "e.g. button, checkbox",
      },
      {
        key: "structure",
        label: "Structure",
        group: "identity",
        type: "select",
        options: this.registryIds("structure"),
      },
      {
        key: "substructure",
        label: "Sub-structure",
        group: "identity",
        type: "select",
        options: this.registryIds("substructure"),
      },
      {
        key: "anatomy",
        label: "Anatomy",
        group: "identity",
        type: "combobox",
        options: this.registryIds("anatomy"),
        filteredOptions: opts?.anatomy,
        placeholder: "e.g. icon, label, handle",
      },
      {
        key: "object",
        label: "Object",
        group: "identity",
        type: "select",
        options: this.registryIds("object"),
      },
      // Modifiers
      {
        key: "variant",
        label: "Variant",
        group: "modifier",
        type: "select",
        options: this.registryIds("variant"),
        filteredOptions: opts?.variants,
      },
      {
        key: "state",
        label: "State",
        group: "modifier",
        type: "select",
        options: this.registryIds("state"),
        filteredOptions: opts?.states,
      },
      {
        key: "size",
        label: "Size",
        group: "modifier",
        type: "select",
        options: this.registryIds("size"),
        filteredOptions: opts?.sizes,
      },
      {
        key: "orientation",
        label: "Orientation",
        group: "modifier",
        type: "select",
        options: this.registryIds("orientation"),
      },
      {
        key: "position",
        label: "Position",
        group: "modifier",
        type: "select",
        options: this.registryIds("position"),
      },
      {
        key: "density",
        label: "Density",
        group: "modifier",
        type: "select",
        options: this.registryIds("density"),
      },
      {
        key: "shape",
        label: "Shape",
        group: "modifier",
        type: "select",
        options: this.registryIds("shape"),
      },
      // Dimensions
      ...DIMENSION_FIELDS.map((key) => ({
        key,
        label: key,
        group: "dimension" as const,
        type: "select" as const,
        options: dimensionModes[key]?.modes ?? [],
        placeholder: `default: ${dimensionModes[key]?.defaultMode ?? ""}`,
      })),
    ];
  }

  private registryIds(field: SemanticField): string[] {
    const reg = registries[field] as Registry | undefined;
    return reg ? getActiveIds(reg) : [];
  }

  private async handleFieldChange(key: string, value: string) {
    this.fields = { ...this.fields, [key]: value };
    this.messages = validate(this.nameObject);
    this.persistToHash();

    if (key === "component") {
      await this.updateComponentOptions(value);
    }
  }

  private async copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copyFeedback = `Copied ${label}!`;
      setTimeout(() => {
        this.copyFeedback = "";
      }, 2000);
    } catch {
      this.copyFeedback = "Copy failed";
      setTimeout(() => {
        this.copyFeedback = "";
      }, 2000);
    }
  }

  private renderField(config: FieldConfig) {
    const value = this.fields[config.key] ?? "";
    const disabled = config.key === "substructure" && !this.fields.structure;
    const labelId = `label-${config.key}`;

    return html`
      <label
        id=${labelId}
        class="field-label ${config.required ? "required" : ""}"
        for="field-${config.key}"
        >${config.label}</label
      >
      <div class="${disabled ? "field-disabled" : ""}">
        ${config.type === "combobox"
          ? this.renderCombobox(config, value, disabled, labelId)
          : this.renderSelect(config, value, disabled, labelId)}
      </div>
    `;
  }

  private renderCombobox(
    config: FieldConfig,
    value: string,
    disabled: boolean,
    labelId: string,
  ) {
    // For combobox: show filteredOptions first in datalist, then remaining
    const filtered = config.filteredOptions ?? [];
    const rest = config.options.filter((o) => !filtered.includes(o));
    const ordered = [...filtered, ...rest];

    return html`
      <input
        id="field-${config.key}"
        type="text"
        list="list-${config.key}"
        .value=${value}
        placeholder=${config.placeholder ?? ""}
        ?disabled=${disabled}
        aria-labelledby=${labelId}
        @input=${(e: Event) =>
          this.handleFieldChange(
            config.key,
            (e.target as HTMLInputElement).value,
          )}
      />
      <datalist id="list-${config.key}">
        ${ordered.map((opt) => html`<option value=${opt}></option>`)}
      </datalist>
    `;
  }

  private renderSelect(
    config: FieldConfig,
    value: string,
    disabled: boolean,
    labelId: string,
  ) {
    const filtered = config.filteredOptions ?? [];
    const component = this.fields.component;
    const hasFiltered = filtered.length > 0 && !!component;

    // Options not in the filtered set
    const rest = hasFiltered
      ? config.options.filter((o) => !filtered.includes(o))
      : config.options;

    return html`
      <select
        id="field-${config.key}"
        ?disabled=${disabled}
        aria-labelledby=${labelId}
        @change=${(e: Event) =>
          this.handleFieldChange(
            config.key,
            (e.target as HTMLSelectElement).value,
          )}
      >
        <option value="">${config.placeholder ?? "-- none --"}</option>
        ${hasFiltered
          ? html`
              <optgroup label="For ${component}">
                ${filtered.map(
                  (opt) => html`
                    <option value=${opt} ?selected=${value === opt}>
                      ${opt}
                    </option>
                  `,
                )}
              </optgroup>
              <optgroup label="Other">
                ${rest.map(
                  (opt) => html`
                    <option value=${opt} ?selected=${value === opt}>
                      ${opt}
                    </option>
                  `,
                )}
              </optgroup>
            `
          : rest.map(
              (opt) => html`
                <option value=${opt} ?selected=${value === opt}>${opt}</option>
              `,
            )}
      </select>
    `;
  }

  override render() {
    const configs = this.getFieldConfigs();
    const identity = configs.filter((c) => c.group === "identity");
    const modifiers = configs.filter((c) => c.group === "modifier");
    const dimensions = configs.filter((c) => c.group === "dimension");
    const nameObj = this.nameObject;
    const nameJson = JSON.stringify(nameObj, null, 2);
    const errors = this.messages.filter((m) => m.severity === "error");
    const warnings = this.messages.filter((m) => m.severity === "warning");
    const hasContent = this.serialized.length > 0;

    return html`
      <h1>Token Name Builder</h1>

      <!-- Live Preview -->
      <div class="preview" role="region" aria-label="Live token name preview">
        <div
          class="preview-name ${hasContent ? "" : "preview-empty"}"
          aria-live="polite"
          aria-label="Serialized token name"
        >
          ${hasContent ? this.serialized : "Start by entering a property…"}
        </div>
        ${hasContent
          ? html`
              <div class="preview-actions">
                <button
                  @click=${() => this.copyToClipboard(this.serialized, "name")}
                >
                  Copy Name
                </button>
                <button @click=${() => this.copyToClipboard(nameJson, "JSON")}>
                  Copy JSON
                </button>
                <button
                  @click=${() =>
                    this.copyToClipboard(window.location.href, "link")}
                  title="Copy shareable link"
                >
                  Share
                </button>
                ${this.copyFeedback
                  ? html`<span class="copy-feedback" role="status"
                      >${this.copyFeedback}</span
                    >`
                  : ""}
              </div>
            `
          : ""}
      </div>

      <!-- Identity -->
      <fieldset>
        <legend>Identity</legend>
        <div class="fields">${identity.map((c) => this.renderField(c))}</div>
      </fieldset>

      <!-- Modifiers -->
      <fieldset>
        <legend>Modifiers</legend>
        <div class="fields">${modifiers.map((c) => this.renderField(c))}</div>
      </fieldset>

      <!-- Dimensions -->
      <fieldset>
        <legend>Dimensions</legend>
        <div class="fields">${dimensions.map((c) => this.renderField(c))}</div>
      </fieldset>

      <!-- Platform Preview -->
      ${hasContent
        ? html`
            <fieldset>
              <legend>Platform Preview</legend>
              <div class="platform-preview" role="list">
                ${FORMAT_STYLES.map(
                  (fmt: FormatStyle) => html`
                    <div class="platform-row" role="listitem">
                      <span class="platform-label">${FORMAT_LABELS[fmt]}</span>
                      <span class="platform-value"
                        >${serialize(nameObj, fmt)}</span
                      >
                    </div>
                  `,
                )}
              </div>
            </fieldset>
          `
        : ""}

      <!-- Validation -->
      <fieldset>
        <legend>Validation</legend>
        <div aria-live="polite" aria-label="Validation messages">
          ${!hasContent
            ? html`<div class="validation-msg" style="opacity:0.5">
                Fill in a property to see validation.
              </div>`
            : errors.length === 0 && warnings.length === 0
              ? html`<div class="validation-msg valid">
                  &#x2714; All values are valid.
                </div>`
              : html`
                  ${errors.map(
                    (m) => html`
                      <div class="validation-msg error" role="alert">
                        &#x2718; <strong>${m.field}:</strong> ${m.message}
                      </div>
                    `,
                  )}
                  ${warnings.map(
                    (m) => html`
                      <div class="validation-msg warning">
                        &#x26A0; <strong>${m.field}:</strong> ${m.message}
                      </div>
                    `,
                  )}
                `}
        </div>
      </fieldset>

      <!-- JSON Output -->
      ${hasContent
        ? html`
            <fieldset>
              <legend>Name Object (JSON)</legend>
              <div class="json-output">
                <pre aria-label="Name object as JSON">${nameJson}</pre>
              </div>
            </fieldset>
          `
        : ""}
    `;
  }
}
