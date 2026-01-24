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

/**
 * @fileoverview GitHub authentication UI template
 */

import { html, nothing } from "lit";

/**
 * Render GitHub authentication panel
 *
 * @param isAuthenticated - Whether user is authenticated
 * @param onAuth - Callback when user authenticates
 * @param onRevoke - Callback when user revokes authentication
 * @returns Lit template
 */
export function githubAuthTemplate(
  isAuthenticated: boolean,
  onAuth: (token: string) => void,
  onRevoke: () => void,
) {
  if (isAuthenticated) {
    return html`
      <div
        class="github-auth authenticated"
        style="display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--spectrum-global-color-green-100); border-radius: 4px; margin-bottom: 16px;"
      >
        <span style="flex: 1; color: var(--spectrum-global-color-green-900);">
          ✓ Connected to GitHub
        </span>
        <sp-button quiet size="s" @click=${onRevoke}>Disconnect</sp-button>
      </div>
    `;
  }

  return html`
    <div class="github-auth" style="margin-bottom: 16px;">
      <sp-field-label for="github-pat-input">
        GitHub Personal Access Token
      </sp-field-label>
      <sp-textfield
        id="github-pat-input"
        type="password"
        placeholder="ghp_xxxxxxxxxxxx"
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target.value) {
            onAuth(target.value);
          }
        }}
      ></sp-textfield>
      <sp-help-text>
        <a
          href="https://github.com/settings/tokens/new?scopes=repo&description=Component%20Options%20Editor%20Plugin"
          target="_blank"
          style="color: var(--spectrum-global-color-blue-600);"
        >
          Create a token
        </a>
        with 'repo' scope to enable PR creation
      </sp-help-text>
    </div>
  `;
}
