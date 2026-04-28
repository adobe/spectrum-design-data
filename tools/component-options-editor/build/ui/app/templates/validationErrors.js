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
import "@spectrum-web-components/icon";
import { AlertIcon } from "@spectrum-web-components/icons-workflow";
let ValidationErrors = class ValidationErrors extends LitElement {
  constructor() {
    super(...arguments);
    this.errors = [];
  }
  render() {
    if (!this.errors || this.errors.length === 0) {
      return html``;
    }
    return html`
      <div class="errors-container" role="alert" aria-live="assertive">
        <div class="errors-header">
          ⚠️ ${this.errors.length} Validation
          Error${this.errors.length > 1 ? "s" : ""}:
        </div>
        <ul class="error-list">
          ${this.errors.map(
            (error) => html`
              <li class="error-item">
                <sp-icon size="s"
                  >${AlertIcon({ width: 16, height: 16 })}</sp-icon
                >
                <div class="error-content">
                  <span class="error-path">${error.path}</span>:
                  <span class="error-message">${error.message}</span>
                </div>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }
};
ValidationErrors.styles = css`
  .errors-container {
    background-color: var(--spectrum-global-color-red-100);
    border-left: 4px solid var(--spectrum-global-color-red-600);
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .errors-header {
    font-weight: 600;
    color: var(--spectrum-global-color-red-700);
    margin-bottom: 8px;
    font-size: 14px;
  }

  .error-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    font-size: 13px;
    color: var(--spectrum-global-color-gray-800);
  }

  .error-item sp-icon {
    flex-shrink: 0;
    color: var(--spectrum-global-color-red-600);
  }

  .error-content {
    flex: 1;
  }

  .error-path {
    font-weight: 600;
    color: var(--spectrum-global-color-red-700);
  }

  .error-message {
    color: var(--spectrum-global-color-gray-800);
  }

  .error-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
`;
__decorate(
  [property({ type: Array })],
  ValidationErrors.prototype,
  "errors",
  void 0,
);
ValidationErrors = __decorate(
  [customElement("validation-errors")],
  ValidationErrors,
);
export default ValidationErrors;
//# sourceMappingURL=validationErrors.js.map
