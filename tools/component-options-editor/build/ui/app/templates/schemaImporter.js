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
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/dialog/sp-dialog.js";
import "@spectrum-web-components/dialog/sp-dialog-wrapper.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/table/sp-table.js";
import "@spectrum-web-components/table/sp-table-head.js";
import "@spectrum-web-components/table/sp-table-head-cell.js";
import "@spectrum-web-components/table/sp-table-body.js";
import "@spectrum-web-components/table/sp-table-row.js";
import "@spectrum-web-components/table/sp-table-cell.js";
import { convertSchemaToPluginFormat } from "../../schemaConverter";
import bundledSchemas from "../../bundledSchemas.json";
let SchemaImporter = class SchemaImporter extends LitElement {
  constructor() {
    super(...arguments);
    this.searchTerm = "";
    this.showDialog = false;
  }
  get availableSchemas() {
    return bundledSchemas.map((s) => ({
      slug: s.slug,
      title: s.title,
      category: s.meta && s.meta.category ? s.meta.category : "actions",
    }));
  }
  openDialog() {
    this.showDialog = true;
  }
  closeDialog() {
    this.showDialog = false;
    this.searchTerm = "";
  }
  importSchema(schema) {
    // Find the full schema data
    const fullSchema = bundledSchemas.find((s) => s.slug === schema.slug);
    if (!fullSchema) {
      alert(`Schema not found: ${schema.slug}`);
      return;
    }
    // Convert to plugin format in the UI
    const converted = convertSchemaToPluginFormat(fullSchema);
    // Dispatch event to parent component
    this.dispatchEvent(
      new CustomEvent("schema-imported", {
        detail: converted,
        bubbles: true,
        composed: true,
      }),
    );
    this.closeDialog();
  }
  handleSearchInput(event) {
    const input = event.target;
    this.searchTerm = input.value.toLowerCase();
  }
  get filteredSchemas() {
    let schemas = this.availableSchemas;
    if (this.searchTerm) {
      schemas = schemas.filter(
        (s) =>
          s.title.toLowerCase().includes(this.searchTerm) ||
          s.category.toLowerCase().includes(this.searchTerm) ||
          s.slug.toLowerCase().includes(this.searchTerm),
      );
    }
    // Sort alphabetically by title
    return schemas.sort((a, b) => a.title.localeCompare(b.title));
  }
  render() {
    return html`
      <sp-button variant="secondary" @click=${this.openDialog}>
        Import from Spectrum Schemas
      </sp-button>
      <sp-dialog-wrapper
        headline="Import Spectrum Schema"
        dismissable
        underlay
        ?open=${this.showDialog}
        @close=${this.closeDialog}
      >
        <div class="search-box">
          <sp-field-label for="schema-search">Search schemas:</sp-field-label>
          <sp-textfield
            id="schema-search"
            placeholder="Type to filter by name, category, or slug..."
            @input=${this.handleSearchInput}
            style="width: 100%;"
          ></sp-textfield>
        </div>
        <sp-table size="m">
          <sp-table-head>
            <sp-table-head-cell>Component</sp-table-head-cell>
            <sp-table-head-cell>Category</sp-table-head-cell>
            <sp-table-head-cell>Slug</sp-table-head-cell>
          </sp-table-head>
          <sp-table-body>
            ${this.filteredSchemas.length === 0
              ? html`<sp-table-row>
                  <sp-table-cell colspan="3">No schemas found</sp-table-cell>
                </sp-table-row>`
              : this.filteredSchemas.map(
                  (schema) => html`
                    <sp-table-row @click=${() => this.importSchema(schema)}>
                      <sp-table-cell>${schema.title}</sp-table-cell>
                      <sp-table-cell>${schema.category}</sp-table-cell>
                      <sp-table-cell>${schema.slug}</sp-table-cell>
                    </sp-table-row>
                  `,
                )}
          </sp-table-body>
        </sp-table>
        <sp-button slot="button" variant="secondary" @click=${this.closeDialog}>
          Cancel
        </sp-button>
      </sp-dialog-wrapper>
    `;
  }
};
SchemaImporter.styles = css`
  :host {
    display: block;
  }
  .search-box {
    margin-bottom: 16px;
  }
  sp-table-row {
    cursor: pointer;
  }
  sp-table-row:hover {
    background-color: var(--spectrum-gray-100);
  }
`;
__decorate(
  [property({ type: String })],
  SchemaImporter.prototype,
  "searchTerm",
  void 0,
);
__decorate(
  [property({ type: Boolean })],
  SchemaImporter.prototype,
  "showDialog",
  void 0,
);
SchemaImporter = __decorate([customElement("schema-importer")], SchemaImporter);
export { SchemaImporter };
//# sourceMappingURL=schemaImporter.js.map
