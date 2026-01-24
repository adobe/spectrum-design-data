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
 * @fileoverview TypeScript types for GitHub API integration
 */

export interface PRResult {
  prUrl: string;
  prNumber: number;
  branchName: string;
}

export interface GitHubTokenInfo {
  scopes: string[];
  user: string;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  baseBranch: string;
}

export interface ChangesetOptions {
  componentTitle: string;
  isNewComponent: boolean;
  description?: string;
}

export interface PRWorkflowOptions {
  pluginData: ComponentInterface;
  description: string;
  pat: string;
}

export interface FileCommitInfo {
  path: string;
  content: string;
  message: string;
}
