/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import Handlebars from "handlebars";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { capitalize } from "../core/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HandlebarsFormatter {
  constructor(options = {}) {
    this.templateDir =
      options.templateDir || path.join(__dirname, "../templates");
    this.template = options.template || "markdown";
    this.dataType = options.dataType || "data";
    this.compiledTemplate = null;
    this._log = null;
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers for common formatting tasks
   */
  registerHelpers() {
    // Helper to repeat a string
    Handlebars.registerHelper("repeat", (str, count) => {
      return new Handlebars.SafeString(str.repeat(count));
    });

    // Helper to check if object has keys
    Handlebars.registerHelper("hasKeys", (obj) => {
      return obj && Object.keys(obj).length > 0;
    });

    // Helper to get object keys
    Handlebars.registerHelper("objectKeys", (obj) => {
      return obj ? Object.keys(obj) : [];
    });

    // Helper to get object values
    Handlebars.registerHelper("objectValues", (obj) => {
      return obj ? Object.values(obj) : [];
    });

    // Helper to get object entries
    Handlebars.registerHelper("objectEntries", (obj) => {
      return obj
        ? Object.entries(obj).map(([key, value]) => ({ key, value }))
        : [];
    });

    // Helper for conditional logic
    Handlebars.registerHelper("ifEquals", (arg1, arg2, options) => {
      // Check if used as a subexpression (no options.fn available)
      if (!options || typeof options.fn !== "function") {
        return arg1 == arg2;
      }
      // Used as block helper
      return arg1 == arg2
        ? options.fn(this)
        : options.inverse
          ? options.inverse(this)
          : "";
    });

    // Helper to clean up schema URLs
    Handlebars.registerHelper("cleanSchemaUrl", (url) => {
      if (!url) return "";
      return url.replace(
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/",
        "",
      );
    });

    // Helper to clean up property paths
    Handlebars.registerHelper("cleanPath", (path) => {
      if (!path) return "";
      return path.replace("sets.", "").replace("$", "");
    });

    // Helper to get the last part of a path
    Handlebars.registerHelper("lastPathPart", (path) => {
      if (!path) return "";
      return path.split("/").pop();
    });

    // Helper to format date
    Handlebars.registerHelper("formatDate", (date) => {
      return new Date(date).toLocaleString();
    });

    // Helper to capitalize strings
    Handlebars.registerHelper("capitalize", (str) => {
      return capitalize(str);
    });

    // Helper to get data type
    Handlebars.registerHelper("dataType", () => {
      return this.dataType;
    });

    // Helper to calculate total items in diff result
    Handlebars.registerHelper("totalItems", (result) => {
      if (!result) return 0;
      return (
        Object.keys(result.renamed || {}).length +
        Object.keys(result.deprecated || {}).length +
        Object.keys(result.reverted || {}).length +
        Object.keys(result.added || {}).length +
        Object.keys(result.deleted || {}).length +
        Object.keys(result.updated?.added || {}).length +
        Object.keys(result.updated?.deleted || {}).length +
        Object.keys(result.updated?.renamed || {}).length +
        Object.keys(result.updated?.updated || {}).length
      );
    });

    // Helper to calculate total updated items
    Handlebars.registerHelper("totalUpdatedItems", (updated) => {
      if (!updated) return 0;
      return (
        Object.keys(updated.added || {}).length +
        Object.keys(updated.deleted || {}).length +
        Object.keys(updated.renamed || {}).length +
        Object.keys(updated.updated || {}).length
      );
    });

    // Terminal color helpers using chalk
    Handlebars.registerHelper("hilite", (str) => {
      return new Handlebars.SafeString(chalk.cyan(str));
    });

    Handlebars.registerHelper("error", (str) => {
      return new Handlebars.SafeString(chalk.red(str));
    });

    Handlebars.registerHelper("passing", (str) => {
      return new Handlebars.SafeString(chalk.green(str));
    });

    Handlebars.registerHelper("neutral", (str) => {
      return new Handlebars.SafeString(chalk.yellow(str));
    });

    Handlebars.registerHelper("bold", (str) => {
      return new Handlebars.SafeString(chalk.bold(str));
    });

    Handlebars.registerHelper("dim", (str) => {
      return new Handlebars.SafeString(chalk.dim(str));
    });

    Handlebars.registerHelper("emphasis", (str) => {
      return new Handlebars.SafeString(chalk.italic(str));
    });

    // Helper for proper indentation (3 spaces per level)
    Handlebars.registerHelper("indent", (level) => {
      return new Handlebars.SafeString(" ".repeat((level || 0) * 3));
    });

    // Helper to concatenate strings
    Handlebars.registerHelper("concat", (...args) => {
      // Remove the options object from args
      args.pop();
      return args.join("");
    });

    // Helper to wrap text in quotes
    Handlebars.registerHelper("quote", (str) => {
      return `"${str}"`;
    });

    // Helper to check if a number is greater than another
    Handlebars.registerHelper("gt", (a, b) => {
      return a > b;
    });

    // Helper to add numbers
    Handlebars.registerHelper("add", (a, b) => {
      return a + b;
    });
  }

  /**
   * Process diff result into template-friendly format
   * @param {object} result - Raw diff result
   * @returns {object} Processed data for templates
   */
  processResultForTemplate(result) {
    // Convert objects to arrays for easier iteration in templates
    const processedResult = {
      ...result,
      timestamp: new Date(),
      renamed: Object.entries(result.renamed || {}).map(([name, data]) => ({
        name,
        oldName: data["old-name"],
        ...data,
      })),
      deprecated: Object.entries(result.deprecated || {}).map(
        ([name, data]) => ({
          name,
          comment: data.deprecated_comment,
          ...data,
        }),
      ),
      reverted: Object.entries(result.reverted || {}).map(([name, data]) => ({
        name,
        ...data,
      })),
      added: Object.entries(result.added || {}).map(([name, data]) => ({
        name,
        ...data,
      })),
      deleted: Object.entries(result.deleted || {}).map(([name, data]) => ({
        name,
        ...data,
      })),
      updated: {
        added: Object.entries(result.updated?.added || {}).map(
          ([name, data]) => ({
            name,
            changes: data.changes || [],
            ...data,
          }),
        ),
        deleted: Object.entries(result.updated?.deleted || {}).map(
          ([name, data]) => ({
            name,
            changes: data.changes || [],
            ...data,
          }),
        ),
        renamed: Object.entries(result.updated?.renamed || {}).map(
          ([name, data]) => ({
            name,
            changes: data.changes || [],
            ...data,
          }),
        ),
        updated: Object.entries(result.updated?.updated || {}).map(
          ([name, data]) => ({
            name,
            changes: data.changes || [],
            ...data,
          }),
        ),
      },
    };

    return processedResult;
  }

  /**
   * Load and compile template
   * @returns {Promise<Function>} Compiled template function
   */
  async loadTemplate() {
    if (this.compiledTemplate) {
      return this.compiledTemplate;
    }

    try {
      // Look for data-type specific template first, then fall back to base template
      const specificTemplatePath = path.join(
        this.templateDir,
        this.dataType,
        `${this.template}.hbs`,
      );
      const baseTemplatePath = path.join(
        this.templateDir,
        "base",
        `${this.template}.hbs`,
      );

      let templatePath;
      if (fs.existsSync(specificTemplatePath)) {
        templatePath = specificTemplatePath;
      } else if (fs.existsSync(baseTemplatePath)) {
        templatePath = baseTemplatePath;
      } else {
        throw new Error(
          `Template "${this.template}" not found in ${this.templateDir}/${this.dataType}/ or ${this.templateDir}/base/`,
        );
      }

      const templateContent = fs.readFileSync(templatePath, "utf8");
      this.compiledTemplate = Handlebars.compile(templateContent);
      return this.compiledTemplate;
    } catch (error) {
      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * Format diff result using handlebars template
   * @param {object} result - Raw diff result
   * @param {object} options - Formatting options
   * @returns {Promise<string>} Formatted output
   */
  async format(result, options = {}) {
    try {
      const template = await this.loadTemplate();
      const processedResult = this.processResultForTemplate(result);

      const templateData = {
        result,
        options,
        ...processedResult,
      };

      return template(templateData);
    } catch (error) {
      throw new Error(`Template formatting failed: ${error.message}`);
    }
  }
}
