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
 * @fileoverview Generate changeset files following .changeset conventions
 */

import type { ChangesetOptions } from "../types/github";

/**
 * Generate changeset content following .changeset/ conventions
 *
 * @param options - Changeset options
 * @returns Changeset file content
 *
 * @example
 * const content = generateChangesetContent({
 *   componentTitle: 'Button',
 *   isNewComponent: true,
 *   description: 'Initial button schema'
 * });
 */
export function generateChangesetContent(options: ChangesetOptions): string {
  const { componentTitle, isNewComponent, description } = options;
  const type = isNewComponent ? "minor" : "patch";
  const action = isNewComponent ? "Add" : "Update";

  const changeDescription = description
    ? `: ${description}`
    : isNewComponent
      ? ""
      : "";

  return `---
"@adobe/spectrum-component-api-schemas": ${type}
---

${action} ${componentTitle} component schema${changeDescription}.
`;
}

/**
 * Generate unique changeset filename
 * Format: {random-string}-{timestamp}.md
 *
 * @returns Changeset filename
 *
 * @example
 * generateChangesetFilename() // 'a7b8c9d-1706123456789.md'
 */
export function generateChangesetFilename(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${random}-${timestamp}.md`;
}
