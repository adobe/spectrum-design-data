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
 * @fileoverview PR workflow orchestrator for component schema changes
 */

import { GitHubService } from "./githubService";
import {
  generateChangesetContent,
  generateChangesetFilename,
} from "./changesetGenerator";
import {
  convertPluginToSchema,
  toKebabCase,
} from "@adobe/component-schema-converter";
import type { PRWorkflowOptions, PRResult } from "../types/github";

/**
 * Create a pull request with component schema changes
 *
 * This function orchestrates the entire workflow:
 * 1. Validate GitHub token
 * 2. Convert plugin format to official schema
 * 3. Check if schema already exists (new vs update)
 * 4. Create unique branch
 * 5. Commit schema file
 * 6. Generate and commit changeset
 * 7. Create PR with descriptive body
 *
 * @param options - PR workflow options
 * @returns PR URL, number, and branch name
 * @throws GitHubAPIError if any step fails
 *
 * @example
 * const result = await createComponentSchemaPR({
 *   pluginData: componentData,
 *   description: 'Buttons allow users to perform an action',
 *   pat: 'ghp_xxxxxxxxxxxx'
 * });
 * console.log(`PR created: ${result.prUrl}`);
 */
export async function createComponentSchemaPR(
  options: PRWorkflowOptions,
): Promise<PRResult> {
  const { pluginData, description, pat } = options;

  // 1. Initialize GitHub service
  const github = new GitHubService(pat);

  // 2. Validate token
  await github.validateToken();

  // 3. Convert schema using the converter library
  const officialSchema = convertPluginToSchema(pluginData, { description });

  // 4. Check if schema exists
  const kebabName = toKebabCase(pluginData.title);
  const schemaPath = `packages/component-schemas/schemas/components/${kebabName}.json`;
  const exists = await github.checkSchemaExists(pluginData.title);

  // 5. Create branch
  const branchName = `component-schema/${kebabName}-${Date.now()}`;
  const baseSHA = await github.getBaseBranchSHA();
  await github.createBranch(branchName, baseSHA);

  // 6. Commit schema file
  const schemaContent = JSON.stringify(officialSchema, null, 2) + "\n";
  const schemaCommitMessage = exists
    ? `fix(component-schemas): update ${pluginData.title} component schema`
    : `feat(component-schemas): add ${pluginData.title} component schema`;

  await github.createOrUpdateFile(
    schemaPath,
    schemaContent,
    schemaCommitMessage,
    branchName,
  );

  // 7. Generate and commit changeset
  const changesetContent = generateChangesetContent({
    componentTitle: pluginData.title,
    isNewComponent: !exists,
    description,
  });
  const changesetFilename = generateChangesetFilename();
  const changesetPath = `.changeset/${changesetFilename}`;

  await github.createOrUpdateFile(
    changesetPath,
    changesetContent,
    "chore(changeset): add changeset for component schema",
    branchName,
  );

  // 8. Create PR
  const prTitle = exists
    ? `fix(component-schemas): update ${pluginData.title} component schema`
    : `feat(component-schemas): add ${pluginData.title} component schema`;

  const prBody = `## Summary

${exists ? "Updates" : "Adds"} the component schema for **${pluginData.title}**.

${description}

## Changes

- ${exists ? "Updated" : "Added"} \`${schemaPath}\`
- Added changeset for version bump

## Component Details

- **Category:** ${pluginData.meta.category}
- **Documentation:** ${pluginData.meta.documentationUrl}
- **Options:** ${pluginData.options.length} ${pluginData.options.length === 1 ? "property" : "properties"}

---

_Created via Component Options Editor Figma plugin_
`;

  const pr = await github.createPullRequest(prTitle, prBody, branchName);

  return {
    prUrl: pr.url,
    prNumber: pr.number,
    branchName,
  };
}
