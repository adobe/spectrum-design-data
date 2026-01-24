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
 * @fileoverview Error handling for GitHub API operations
 */

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

/**
 * Get user-friendly error message from error object
 *
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (error instanceof GitHubAPIError) {
    if (error.statusCode === 401) {
      return "Invalid GitHub token. Please check your Personal Access Token and ensure it hasn't expired.";
    }
    if (error.statusCode === 403) {
      return 'Permission denied. Ensure your token has "repo" scope and you have write access to the repository.';
    }
    if (error.statusCode === 404) {
      return "Repository or resource not found. Ensure you have access to adobe/spectrum-design-data.";
    }
    if (error.statusCode === 422) {
      return "Unable to create PR. The branch or PR may already exist, or the request data is invalid.";
    }
    if (error.statusCode === 429) {
      return "GitHub API rate limit exceeded. Please wait a moment and try again.";
    }
  }

  if (error.message) {
    return error.message;
  }

  return "An unexpected error occurred while creating the pull request.";
}

/**
 * Check if error is due to network issues
 *
 * @param error - Error object
 * @returns True if network-related error
 */
export function isNetworkError(error: any): boolean {
  return (
    error.message?.includes("network") ||
    error.message?.includes("ENOTFOUND") ||
    error.message?.includes("ETIMEDOUT") ||
    error.code === "ENOTFOUND" ||
    error.code === "ETIMEDOUT"
  );
}

/**
 * Check if error is due to authentication
 *
 * @param error - Error object
 * @returns True if authentication error
 */
export function isAuthError(error: any): boolean {
  return (
    error instanceof GitHubAPIError &&
    (error.statusCode === 401 || error.statusCode === 403)
  );
}
