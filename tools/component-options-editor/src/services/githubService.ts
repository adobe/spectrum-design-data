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
 * @fileoverview GitHub API service for creating PRs from Figma plugin
 */

import { Octokit } from "@octokit/rest";
import { toKebabCase } from "@adobe/component-schema-converter";
import type { GitHubConfig, GitHubTokenInfo } from "../types/github";
import { GitHubAPIError } from "./errors";

export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(personalAccessToken: string) {
    this.octokit = new Octokit({ auth: personalAccessToken });
    this.config = {
      owner: "adobe",
      repo: "spectrum-design-data",
      baseBranch: "main",
    };
  }

  /**
   * Validate token and check if it has required permissions
   *
   * @returns True if token is valid and has repo scope
   */
  async validateToken(): Promise<boolean> {
    try {
      const { data } = await this.octokit.users.getAuthenticated();

      // Check if we can access the repo
      await this.octokit.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });

      return true;
    } catch (error: any) {
      throw new GitHubAPIError(
        "Failed to validate GitHub token",
        error.status,
        error.response,
      );
    }
  }

  /**
   * Get information about the authenticated token
   *
   * @returns Token info including user and scopes
   */
  async getTokenInfo(): Promise<GitHubTokenInfo> {
    try {
      const { data, headers } = await this.octokit.users.getAuthenticated();
      const scopes = headers["x-oauth-scopes"]?.split(", ") || [];

      return {
        user: data.login,
        scopes,
      };
    } catch (error: any) {
      throw new GitHubAPIError(
        "Failed to get token info",
        error.status,
        error.response,
      );
    }
  }

  /**
   * Check if a component schema file already exists
   *
   * @param componentName - Component name (will be converted to kebab-case)
   * @returns True if file exists
   */
  async checkSchemaExists(componentName: string): Promise<boolean> {
    try {
      const kebabName = toKebabCase(componentName);
      const path = `packages/component-schemas/schemas/components/${kebabName}.json`;

      await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.baseBranch,
      });

      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw new GitHubAPIError(
        "Failed to check if schema exists",
        error.status,
        error.response,
      );
    }
  }

  /**
   * Get the SHA of the base branch
   *
   * @returns Branch SHA
   */
  async getBaseBranchSHA(): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner: this.config.owner,
        repo: this.config.repo,
        branch: this.config.baseBranch,
      });

      return data.commit.sha;
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to get ${this.config.baseBranch} branch`,
        error.status,
        error.response,
      );
    }
  }

  /**
   * Create a new branch
   *
   * @param branchName - Name for the new branch
   * @param baseSHA - SHA of the commit to branch from
   */
  async createBranch(branchName: string, baseSHA: string): Promise<void> {
    try {
      await this.octokit.git.createRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSHA,
      });
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to create branch ${branchName}`,
        error.status,
        error.response,
      );
    }
  }

  /**
   * Create or update a file in a branch
   *
   * @param path - File path in repository
   * @param content - File content
   * @param message - Commit message
   * @param branch - Branch name
   */
  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    branch: string,
  ): Promise<void> {
    try {
      // Check if file exists to get SHA for update
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.config.owner,
          repo: this.config.repo,
          path,
          ref: branch,
        });

        if ("sha" in data) {
          sha = data.sha;
        }
      } catch (error: any) {
        // File doesn't exist, will create new
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create or update file
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        message,
        content: Buffer.from(content, "utf-8").toString("base64"),
        branch,
        sha,
      });
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to commit file ${path}`,
        error.status,
        error.response,
      );
    }
  }

  /**
   * Create a pull request
   *
   * @param title - PR title
   * @param body - PR body/description
   * @param head - Head branch name
   * @returns PR URL and number
   */
  async createPullRequest(
    title: string,
    body: string,
    head: string,
  ): Promise<{ url: string; number: number }> {
    try {
      const { data } = await this.octokit.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
        head,
        base: this.config.baseBranch,
      });

      return {
        url: data.html_url,
        number: data.number,
      };
    } catch (error: any) {
      throw new GitHubAPIError(
        "Failed to create pull request",
        error.status,
        error.response,
      );
    }
  }
}
