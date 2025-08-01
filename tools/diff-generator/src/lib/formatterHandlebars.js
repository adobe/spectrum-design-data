/*
Copyright 2025 Adobe. All rights reserved.
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HandlebarsFormatter {
  constructor(options = {}) {
    this.templateDir =
      options.templateDir || path.join(__dirname, "../templates");
    this.template = options.template || "markdown";
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
      return Object.keys(obj).length > 0;
    });

    // Helper to get object keys
    Handlebars.registerHelper("objectKeys", (obj) => {
      return Object.keys(obj);
    });

    // Helper to get object values
    Handlebars.registerHelper("objectValues", (obj) => {
      return Object.values(obj);
    });

    // Helper to get object entries
    Handlebars.registerHelper("objectEntries", (obj) => {
      return Object.entries(obj).map(([key, value]) => ({ key, value }));
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
      return url.replace(
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/",
        "",
      );
    });

    // Helper to clean up property paths
    Handlebars.registerHelper("cleanPath", (path) => {
      return path.replace("sets.", "").replace("$", "");
    });

    // Helper to get the last part of a path
    Handlebars.registerHelper("lastPathPart", (path) => {
      return path.split("/").pop();
    });

    // Helper to format date
    Handlebars.registerHelper("formatDate", (date) => {
      return new Date(date).toLocaleString();
    });

    // Helper to calculate total tokens
    Handlebars.registerHelper("totalTokens", (result) => {
      return (
        Object.keys(result.renamed).length +
        Object.keys(result.deprecated).length +
        Object.keys(result.reverted).length +
        Object.keys(result.added).length +
        Object.keys(result.deleted).length +
        Object.keys(result.updated.added).length +
        Object.keys(result.updated.deleted).length +
        Object.keys(result.updated.updated).length +
        Object.keys(result.updated.renamed).length
      );
    });

    // Helper to calculate total updated tokens
    Handlebars.registerHelper("totalUpdatedTokens", (updated) => {
      return (
        Object.keys(updated.added).length +
        Object.keys(updated.deleted).length +
        Object.keys(updated.updated).length +
        Object.keys(updated.renamed).length
      );
    });

    // Color helpers for CLI output using chalk
    Handlebars.registerHelper("hilite", (text) => {
      return new Handlebars.SafeString(chalk.yellow(text));
    });

    Handlebars.registerHelper("error", (text) => {
      return new Handlebars.SafeString(chalk.red(text));
    });

    Handlebars.registerHelper("passing", (text) => {
      return new Handlebars.SafeString(chalk.green(text));
    });

    Handlebars.registerHelper("neutral", (text) => {
      return new Handlebars.SafeString(chalk.white(text));
    });

    // Additional chalk-powered formatting helpers
    Handlebars.registerHelper("bold", (text) => {
      return new Handlebars.SafeString(chalk.bold(text));
    });

    Handlebars.registerHelper("dim", (text) => {
      return new Handlebars.SafeString(chalk.dim(text));
    });

    Handlebars.registerHelper("emphasis", (text) => {
      return new Handlebars.SafeString(chalk.bold.yellow(text));
    });

    // Helper for proper indentation (3 spaces per level)
    Handlebars.registerHelper("indent", (level) => {
      return new Handlebars.SafeString("   ".repeat(level));
    });

    // Helper to concatenate strings
    Handlebars.registerHelper("concat", (...args) => {
      // Remove the options object from the end
      args.pop();
      return args.join("");
    });

    // Helper to wrap text in quotes
    Handlebars.registerHelper("quote", (text) => {
      return `"${text}"`;
    });

    // Helper for arrow formatting
    Handlebars.registerHelper("arrow", (from, to) => {
      return `${from} -> ${to}`;
    });
  }

  /**
   * Load and compile a Handlebars template
   * @param {string} templateName - Name of the template file (without .hbs extension)
   * @returns {Function} Compiled Handlebars template
   */
  loadTemplate(templateName) {
    const templatePath = path.join(this.templateDir, `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(
        `Template file not found: "${templatePath}". Available templates should be in ${this.templateDir} with .hbs extension.`,
      );
    }

    try {
      const templateSource = fs.readFileSync(templatePath, "utf8");
      return Handlebars.compile(templateSource);
    } catch (error) {
      if (error.code === "EACCES") {
        throw new Error(
          `Permission denied reading template file "${templatePath}". Check file permissions.`,
        );
      } else if (error.message.includes("Parse error")) {
        throw new Error(
          `Invalid Handlebars syntax in template "${templateName}": ${error.message}`,
        );
      } else {
        throw new Error(
          `Failed to load template "${templateName}" from "${templatePath}": ${error.message}`,
        );
      }
    }
  }

  /**
   * Get the compiled template, loading it if necessary
   * @returns {Function} Compiled Handlebars template
   */
  getTemplate() {
    if (!this.compiledTemplate) {
      this.compiledTemplate = this.loadTemplate(this.template);
    }
    return this.compiledTemplate;
  }

  /**
   * Set a custom template string
   * @param {string} templateString - The Handlebars template string
   */
  setTemplateString(templateString) {
    this.compiledTemplate = Handlebars.compile(templateString);
  }

  /**
   * Process token changes recursively for nested properties
   * @param {object} tokenData - Token data with nested changes
   * @returns {Array} Array of change objects
   */
  processNestedChanges(tokenData) {
    const changes = [];

    const processChange = (data, parentPath = "") => {
      if (data.path !== undefined) {
        // This is a leaf change
        const change = {
          path: data.path,
          newValue: data["new-value"],
          originalValue: data["original-value"],
          type:
            data["original-value"] === undefined
              ? "added"
              : data.path.includes("$schema")
                ? "schema"
                : "updated",
        };
        changes.push(change);
      } else {
        // This is a nested object, recurse through its properties
        Object.keys(data).forEach((key) => {
          if (typeof data[key] === "object") {
            processChange(data[key], parentPath ? `${parentPath}.${key}` : key);
          }
        });
      }
    };

    processChange(tokenData);
    return changes;
  }

  /**
   * Transform the result data into a template-friendly format
   * @param {object} result - The token diff result
   * @param {object} options - CLI options
   * @returns {object} Template data
   */
  prepareTemplateData(result, options) {
    const templateData = {
      timestamp: new Date(),
      result,
      options,

      // Process each section with enhanced data
      renamed: Object.entries(result.renamed).map(([token, data]) => ({
        name: token,
        oldName: data["old-name"],
        ...data,
      })),

      deprecated: Object.entries(result.deprecated).map(([token, data]) => ({
        name: token,
        comment: data.deprecated_comment,
        ...data,
      })),

      reverted: Object.entries(result.reverted).map(([token, data]) => ({
        name: token,
        ...data,
      })),

      added: Object.entries(result.added).map(([token, data]) => ({
        name: token,
        ...data,
      })),

      deleted: Object.entries(result.deleted).map(([token, data]) => ({
        name: token,
        ...data,
      })),

      updated: {
        added: Object.entries(result.updated.added).map(([token, data]) => ({
          name: token,
          changes: this.processNestedChanges(data),
          ...data,
        })),

        deleted: Object.entries(result.updated.deleted).map(
          ([token, data]) => ({
            name: token,
            changes: this.processNestedChanges(data),
            ...data,
          }),
        ),

        updated: Object.entries(result.updated.updated).map(
          ([token, data]) => ({
            name: token,
            changes: this.processNestedChanges(data),
            ...data,
          }),
        ),

        renamed: Object.entries(result.updated.renamed).map(
          ([token, data]) => ({
            name: token,
            changes: this.processNestedChanges(data),
            ...data,
          }),
        ),
      },
    };

    return templateData;
  }

  /**
   * Override the log setter to handle template processing
   */
  set log(fnc) {
    this._log = (input) => {
      // Clean up common replacements like the markdown formatter
      input = input.replaceAll("$", "");
      input = input.replaceAll(
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/",
        "",
      );
      fnc(input);
    };
  }

  get log() {
    return this._log;
  }

  /**
   * Main method to format and print the report using Handlebars templates
   * @param {object} result - The token diff result
   * @param {Function} outputFunction - Function to output the result
   * @param {object} options - CLI options
   * @returns {boolean} Success status
   */
  printReport(result, outputFunction, options) {
    try {
      this.log = outputFunction;

      const templateData = this.prepareTemplateData(result, options);
      const template = this.getTemplate();
      const output = template(templateData);

      this.log(output);
      return true;
    } catch (error) {
      let contextualError = `Template processing failed: ${error.message}`;

      if (error.message.includes("Template file not found")) {
        contextualError = `Template loading error: ${error.message}`;
      } else if (
        error.message.includes("Handlebars syntax") ||
        error.message.includes("Parse error")
      ) {
        contextualError = `Template syntax error in "${this.template}": ${error.message}`;
      } else if (error.message.includes("Permission denied")) {
        contextualError = `File access error: ${error.message}`;
      } else if (
        error.name === "ReferenceError" ||
        error.message.includes("is not defined")
      ) {
        contextualError = `Template variable error in "${this.template}": ${error.message}. Check that all required data is available.`;
      }

      console.error(`HandlebarsFormatter error: ${contextualError}`);
      return false;
    }
  }
}

export { HandlebarsFormatter };

let formatter;

if (!formatter) formatter = new HandlebarsFormatter();

export default formatter;
